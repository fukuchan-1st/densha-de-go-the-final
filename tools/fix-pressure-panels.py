"""Restore source pressure sprite banks without regenerating other vehicle data."""
import importlib.util
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "dist/assets/final"
spec = importlib.util.spec_from_file_location("added", Path(__file__).with_name("import-added-trains.py"))
added = importlib.util.module_from_spec(spec)
spec.loader.exec_module(added)


def pressure_sprites(vehicle):
    def bank(semantic, low, high, step):
        return {"semantic": semantic, "minKpa": low, "maxKpa": high, "stepKpa": step}
    bc, mr = "brakeCylinderKpa", "mainReservoirKpa"
    if vehicle == "e233":
        return {**{f"ats{123+i}": bank(bc, i*200, i*200+180, 20) for i in range(3)},
                **{f"ats{127+i}": bank(mr, 750+i*50, 795+i*50, 5) for i in range(3)}}
    if vehicle == "e353":
        return {**{f"ats{235+i}": bank(bc, i*200, i*200+180, 20) for i in range(3)},
                **{f"ats{240+i}": bank(mr, 700+i*100, 790+i*100, 10) for i in range(2)}}
    return {}


def main():
    catalog_path, manifest_path = ASSETS / "vehicle-recipes.json", ASSETS / "vehicles/manifest.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf8"))
    for recipe in catalog["trains"]:
        banks = pressure_sprites(recipe["id"])
        if not banks:
            continue
        recipe["panel"]["pressureSprites"] = banks
        recipe["panel"]["pressureSpriteSource"] = (
            "Source Panel/0-12I.txt pressure range comments: BC 20kPa and MR 5kPa per frame."
            if recipe["id"] == "e233" else
            "Source Img/9Oito.txt + BC1-2/BC2-2/BC3-2/MR1-3/MR2 image strips, calibrated against printed PanelA.png scale. "
            "BC frame 0 global Y=3131/3033/2935 aligns 0/200/400kPa; MR frame 0 Y=3130/3001 aligns 700/800kPa. "
            "Each strip has 10 pointer frames, later padding frames are transparent."
        )
        recipe["subjectMappings"]["vehicle"].update({s: v["semantic"] for s, v in banks.items()})
        entries = manifest["trains"][recipe["id"]]
        target = ASSETS / "vehicles" / recipe["id"]
        if recipe["id"] == "e353":
            config = next(c for c in added.CONFIGS if c["id"] == "e353")
            bundle = added.Bundle(Path("C:/Users/bmwhz/OneDrive/Desktop/dengo_thef"), config)
            bundle.width = recipe["panel"]["crop"]["width"]
            # Seed refs with all existing indices, reserving original identities.
            bundle.refs = {("reserved", key): {} for key in entries}
            source_panel = bundle.source / recipe["panel"]["source"]
            for kind, data in added.read_config(source_panel):
                subject = data.get("subject", "").lower()
                if kind != "digitalnumber" or subject not in banks:
                    continue
                if any(e["subject"] == subject for e in recipe["panel"]["elements"]):
                    continue
                ref = bundle.add(bundle.resolve(source_panel, data["daytimeimage"], required=True))
                recipe["panel"]["elements"].append({"type": kind, "subject": subject,
                    "layer": float(data.get("layer", 0)), "location": added.pair(data["location"]),
                    "interval": float(data["interval"]), "image": ref})
            entries.update(bundle.entries)
        else:
            for element in recipe["panel"]["elements"]:
                if element["subject"] not in banks:
                    continue
                for ref in [element.get("image"), element.get("nightImage")]:
                    if not ref or str(ref["entryIndex"]) in entries:
                        continue
                    index = str(ref["entryIndex"])
                    source = ROOT / "local-vehicles/e233" / f"{index}{Path(ref['entryName']).suffix.lower()}"
                    with Image.open(source) as image:
                        width, height = image.size
                        scale = min(1, 1600/recipe["panel"].get("crop", {"width":4096})["width"])
                        image.convert("RGBA").resize((max(1,round(width*scale)),max(1,round(height*scale))), Image.Resampling.BILINEAR).save(target/f"{index}.webp",lossless=True)
                    entries[index] = {"file": f"{index}.webp", "width": width, "height": height}
        recipe["panel"]["elements"].sort(key=lambda e:e["layer"])
        print(recipe["id"], len(banks), "pressure banks")
    added.helpers.replace_json(catalog_path, catalog)
    added.helpers.replace_json(manifest_path, manifest)


if __name__ == "__main__":
    main()
