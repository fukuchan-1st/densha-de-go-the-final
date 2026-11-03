"""Package the panels and sound cues referenced by the four web vehicles."""
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "local-vehicles"
OUTPUT = ROOT / "dist/assets/final/vehicles"

# Use the rendering and audio modules' actual asset selection.
PLAN = """
import {readFile} from 'node:fs/promises';
import {LocalCabPanel,PANEL_CROPS} from './dist/final-panel.js';
import {LocalTrainAudio} from './dist/final-audio.js';
const {trains}=JSON.parse(await readFile('dist/assets/final/vehicle-recipes.json','utf8'));
const result=trains.filter(recipe=>recipe.archive).map(recipe=>{
  const panel=Object.assign(Object.create(LocalCabPanel.prototype),{recipe});
  const audio=Object.assign(Object.create(LocalTrainAudio.prototype),{recipe});
  const images=recipe.panel.elements.filter(element=>panel.supported(element))
    .flatMap(element=>[element.image,element.nightImage]).filter(Boolean);
  const motors=Object.values(recipe.sounds.motor??{}).map(ref=>ref.entryIndex);
  return {id:recipe.id,images,audio:audio.assetRefs(),motors,scale:1600/PANEL_CROPS[recipe.id].width};
});
process.stdout.write(JSON.stringify(result));
"""


def source_file(train_id, ref):
    suffix = Path(ref["entryName"]).suffix.lower()
    return SOURCE / train_id / f"{ref['entryIndex']}{suffix}"


def bundle():
    plan = subprocess.check_output(["node", "--input-type=module", "-e", PLAN], cwd=ROOT)
    manifest_path = OUTPUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))["trains"] if manifest_path.is_file() else {}
    for train in json.loads(plan):
        train_id = train["id"]
        target = OUTPUT / train_id
        target.mkdir(parents=True, exist_ok=True)
        entries = {}
        for ref in train["images"]:
            index = ref["entryIndex"]
            if index in entries:
                continue
            filename = f"{index}.webp"
            with Image.open(source_file(train_id, ref)) as original:
                width, height = original.size
                scale = min(1, train["scale"])
                size = tuple(max(1, round(n * scale)) for n in original.size)
                original.convert("RGBA").resize(size, Image.Resampling.BILINEAR).save(
                    target / filename, format="WEBP", lossless=True
                )
            entries[index] = {"file": filename, "width": width, "height": height}
        for ref in train["audio"]:
            index = ref["entryIndex"]
            if index in entries:
                continue
            if index in train["motors"]:
                filename = f"{index}.wav"
                shutil.copyfile(source_file(train_id, ref), target / filename)
                (target / f"{index}.mp3").unlink(missing_ok=True)
                entries[index] = {"file": filename}
                continue
            filename = f"{index}.mp3"
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                            "-i", str(source_file(train_id, ref)), "-vn",
                            "-codec:a", "libmp3lame", "-q:a", "2",
                            str(target / filename)], check=True)
            entries[index] = {"file": filename}
        manifest[train_id] = entries
        print(f"{train_id}: {len(entries)} web assets", flush=True)
    manifest_path.write_text(json.dumps({"trains": manifest}), encoding="utf-8")


if __name__ == "__main__":
    bundle()
