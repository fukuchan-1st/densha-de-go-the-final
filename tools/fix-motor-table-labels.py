"""Keep E127/223 tuning comments separate from positional motor channel IDs."""
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("added", Path(__file__).with_name("import-added-trains.py"))
added = importlib.util.module_from_spec(spec)
spec.loader.exec_module(added)
path = added.ASSETS / "vehicle-recipes.json"
catalog = json.loads(path.read_text(encoding="utf8"))
for recipe in catalog["trains"]:
    added.normalize_motor_labels(recipe["id"], recipe.get("motorNoise", {}))
added.helpers.replace_json(path, catalog)
