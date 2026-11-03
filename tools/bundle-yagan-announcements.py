"""Convert the supplied BVE Aizu Kinugawa route announcements for the web player."""
import argparse
import csv
import subprocess
from pathlib import Path, PureWindowsPath


def bundle(source, output):
    listing = (source / 'Sounds_0805.txt').read_text(encoding='cp932')
    output.mkdir(parents=True, exist_ok=True)
    for row in csv.reader(listing.splitlines()[1:]):
        if len(row) < 2 or not row[0].strip():
            continue
        key, filename = (column.strip() for column in row[:2])
        if not key.replace('_', '').isalnum():
            raise ValueError(f'Invalid BVE sound key: {key}')
        audio = source.joinpath(*PureWindowsPath(filename).parts).resolve()
        if not audio.is_relative_to(source):
            raise ValueError(f'BVE sound outside source directory: {filename}')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        '-i', str(audio), '-vn', '-codec:a', 'libmp3lame', '-q:a', '4',
                        str(output / f'{key}.mp3')], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('route', type=Path)
    args = parser.parse_args()
    assets = Path(__file__).resolve().parents[1] / 'dist/assets/final'
    bundle(args.route.resolve(), assets / 'yagan-announcements')
