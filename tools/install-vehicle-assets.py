"""Copy the referenced assets from extracted BVE packs into the local app."""
import argparse
import json
import shutil
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "local-vehicles"
RECIPES = ROOT / "dist/assets/final/vehicle-recipes.json"
FORMATS = {".png", ".wav", ".ogg", ".bmp", ".jpg"}


def references(value):
    if isinstance(value, dict):
        if "entryIndex" in value and "entryName" in value:
            yield value
        else:
            for child in value.values():
                yield from references(child)
    elif isinstance(value, list):
        for child in value:
            yield from references(child)


def matches(path, ref):
    if not path.is_file() or path.stat().st_size != ref["size"]:
        return False
    return zlib.crc32(path.read_bytes()) == ref["crc32"]


def install(train, source):
    extracted = source / Path(train["sourceArchive"]).stem
    output = ASSETS / train["id"]
    output.mkdir(parents=True, exist_ok=True)
    refs = {ref["entryIndex"]: ref for ref in references(train) if "rawNameBase64" in ref}
    fallback_by_size = None
    for index, ref in refs.items():
        name = Path(ref["entryName"])
        suffix = name.suffix.lower()
        if suffix not in FORMATS or name.is_absolute() or ".." in name.parts:
            raise ValueError(f"Unexpected asset entry: {name}")
        target = output / f"{index}{suffix}"
        if matches(target, ref):
            continue
        original = extracted / name
        if not matches(original, ref):
            if fallback_by_size is None:
                fallback_by_size = {}
                for path in extracted.rglob("*"):
                    if path.suffix.lower() in FORMATS and path.is_file():
                        fallback_by_size.setdefault(path.stat().st_size, []).append(path)
            original = next((path for path in fallback_by_size.get(ref["size"], [])
                             if path.suffix.lower() == suffix and matches(path, ref)), None)
            if original is None:
                raise FileNotFoundError(f"{train['id']}: {name}")
        partial = target.with_suffix(".part")
        shutil.copyfile(original, partial)
        partial.replace(target)
    print(f"{train['id']}: {len(refs)} assets")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("train", type=Path, help="Folder holding the four extracted BVE packs")
    source = parser.parse_args().train.resolve(strict=True)
    trains = json.loads(RECIPES.read_text(encoding="utf-8"))["trains"]
    for train in trains:
        install(train, source)
    manifest = ASSETS / "manifest.json"
    partial = manifest.with_suffix(".part")
    partial.write_text(json.dumps({"trains": [train["id"] for train in trains]}), encoding="utf-8")
    partial.replace(manifest)
