"""Import the user-supplied 223, 681, E353, 383 and 211 BVE packs."""

import argparse
import importlib.util
import json
import math
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "dist/assets/final"
spec = importlib.util.spec_from_file_location("tobu_import", Path(__file__).with_name("import-tobu6050.py"))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
read_config, read_table, pair = helpers.read_config, helpers.read_table, helpers.pair

COMMON = {
    "true": "always", "door": "doorClosed", "kmph": "speedKmh", "kmphd0": "speedOnes",
    "kmphd1": "speedTens", "kmphd2": "speedHundreds", "am": "motorCurrent",
    "amabs": "absoluteMotorCurrent", "mr": "mainReservoirKpa", "bc": "brakeCylinderKpa",
    "sap": "brakeStraightAirPipeKpa", "bp": "brakePipeKpa", "hour": "hour", "min": "minute",
    "sec": "second", "brake": "brakeIndex", "power": "powerIndex", "mrd1": "mrTens",
    "mrd2": "mrHundreds", "bcd1": "bcTens", "bcd2": "bcHundreds",
}
CONFIGS = [
    {"id": "223-1000", "name": "223系1000番台", "root": "train/223-1000", "vehicle": "SRS/223-1000/Vehicle_12.txt", "motor": "FWCH/PI/223-1000/MParameter.txt", "maxSpeed": 130, "mapping": {"ats30": "brakeIndex"}},
    {"id": "223", "name": "223系2000番台", "root": "train/223", "vehicle": "Vehicle-txt/Null/Vehicle-DT-4M4T.txt", "maxSpeed": 130, "mapping": {"ats30": "brakeIndex"}},
    {"id": "681", "name": "681系", "root": "train/681", "vehicle": "NS/Train/681/Vehicle_txt/Vehicle_W_NP.txt", "motor": "FWCH/PI/681/MParameter.txt", "maxSpeed": 130, "fallbackAcceleration": 2.0, "mapping": {"ats143": "speedKmh", "ats160": "motorCurrent", "ats149": "mainReservoirKpa", "ats146": "brakeCylinderKpa", "ats140": "speedOnes", "ats141": "speedTens", "ats142": "speedHundreds", "ats144": "bcTens", "ats145": "bcHundreds", "ats147": "mrTens", "ats148": "mrHundreds", "ats30": "brakeIndex"}},
    {"id": "e353", "name": "E353系", "root": "train/E353", "vehicle": "Vehicle9Oito.txt", "motor": "Plugin/FWCH/x64/MParameter.txt", "pathCorrections": {".../../../Sound/jus/Freq.csv": "../../../Sound/jus/Freq.csv"}, "maxSpeed": 130, "mapping": {"ats230": "speedGaugeAngleEncoded", "ats231": "speedHundreds", "ats232": "speedTens", "ats233": "speedOnes", "ats39": "doorClosed", "ats228": "brakeIndex", "ats73": "controlVoltage", "ats75": "lineVoltage"}, "calibrations": {"ats230": "Plugin/x64/SpeedoMeter.csv"}},
    {"id": "383", "name": "383系", "root": "train/383", "vehicle": "Vehicle_A0.txt", "maxSpeed": 130, "mapping": {"ats19": "doorClosed", "ats118": "mainReservoirKpa", "ats115": "brakeCylinderKpa", "ats121": "lineVoltage", "ats120": "brakeIndex", "ats119": "powerIndex"}},
    {"id": "211", "name": "211系3000番台", "root": "data/ooito/shallowf/211", "vehicle": "vehicle/vehicle_4M2T_3000_428M.txt", "maxSpeed": 110, "mapping": {"ats230": "speedGaugeAngleEncoded", "ats231": "speedGaugeAngleEncodedShadow"}, "calibrations": {"ats230": "ats/x64/SpeedoMeter.csv", "ats231": "ats/x64/SpeedoMeterShadow.csv"}},
]


class Bundle:
    def __init__(self, base, config):
        self.source = (base / config["root"]).resolve()
        self.config = config
        self.files = {p.relative_to(self.source).as_posix().lower(): p for p in self.source.rglob("*") if p.is_file()}
        self.target = ASSETS / "vehicles" / config["id"]
        self.target.mkdir(parents=True, exist_ok=True)
        self.refs, self.entries, self.missing = {}, {}, []
        self.width = 1600

    def resolve(self, context, reference, required=False):
        reference = reference.split(" #", 1)[0].strip().replace("\\", "/")
        reference = self.config.get("pathCorrections", {}).get(reference, reference)
        path = (context.parent / reference).resolve()
        try:
            key = path.relative_to(self.source).as_posix().lower()
        except ValueError:
            key = None
        found = self.files.get(key)
        if not found:
            record = {"file": context.relative_to(self.source).as_posix(), "reference": reference}
            if record not in self.missing:
                self.missing.append(record)
            if required:
                raise FileNotFoundError(f"{context.name}: {reference}")
        return found

    def add(self, path, color=None, loop=False):
        if not path:
            return None
        key = (path, color)
        if key in self.refs:
            return self.refs[key]
        suffix = path.suffix.lower()
        if suffix not in (".png", ".bmp", ".wav", ".ogg"):
            raise ValueError(f"Unexpected asset type {path.name}")
        index = len(self.refs)
        ref = {"entryIndex": index, "entryName": path.relative_to(self.source).as_posix(), "size": path.stat().st_size}
        if suffix in (".png", ".bmp"):
            filename = f"{index}.webp"
            with Image.open(path) as original:
                width, height = original.size
                image = original.convert("RGBA")
                if color:
                    rgb = tuple(int(color.lstrip("#")[offset:offset + 2], 16) for offset in (0, 2, 4))
                    pixels = np.array(image)
                    pixels[np.all(pixels[:, :, :3] == rgb, axis=2), 3] = 0
                    image = Image.fromarray(pixels)
                scale = min(1, 1600 / self.width)
                image.resize(tuple(max(1, round(n * scale)) for n in image.size), Image.Resampling.BILINEAR).save(self.target / filename, lossless=True)
            ref.update(width=width, height=height)
            if color:
                ref["transparentColor"] = color
            self.entries[str(index)] = {"file": filename, "width": width, "height": height}
        else:
            filename = f"{index}{suffix}" if loop else f"{index}.mp3"
            if loop:
                shutil.copyfile(path, self.target / filename)
            else:
                subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path), "-codec:a", "libmp3lame", "-q:a", "2", str(self.target / filename)], check=True)
            self.entries[str(index)] = {"file": filename}
        self.refs[key] = ref
        return ref


def panel_for(bundle, path):
    sections = read_config(path)
    layout = dict(sections)["this"]
    left, right = float(layout["left"]), float(layout["right"])
    width = right - left
    bottom = float(layout["bottom"])
    crop = {"x": left, "y": bottom - width * 9 / 16, "width": width, "height": width * 9 / 16}
    bundle.width = width
    this = {key: pair(value) if key in ("center", "origin") else float(value) for key, value in layout.items() if key in ("left", "right", "top", "bottom", "resolution", "center", "origin", "perspective")}
    if "transparentcolor" in layout:
        this["transparentcolor"] = layout["transparentcolor"]
    mapping = {**COMMON, **bundle.config["mapping"]}
    pressure_sprites = {}
    if bundle.config["id"] == "e353":
        pressure_sprites = {**{f"ats{235+i}": {"semantic": "brakeCylinderKpa", "minKpa": i*200, "maxKpa": i*200+180, "stepKpa": 20} for i in range(3)},
                            **{f"ats{240+i}": {"semantic": "mainReservoirKpa", "minKpa": 700+i*100, "maxKpa": 790+i*100, "stepKpa": 10} for i in range(2)}}
        bundle.config["mapping"].update({subject: bank["semantic"] for subject, bank in pressure_sprites.items()})
        mapping.update(bundle.config["mapping"])
    elements = []
    for kind, data in sections:
        subject = data.get("subject", "true").lower()
        if kind not in ("this", "pilotlamp", "needle", "digitalnumber", "digitalgauge") or subject not in mapping:
            continue
        element = {"type": "background" if kind == "this" else kind, "subject": subject, "layer": float(data.get("layer", -10 if kind == "this" else 0)), "location": pair(data.get("location", "0,0"))}
        color = data.get("transparentcolor", layout.get("transparentcolor"))
        if color:
            element["transparentcolor"] = color
        for field, key in (("daytimeimage", "image"), ("nighttimeimage", "nightImage")):
            if field in data:
                ref = bundle.add(bundle.resolve(path, data[field]), color)
                if ref:
                    element[key] = ref
        if kind != "digitalgauge" and "image" not in element:
            continue
        for key in ("radius", "initialangle", "lastangle", "minimum", "maximum", "interval", "naturalfreq", "dampingratio", "step"):
            if key in data:
                element[key] = float(data[key])
        for key in ("origin", "tilt"):
            if key in data:
                element[key] = pair(data[key])
        if "color" in data:
            element["color"] = data["color"]
        elements.append(element)
    calibration = {}
    for subject, relative in bundle.config.get("calibrations", {}).items():
        calibration[subject] = {"angleKnots": read_table(bundle.source / relative, bundle.source)["rows"], "subject": subject}
    result = {"source": path.relative_to(bundle.source).as_posix(), "this": this, "crop": crop, "elements": sorted(elements, key=lambda element: element["layer"]), "calibratedNeedles": calibration}
    if calibration:
        result["speedGaugeCalibration"] = next(iter(calibration.values()))
    speed_digits = {subject: {"place": {"speedHundreds": 100, "speedTens": 10, "speedOnes": 1}[semantic]} for subject, semantic in mapping.items() if semantic in ("speedHundreds", "speedTens", "speedOnes")}
    result["speedDigits"] = speed_digits
    if pressure_sprites:
        result["pressureSprites"] = pressure_sprites
    return result


def audio_for(bundle, path):
    sounds = {}
    allowed = {"run", "motor", "door", "horn", "pilotlamp", "mastercontroller", "brakehandle", "brake", "compressor", "others", "flange", "joint", "switch", "suspension", "airspring", "reverser"}
    config = read_config(path)
    if bundle.config["id"] == "383":
        # This source delegates its doors to the BVE plugin but supplies the standard samples.
        config.append(("door", {"openleft": "sound_t/DoorOpnL.wav", "openright": "sound_t/DoorOpnR.wav", "closeleft": "sound_t/DoorClsL.wav", "closeright": "sound_t/DoorClsR.wav"}))
    if bundle.config["id"] == "e353":
        config.append(("horn", {"primary": "Miso_yk/KlaxonC.wav", "primaryrelease": "Miso_yk/KlaxonD.wav"}))
    for kind, values in config:
        section = kind.replace(" ", "")
        if section not in allowed:
            continue
        for key, reference in values.items():
            if not reference.split(" #", 1)[0].lower().endswith((".wav", ".ogg")):
                continue
            ref = bundle.add(bundle.resolve(path, reference), loop=section in ("run", "motor", "others") or key == "loop")
            if ref:
                sounds.setdefault(section, {})[key] = ref
    return sounds


def curve_for(bundle, path):
    performance = {}
    if not path:
        return performance
    for phase, values in read_config(path):
        if phase not in ("power", "brake"):
            continue
        for key, reference in values.items():
            table = bundle.resolve(path, reference)
            if table:
                performance.setdefault(phase, {})[key] = read_table(table, bundle.source)
    return performance


def compress_stages(performance, notches):
    power = performance.get("power", {})
    force, current, params = power.get("force"), power.get("current"), power.get("params", {})
    if not force or not force["rows"] or len(force["rows"][0]) == notches + 1:
        return
    settings = params.get("namedRows", {})
    thresholds = settings.get("requirednotch_up")
    limits = settings.get("currentlimitingvalue_empty")
    if not thresholds or not current:
        return
    current_rows = {row[0]: row[1:] for row in current["rows"]}
    rows = []
    for speed, *effort in force["rows"]:
        amps = current_rows.get(speed)
        if amps is None:
            continue
        values = []
        for notch in range(1, notches + 1):
            stage = 0
            while stage < len(effort) - 1 and stage < len(thresholds):
                limit = limits[stage] if limits and stage < len(limits) and limits[stage] is not None else math.inf
                if thresholds[stage] is None or thresholds[stage] > notch or amps[stage + 1] is None or amps[stage + 1] > limit:
                    break
                stage += 1
            values.append(effort[stage])
        rows.append([speed, *values])
    power["sourceStepForce"] = force
    power["force"] = {"source": force["source"], "labels": [f"P{i}" for i in range(1, notches + 1)], "rows": rows, "method": "Steady-state estimate from source step thresholds and empty current limits."}


def normalize_motor_labels(vehicle_id, motor_noise):
    # These sources put tuning frequencies on '#' comment rows, not explicit
    # sample IDs. Numeric columns still refer to motor slots in positional order.
    if vehicle_id in ("223", "e127"):
        for phase in motor_noise.values():
            for table in phase.values():
                if table.get("labels"):
                    table["sourceCommentLabels"] = table["labels"]
                    table["labels"] = []


def import_one(base, config):
    bundle = Bundle(base, config)
    vehicle_path = bundle.source / config["vehicle"]
    vehicle = dict(read_config(vehicle_path))["root"]
    parameters = dict(read_config(bundle.resolve(vehicle_path, vehicle["parameters"], required=True)))
    cab, dynamics = parameters.get("onelevercab", parameters.get("cab")), parameters["dynamics"]
    panel = panel_for(bundle, bundle.resolve(vehicle_path, vehicle["panel"], required=True))
    sounds = audio_for(bundle, bundle.resolve(vehicle_path, vehicle["sound"], required=True))
    motor = bundle.source / config["motor"] if config.get("motor") else bundle.resolve(vehicle_path, vehicle.get("motornoise", ""))
    motor_noise = {}
    if motor and motor.is_file():
        for phase, values in read_config(motor):
            if phase == "motor":
                for key, reference in values.items():
                    ref = bundle.add(bundle.resolve(motor, reference), loop=True)
                    if ref:
                        sounds.setdefault("motor", {})[key] = ref
            elif phase in ("power", "brake"):
                for key, reference in values.items():
                    path = bundle.resolve(motor, reference)
                    if path:
                        motor_noise.setdefault(phase, {})[key] = read_table(path, bundle.source)
    normalize_motor_labels(config["id"], motor_noise)
    performance = curve_for(bundle, bundle.resolve(vehicle_path, vehicle["performancecurve"]))
    notches, brakes = int(cab["powernotchcount"]), int(cab["brakenotchcount"])
    compress_stages(performance, notches)
    motors, trailers = int(dynamics["motorcarcount"]), int(dynamics["trailercount"])
    mass = motors * float(dynamics["motorcarweight"]) + trailers * float(dynamics["trailerweight"])
    rows = performance.get("power", {}).get("force", {}).get("rows", [])
    sample = next((row for row in rows if row[0] >= 3 and len(row) > notches and row[notches] is not None), None)
    acceleration = round(sample[notches] * motors / mass * 3.6, 3) if sample else config.get("fallbackAcceleration", 2.5)
    holding = cab.get("holdingspeedbrake", "false").lower() == "true"
    hold_count = int(cab.get("holdingspeednotchcount", int(holding)))
    door = parameters.get("door", {})
    specs = {"powerNotches": notches, "brakeNotches": brakes, "holdingNotches": hold_count, "carCount": motors + trailers, "massKg": mass, "carLengthM": float(dynamics.get("carlength", 20)), "doorCloseSeconds": float(door.get("closetime", 4)), "firstCar": parameters["root"].get("firstcar"), "viewpoint": parameters.get("viewpoint", {}), "startingAccelerationKmhPerSecondApprox": acceleration, "startingAccelerationMethod": "Source motor-car force at 3km/h / empty train mass * 3.6" if sample else "Prototype fallback because referenced source force tables are missing"}
    pressure = parameters.get("ecb", parameters.get("smee", {}))
    if pressure:
        specs["brakeSystem"] = {"kind": "SMEE" if "smee" in parameters else "ECB", "maxServiceKpa": float(pressure.get("maximumpressure", 350000)) / 1000, "pressureRates": [float(x) for x in pressure.get("pressurerates", "0").split(",")], "reservoirLowerKpa": float(parameters.get("compressor", {}).get("lowerpressure", 790000)) / 1000, "reservoirUpperKpa": float(parameters.get("compressor", {}).get("upperpressure", 880000)) / 1000}
    labels = ["EB", *[f"B{i}" for i in range(brakes - int(holding), 0, -1)], *(["抑速"] if holding else []), "N", *[f"P{i}" for i in range(1, notches + 1)]]
    recipe = {"id": config["id"], "name": config["name"], "sourceArchive": bundle.source.name, "sourceVehicle": config["vehicle"], "sourceSpecs": specs, "playableSpecs": {**specs, "maxSpeedKmh": config["maxSpeed"]}, "notchLabels": labels, "panel": panel, "sounds": sounds, "motorNoise": motor_noise, "performance": performance, "subjectMappings": {"common": COMMON, "vehicle": config["mapping"]}, "missingReferences": bundle.missing, "notes": ["提供BVEの運転台・効果音・速度別モーター表を参照。独自ATS表示とネイティブプラグイン処理は再現範囲外。", "起動加速度は供給された引張力表と空車質量から求めたブラウザー用近似値。"], "rollingSoundIndexes": {"long": 0, "slab25": 1, "ballast25": 2, "bridge": 3, "tunnel": 4}}
    if config["id"] == "383":
        recipe["notes"].append("ドア音は元Sound.txtでコメント化されている標準DoorOpn/Cls L/Rを使用。")
    if config.get("pathCorrections"):
        recipe["sourcePathCorrections"] = config["pathCorrections"]
    return recipe, bundle.entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--ids", nargs="*")
    args = parser.parse_args()
    base = args.source.resolve(strict=True)
    for config in CONFIGS:
        if args.ids and config["id"] not in args.ids:
            continue
        recipe, entries = import_one(base, config)
        recipes_path, manifest_path = ASSETS / "vehicle-recipes.json", ASSETS / "vehicles/manifest.json"
        recipes = json.loads(recipes_path.read_text(encoding="utf-8"))
        recipes["trains"] = [item for item in recipes["trains"] if item["id"] != recipe["id"]] + [recipe]
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["trains"][recipe["id"]] = entries
        helpers.replace_json(recipes_path, recipes)
        helpers.replace_json(manifest_path, manifest)
        print(recipe["id"], recipe["sourceSpecs"]["carCount"], "cars", len(entries), "assets", len(recipe["missingReferences"]), "missing refs", flush=True)


if __name__ == "__main__":
    main()
