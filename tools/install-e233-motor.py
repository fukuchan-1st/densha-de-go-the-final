"""Install the supplied Mitsubishi IGBT motor sounds and BVE speed tables."""
import argparse
import csv
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECIPES = ROOT / "dist/assets/final/vehicle-recipes.json"
TARGET = ROOT / "local-vehicles/e233"
SOURCE_ID = "e233-mitsubishi-igbt"


def sections(path):
    result = {}
    current = None
    for line in path.read_text(encoding="cp932").splitlines():
        text = line.split(";", 1)[0].strip()
        if text.startswith("[") and text.endswith("]"):
            current = result.setdefault(text[1:-1].lower(), {})
        elif current is not None and "=" in text:
            key, value = text.split("=", 1)
            current[key.strip().lower()] = value.strip()
    return result


def motor_table(path, indices):
    with path.open(encoding="cp932", newline="") as handle:
        rows = csv.reader(handle)
        next(rows)  # BveTs Motor Noise Table header
        columns = [int(value) for value in next(rows)[1:]]
        if columns != indices:
            raise ValueError(f"Unexpected motor columns in {path.name}")
        knots = {}
        for row in rows:
            if not row or not row[0].strip():
                continue
            speed = float(row[0])
            values = knots.setdefault(speed, [None] * len(indices))
            for column, raw in enumerate(row[1:]):
                if raw.strip():
                    values[column] = float(raw)
    return {
        "source": f"Mitsubishi IGBT/MotorNoise/{path.name}",
        "labels": [str(index) for index in indices],
        "rows": [[speed, *knots[speed]] for speed in sorted(knots)],
    }


def install(source):
    mapping = sections(source / "Sound.txt")["motor"]
    indices = sorted(map(int, mapping))
    if indices != list(range(24)):
        raise ValueError("Expected motor channels 0–23")
    config = source / "MotorNoise/MotorNoise.txt"
    tables = {
        phase: {name: motor_table(config.parent / filename, indices)
                for name, filename in group.items()}
        for phase, group in sections(config).items()
    }
    TARGET.mkdir(parents=True, exist_ok=True)
    motor = {}
    for index in indices:
        name = mapping[str(index)]
        if Path(name).name != name or Path(name).suffix.lower() != ".wav":
            raise ValueError(f"Unexpected motor sound: {name}")
        asset = source / name
        entry_index = 10000 + index
        shutil.copyfile(asset, TARGET / f"{entry_index}.wav")
        motor[str(index)] = {"entryIndex": entry_index, "entryName": name, "source": SOURCE_ID}
    catalog = json.loads(RECIPES.read_text(encoding="utf-8"))
    train = next(train for train in catalog["trains"] if train["id"] == "e233")
    train["sounds"]["motor"] = motor
    train["motorNoise"] = tables
    train["motorSource"] = "E233系 三菱IGBT / エレトレ（音源 Train Sound）"
    RECIPES.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"E233: {len(motor)} motor recordings, {sum(map(len, tables.values()))} speed tables")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    install(parser.parse_args().source.resolve(strict=True))
