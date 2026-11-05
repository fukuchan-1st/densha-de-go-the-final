"""Bundle the supplied genuine E127-100 cab, physics and audio, adding only e127."""

import argparse
import importlib.util
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("added_trains", Path(__file__).with_name("import-added-trains.py"))
added = importlib.util.module_from_spec(spec)
spec.loader.exec_module(added)

CONFIG = {
    "id": "e127", "name": "E127系100番台", "root": "data/ooito/E127-100_for_bve4",
    "vehicle": "Vehicle.txt", "maxSpeed": 100, "mapping": {},
}


class CompactBundle(added.Bundle):
    def add(self, path, color=None, loop=False):
        if not path or path.suffix.lower() not in (".wav", ".ogg"):
            return super().add(path, color, loop)
        key = (path, color)
        if key in self.refs:
            return self.refs[key]
        index = len(self.refs)
        filename = f"{index}.mp3"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
            "-codec:a", "libmp3lame", "-q:a", "2", str(self.target / filename),
        ], check=True)
        ref = {"entryIndex": index, "entryName": path.relative_to(self.source).as_posix(), "size": path.stat().st_size}
        self.entries[str(index)] = {"file": filename}
        self.refs[key] = ref
        return ref


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Supplied dengo_thef folder")
    args = parser.parse_args()
    added.Bundle = CompactBundle
    recipe, entries = added.import_one(args.source.resolve(strict=True), CONFIG)
    # BVE has a speed-holding brake at the first position, distinct from its
    # HoldingSpeedNotchCount=0 (no additional handle positions).
    for specs in (recipe["sourceSpecs"], recipe["playableSpecs"]):
        specs["holdingNotches"] = 1
        specs["sourceHoldingSpeedNotchCount"] = 0
    recipe["panel"]["crop"] = {"x": -256, "y": 140, "width": 1536, "height": 864}
    recipe["panel"]["sideFill"] = {"top": 630, "color": "#20221c"}
    recipe["rollingSoundIndexes"] = {"long": 1, "slab25": 0, "ballast25": 0, "bridge": 2, "tunnel": 4}
    recipe["serviceBrakeKmhPerSecond"] = 3.7
    recipe["notes"].extend([
        "フォルダー名はfor_bve4ですが、使用ファイルはBVE5形式のVehicle 2.00 / Parameters 2.01です。",
        "E127-383は383系の運転台・モーター音に差し替えられたデータのため使用せず、E127本来の2両編成を使用。",
        "走行・モーター音を含む音声は容量削減のためMP3に変換。速度別の原音量・周波数表を保持。",
        "最高速度100km/hは本プロトタイプの運用上限。常用減速度3.7km/h/sは供給Train.datのPERFORMANCE値。",
    ])
    recipe["sourceSpecs"]["serviceBrakeKmhPerSecond"] = 3.7
    recipe["sourceSpecs"]["serviceBrakeSource"] = "Train.dat #PERFORMANCE first value"
    recipes_path = added.ASSETS / "vehicle-recipes.json"
    manifest_path = added.ASSETS / "vehicles/manifest.json"
    # Read immediately before replacement; never rerun any other vehicle import.
    recipes = json.loads(recipes_path.read_text(encoding="utf-8"))
    before = {item["id"]: item for item in recipes["trains"] if item["id"] != "e127"}
    recipes["trains"] = [item for item in recipes["trains"] if item["id"] != "e127"] + [recipe]
    assert all(before[item["id"]] == item for item in recipes["trains"] if item["id"] != "e127")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["trains"]["e127"] = entries
    added.helpers.replace_json(recipes_path, recipes)
    added.helpers.replace_json(manifest_path, manifest)
    target = added.ASSETS / "vehicles/e127"
    total = sum((target / entry["file"]).stat().st_size for entry in entries.values())
    print(json.dumps({"id": "e127", "cars": recipe["sourceSpecs"]["carCount"], "assets": len(entries), "bytes": total,
                      "missingReferences": recipe["missingReferences"], "crop": recipe["panel"]["crop"]}))


if __name__ == "__main__":
    main()
