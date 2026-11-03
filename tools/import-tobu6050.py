"""Bundle the referenced TOBU6050 panel, audio, and numeric BVE configuration."""

import argparse
import csv
import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FINAL_ASSETS = ROOT / "dist/assets/final"
VEHICLE_ID = "6050"
PANEL_WIDTH = 3996
PANEL_MIN_Y = 774.25


def read_text(path):
    data = path.read_bytes()
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("cp932")


def read_config(path):
    sections = [("root", {})]
    for line in read_text(path).splitlines():
        line = line.split(";", 1)[0].strip()
        if line.startswith("[") and line.endswith("]"):
            sections.append((line[1:-1].strip().lower(), {}))
        elif line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            sections[-1][1][key.strip().lower()] = value.strip()
    return sections


def parse_number(value):
    try:
        number = float(value)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def read_table(path, source):
    labels, rows, settings = [], [], {}
    for row in csv.reader(read_text(path).splitlines()):
        if not row:
            continue
        name = row[0].strip()
        if name == "#":
            labels = [value.strip() for value in row[1:]]
            continue
        values = [parse_number(value.strip()) for value in row[1:]]
        speed = parse_number(name)
        if speed is not None:
            rows.append([speed, *values])
        elif name and not name.startswith("#") and any(v is not None for v in values):
            settings[name.lower()] = values
    result = {"source": path.relative_to(source).as_posix(), "labels": labels, "rows": rows}
    if settings:
        result["namedRows"] = settings
    return result


def three_power_notches(force, current, parameters):
    """Build a steady-state curve from the internal resistor/weak-field stages."""
    rows = []
    current_by_speed = {row[0]: row[1:] for row in current["rows"]}
    settings = parameters["namedRows"]
    up_notch = settings["requirednotch_up"]
    limits = settings["currentlimitingvalue_empty"]
    for speed, *effort in force["rows"]:
        amps = current_by_speed[speed]
        notch_forces = []
        for notch in (1, 2, 3):
            stage = 0
            while stage < len(effort) - 1:
                if up_notch[stage] > notch or amps[stage + 1] > limits[stage]:
                    break
                stage += 1
            notch_forces.append(effort[stage])
        rows.append([speed, *notch_forces])
    return {
        "source": force["source"],
        "labels": ["P1", "P2", "P3"],
        "rows": rows,
        "method": "Steady-state estimate using the source up-notch thresholds and empty-car current limits. Timing and detailed BVE plugins are not simulated.",
    }


class AssetBundle:
    def __init__(self, source):
        self.source = source
        self.target = FINAL_ASSETS / "vehicles" / VEHICLE_ID
        self.target.mkdir(parents=True, exist_ok=True)
        self.originals = ROOT / "local-vehicles" / VEHICLE_ID
        self.originals.mkdir(parents=True, exist_ok=True)
        self.files = {p.relative_to(source).as_posix().lower(): p for p in source.rglob("*") if p.is_file()}
        self.references = {}
        self.entries = {}

    def resolve(self, config, reference):
        key = (config.parent / reference.replace("\\", "/")).resolve().relative_to(self.source).as_posix().lower()
        if key not in self.files:
            raise FileNotFoundError(f"{config.name}: {reference}")
        return self.files[key]

    def add(self, path, keep_wav=False):
        if path in self.references:
            return self.references[path]
        suffix = path.suffix.lower()
        if suffix not in (".png", ".wav"):
            raise ValueError(f"Unsupported vehicle asset: {path.name}")
        index = len(self.references)
        ref = {"entryIndex": index, "entryName": path.relative_to(self.source).as_posix(), "size": path.stat().st_size}
        original = self.originals / f"{index}{suffix}"
        shutil.copyfile(path, original)
        if suffix == ".png":
            filename = f"{index}.webp"
            with Image.open(path) as image:
                width, height = image.size
                scale = 1600 / PANEL_WIDTH
                size = (max(1, round(width * scale)), max(1, round(height * scale)))
                image.convert("RGBA").resize(size, Image.Resampling.BILINEAR).save(self.target / filename, lossless=True)
            ref.update(width=width, height=height)
            self.entries[str(index)] = {"file": filename, "width": width, "height": height}
        else:
            filename = f"{index}.wav" if keep_wav else f"{index}.mp3"
            if keep_wav:
                shutil.copyfile(path, self.target / filename)
            else:
                subprocess.run([
                    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
                    "-codec:a", "libmp3lame", "-q:a", "2", str(self.target / filename),
                ], check=True)
            self.entries[str(index)] = {"file": filename}
        self.references[path] = ref
        return ref


def pair(value):
    return [float(item.strip()) for item in value.split(",")]


def build_panel(assets, path):
    sections = read_config(path)
    layout = dict(sections)["this"]
    layout = {key: pair(value) if key in ("origin", "center") else float(value) for key, value in layout.items()}
    elements = []
    for kind, data in sections:
        if kind not in ("pilotlamp", "needle"):
            continue
        subject = data["subject"].lower()
        if subject not in ("true", "door", "amabs", "kmph", "sap", "bc", "mr", "bp"):
            continue
        day = assets.resolve(path, data["daytimeimage"])
        location = pair(data["location"])
        if kind == "pilotlamp":
            with Image.open(day) as image:
                if location[1] + image.height <= PANEL_MIN_Y:
                    continue
        item = {
            "type": kind, "subject": subject, "location": location,
            "layer": int(data["layer"]), "image": assets.add(day),
        }
        if "nighttimeimage" in data:
            item["nightImage"] = assets.add(assets.resolve(path, data["nighttimeimage"]))
        if kind == "needle":
            for key in ("radius", "initialangle", "lastangle", "minimum", "maximum", "naturalfreq", "dampingratio"):
                item[key] = float(data[key])
            item["origin"] = pair(data["origin"])
            item["tilt"] = pair(data["tilt"])
        elements.append(item)
    return {
        "source": path.relative_to(assets.source).as_posix(),
        "this": layout,
        "elements": sorted(elements, key=lambda element: element["layer"]),
        "crop": {"x": 50, "y": PANEL_MIN_Y, "width": PANEL_WIDTH, "height": 2247.75},
    }


def build_sounds(assets, path):
    sounds = {}
    for section, values in read_config(path):
        section = section.replace(" ", "")
        wavs = {key: ref for key, ref in values.items() if ref.lower().endswith(".wav")}
        if not wavs:
            continue
        sounds[section] = {
            key: assets.add(assets.resolve(path, ref), keep_wav=section in ("run", "others") or key == "loop")
            for key, ref in wavs.items()
        }
    return sounds


def replace_json(path, value):
    temporary = path.with_suffix(".part")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)


def bundle(source):
    assets = AssetBundle(source)
    source_vehicle = source / "vehicle_2.txt"
    vehicle = dict(read_config(source_vehicle))["root"]
    parameters = dict(read_config(assets.resolve(source_vehicle, vehicle["parameters"])))
    dynamics, cab = parameters["dynamics"], parameters["cab"]
    motor_count, trailer_count = int(dynamics["motorcarcount"]), int(dynamics["trailercount"])
    mass = motor_count * int(dynamics["motorcarweight"]) + trailer_count * int(dynamics["trailerweight"])
    panel = build_panel(assets, assets.resolve(source_vehicle, vehicle["panel"]))
    sounds = build_sounds(assets, assets.resolve(source_vehicle, vehicle["sound"]))
    motor_path = source / "Plugin/x64/MParameter.txt"
    motor_config = dict(read_config(motor_path))
    sounds["motor"] = {key: assets.add(assets.resolve(motor_path, ref), keep_wav=True) for key, ref in motor_config["motor"].items()}
    motor_noise = {
        phase: {kind: read_table(assets.resolve(motor_path, ref), source) for kind, ref in motor_config[phase].items()}
        for phase in ("power", "brake")
    }
    performance_path = assets.resolve(source_vehicle, vehicle["performancecurve"])
    performance = {
        phase: {key: read_table(assets.resolve(performance_path, ref), source) for key, ref in values.items()}
        for phase, values in read_config(performance_path) if phase in ("power", "brake")
    }
    power = performance["power"]
    power["sourceStepForce"] = power["force"]
    power["force"] = three_power_notches(power["sourceStepForce"], power["current"], power["params"])
    reference_force = next(row[3] for row in power["force"]["rows"] if row[0] >= 3)
    specs = {
        "powerNotches": int(cab["powernotchcount"]), "brakeNotches": int(cab["brakenotchcount"]),
        "holdingNotches": int(cab["holdingspeednotchcount"]), "carCount": motor_count + trailer_count,
        "massKg": mass, "carLengthM": float(dynamics["carlength"]),
        "doorCloseSeconds": float(parameters["door"]["closetime"]), "viewpoint": parameters["viewpoint"],
        "startingAccelerationKmhPerSecondApprox": round(reference_force * motor_count / mass * 3.6, 3),
        "startingAccelerationMethod": "Derived P3 effort at 3 km/h divided by supplied empty mass. No wheel/rotor inertia, passenger load, or drag.",
        "firstCar": parameters["root"]["firstcar"],
        "holdingSpeedLabels": [value.strip() for value in cab["holdingspeedtext"].split(",")][1:],
        "brakeHandleLabels": [value.strip() for value in cab["braketext"].split(",")],
        "brakeSystem": {
            "kind": "SMEE", "maxServiceKpa": float(parameters["smee"]["maximumpressure"]) / 1000,
            "brakePipeInitialKpa": float(parameters["smee"]["bpinitialpressure"]) / 1000,
            "reservoirLowerKpa": float(parameters["compressor"]["lowerpressure"]) / 1000,
            "reservoirUpperKpa": float(parameters["compressor"]["upperpressure"]) / 1000,
            "pressureRates": [float(value.strip()) for value in parameters["smee"]["pressurerates"].split(",")],
            "straightPipeToCylinderRatio": float(parameters["smee"]["sapbcratio"]),
            "straightPipeOffsetKpa": float(parameters["smee"]["sapbcoffset"]) / 1000,
        },
    }
    recipe = {
        "id": VEHICLE_ID, "name": "東武6050系", "route": "会津鬼怒川線", "sourceArchive": "TOBU6050",
        "sourceVehicle": source_vehicle.name, "sourceSpecs": specs,
        "playableSpecs": {
            **specs, "maxSpeedKmh": 110, "startingAccelerationKmhPerSecondApprox": 1.65,
            "startingAccelerationMethod": "Prototype calibration target. The force curve is normalized at 3 km/h.",
        },
        "serviceBrakeKmhPerSecond": 3.5, "emergencyBrakeKmhPerSecond": 4.5,
        "notchLabels": ["EB", *[f"B{i}" for i in range(specs["brakeNotches"], 0, -1)], "N", "P1", "P2", "P3"],
        "panel": panel, "sounds": sounds, "motorNoise": motor_noise, "performance": performance,
        "rollingNoiseSource": "AizuKinugawa/RolingNoiseSet_6050.txt",
        "rollingSoundIndexes": {"long": 4, "ballast25": 0, "bridge": 3, "bridge25": 3, "tunnel": 2, "tunnel25": 8, "slab25": 1},
        "rollingBaseSpeedKmh": {"0": 90, "1": 90, "3": 90, "4": 90, "8": 90},
        "motorMix": {"fanIndex": int(motor_config["fan"]["fanindex"]), **motor_config["soundmixing"]},
        "subjectMappings": {
            "common": {
                "true": "always", "door": "doorClosed", "amabs": "absoluteMotorCurrent", "kmph": "speedKmh",
                "bc": "brakeCylinderKpa", "mr": "mainReservoirKpa", "sap": "brakeStraightAirPipeKpa", "bp": "brakePipeKpa",
            },
            "vehicle": {},
        },
        "notes": [
            "提供BVEのvehicle_2.txt（1M1T・M車先頭）を使用。会津鬼怒川線の音指定に合わせ、Run 1はスラブ軌道音を採用。",
            "実車相当の起動加速度1.65km/h/sと試作用ブレーキ性能を設定。力行曲線は24内部段から3操作段に近似。別ハンドルの抑速3段は出典の設定値に保存。",
            "独自ATS表示やMotorMasterの電流連動・架線変動など、BVEプラグイン固有の処理はブラウザー内で近似。",
        ],
    }
    manifest_path = FINAL_ASSETS / "vehicles/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["trains"][VEHICLE_ID] = assets.entries
    replace_json(manifest_path, manifest)
    recipes_path = FINAL_ASSETS / "vehicle-recipes.json"
    recipes = json.loads(recipes_path.read_text(encoding="utf-8"))
    recipes["trains"] = [item for item in recipes["trains"] if item["id"] != VEHICLE_ID] + [recipe]
    replace_json(recipes_path, recipes)
    total_size = sum((assets.target / entry["file"]).stat().st_size for entry in assets.entries.values())
    print(f"{VEHICLE_ID}: {len(assets.entries)} bundled assets, {total_size / 1024**2:.1f} MiB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Extracted TOBU6050 vehicle directory")
    bundle(parser.parse_args().source.resolve(strict=True))
