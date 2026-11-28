"""Build the Liberty Aizu onboard announcements from the supplied video and voice clips."""
import argparse
from functools import lru_cache
import json
from pathlib import Path
import shutil
import subprocess

ASSETS = Path(__file__).resolve().parents[1] / "dist/assets/onboard"
RATE = 24000

# In/out points in the supplied 2022 recording. Japanese next / arrival /
# departure clause, then the name as spoken by the English announcer.
VIDEO_STATIONS = {
    "とうきょうスカイツリー": (None, (406.55, 410.55), None, (425.43, 426.78)),
    "北千住": ((416.12, 419.03), (451.04, 454.56), None, (131.96, 133.40)),
    "春日部": ((459.46, 462.41), (959.12, 960.68), None, (134.00, 134.83)),
    "板倉東洋大前": ((1054.53, 1058.04), (1171.62, 1175.93), None, (135.58, 137.31)),
    "栃木": ((1181.93, 1184.54), (1277.02, 1280.48), None, (137.87, 138.45)),
    "新鹿沼": ((1296.05, 1298.87), (1480.92, 1484.13), None, (1460.29, 1461.32)),
    "下今市": ((1489.56, 1492.51), (1700.17, 1703.69), None, (141.22, 142.33)),
    "大谷向": (None, (1918.45, 1922.05), (1925.31, 1927.36), (1937.48, 1938.37)),
    "大桑": ((1927.38, 1930.17), (2009.83, 2012.93), (2016.20, 2018.13), (2028.12, 2029.02)),
    "新高徳": ((2018.25, 2021.10), (2078.96, 2082.61), (2085.72, 2087.76), (2097.86, 2098.99)),
    "小佐越": ((2088.04, 2091.03), (2148.66, 2151.75), (2154.48, 2156.84), (2167.93, 2168.58)),
    "東武ワールドスクウェア": ((2157.14, 2160.48), (2196.43, 2200.59), (2203.61, 2206.08), (2175.55, 2177.15)),
    "鬼怒川温泉": ((2206.52, 2209.53), (2250.94, 2255.35), (2258.67, 2260.68), (2226.02, 2227.41)),
    "鬼怒川公園": ((2261.11, 2264.07), (2323.56, 2327.40), (2330.55, 2332.98), (2279.72, 2281.31)),
    "新藤原": ((2332.90, 2336.04), (2371.71, 2375.68), (2378.27, 2380.33), (2391.06, 2392.27)),
    "龍王峡": ((2463.30, 2466.37), None, None, (2399.53, 2400.78)),
    "川治温泉": ((2532.93, 2536.45), (2559.37, 2562.88), (2566.28, 2568.26), (2540.45, 2541.96)),
    "川治湯元": ((2568.59, 2571.30), (2629.35, 2632.88), (2636.10, 2638.01), (2648.50, 2649.75)),
    "湯西川温泉": ((2695.47, 2698.34), (2721.48, 2725.00), (2728.50, 2730.58), (2741.31, 2742.76)),
    "中三依温泉": ((2730.79, 2734.06), (2846.08, 2849.91), (2853.09, 2855.34), (2872.58, 2874.08)),
    "上三依塩原温泉口": ((2910.01, 2913.70), (2937.83, 2942.03), (2945.47, 2948.22), (2875.44, 2877.82)),
    "会津高原尾瀬口": ((3008.76, 3012.35), (3035.85, 3039.63), (3043.02, 3045.23), (3056.36, 3058.08)),
    "会津田島": ((3145.68, 3149.33), (3166.78, 3169.84), None, (3153.98, 3154.99)),
}
VOICE_STATIONS = {
    "中荒井": "nakaarai",
    "会津荒海": "aizuarakai",
    "会津山村道場": "aizusanson",
    "七ヶ岳登山口": "nanatsugatake",
    "男鹿高原": "ojikakogen",
}
ORDERS = {
    "liberty101": "とうきょうスカイツリー 北千住 春日部 板倉東洋大前 栃木 新鹿沼 下今市 新高徳 東武ワールドスクウェア 鬼怒川温泉 鬼怒川公園 新藤原 龍王峡 川治湯元 湯西川温泉 中三依温泉 上三依塩原温泉口 会津高原尾瀬口 会津田島",
    "liberty150": "中荒井 会津荒海 会津山村道場 七ヶ岳登山口 会津高原尾瀬口 男鹿高原 上三依塩原温泉口 中三依温泉 湯西川温泉 川治湯元 川治温泉 龍王峡 新藤原 鬼怒川公園 鬼怒川温泉 東武ワールドスクウェア 小佐越 新高徳 大桑 大谷向 下今市",
}

CHIME = (8.98, 12.77)
NEXT_JP = (2463.52, 2464.22)
STOP_JP = (2465.10, 2466.37)
ARRIVING_JP = (3035.91, 3036.98)
ARRIVE_JP = (3038.38, 3039.63)
THANKS_JP = (2320.76, 2323.52)
LEAVE_JP = (3044.59, 3045.26)
NEXT_EN = [(1459.27, 1459.65), (1322.53, 1323.04), (1459.89, 1460.23)]
ARRIVING_EN = (2163.65, 2167.73)
AFTER_EN = (2172.22, 2173.15)
WILL_BE_EN = (2174.33, 2175.57)
THANKS_EN = (2177.89, 2178.76)
# Fallback names to fill gaps in the 2022 recording (most cuts are whole phrases).
JP_NAMES = {
    "とうきょうスカイツリー": (407.50, 409.20),
    "下今市": (1490.84, 1491.68),
    "大谷向": (1919.56, 1920.83),
    "龍王峡": (2382.13, 2383.05),
}


def ffmpeg(*args, input=None):
    return subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", *map(str, args)],
        input=input, stdout=subprocess.PIPE, check=True,
    ).stdout


@lru_cache(maxsize=None)
def video_pcm(video, cut):
    start, end = cut
    duration = end - start
    return ffmpeg(
        "-ss", start, "-i", video, "-t", duration, "-vn",
        "-af", f"afade=d=0.012,afade=t=out:st={duration - 0.014}:d=0.014",
        "-ar", RATE, "-ac", 1, "-f", "s16le", "-",
    )


@lru_cache(maxsize=None)
def voice_pcm(file):
    return ffmpeg(
        "-i", file,
        "-af", "silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.06,"
        "areverse,silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.10,areverse",
        "-ar", RATE, "-ac", 1, "-f", "s16le", "-",
    )


def next_parts(name):
    if name in VOICE_STATIONS:
        return [NEXT_JP, (name, "jp")]
    cut = VIDEO_STATIONS[name][0]
    return [cut] if cut else [NEXT_JP, JP_NAMES[name], STOP_JP]


def arrival_parts(name):
    if name in VOICE_STATIONS:
        return [ARRIVING_JP, (name, "jp2")]
    cut = VIDEO_STATIONS[name][1]
    return [cut] if cut else [ARRIVING_JP, JP_NAMES[name], ARRIVE_JP]


def departure_parts(name):
    if name in VOICE_STATIONS:
        return [(name, "jp3")]
    cut = VIDEO_STATIONS[name][2]
    return [cut] if cut else [JP_NAMES[name], LEAVE_JP]


def english_name(name):
    return (name, "en") if name in VOICE_STATIONS else VIDEO_STATIONS[name][3]


def pause(seconds):
    return bytes(round(seconds * RATE) * 2)


def render(folder, video, key, filename, parts):
    pcm = bytearray()
    for part in parts:
        if isinstance(part, float):
            pcm.extend(pause(part))
        elif isinstance(part[0], str):
            name, variant = part
            pcm.extend(voice_pcm(folder / f"{VOICE_STATIONS[name]}_{variant}.mp3"))
        else:
            pcm.extend(video_pcm(video, part))
    file = f"{key}/{filename}.mp3"
    if not pcm:
        raise ValueError(f"No audio for {file}")
    ffmpeg("-y", "-f", "s16le", "-ar", RATE, "-ac", 1, "-i", "-", "-map_metadata", "-1",
           "-codec:a", "libmp3lame", "-b:a", "40k", ASSETS / file, input=pcm)
    return {"file": file, "seconds": round(len(pcm) / (RATE * 2), 2)}


def build_set(folder, video, key, order):
    (ASSETS / key).mkdir(parents=True, exist_ok=True)
    stations = {}
    shimo_imaichi = order.index("下今市")
    for index, name in enumerate(order):
        following = order[index + 1] if index + 1 < len(order) else None
        next_en = [*NEXT_EN, 0.14, english_name(name)]
        next_audio = [CHIME, 0.30, *next_parts(name), 0.37, *next_en]
        soon_jp = [THANKS_JP, 0.42, *arrival_parts(name)]
        soon_en = [ARRIVING_EN, 0.14, english_name(name)]
        # South of Shimo-imaichi the historical video includes other service details.
        # Only the common approach phrases are needed on that part of train 101's run.
        if following and (key == "liberty150" or index >= shimo_imaichi):
            soon_jp.extend([0.44, *departure_parts(name), 0.38, *next_parts(following)])
            soon_en.extend([0.52, AFTER_EN, 0.12, english_name(name), 0.13,
                            WILL_BE_EN, 0.12, english_name(following)])
        soon_audio = [CHIME, 0.30, *soon_jp, 0.50, *soon_en, 0.38, THANKS_EN]
        stations[name] = {
            "next": render(folder, video, key, f"{index + 1:02}-next", next_audio),
            "soon": {**render(folder, video, key, f"{index + 1:02}-soon", soon_audio),
                     "leadForDuration": True},
        }
    if key == "liberty150":
        file = f"{key}/aizutajima.mp3"
        shutil.copyfile(folder / "aizutajima.mp3", ASSETS / file)
        stations["会津田島"] = {"departure": {"file": file, "announces": "中荒井"}}
    return {"stations": stations}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="only_voice folder with the 101 video and MP3s")
    source = parser.parse_args().source
    video, = source.glob("*.mp4")
    manifest = ASSETS / "manifest.json"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    for key, order in ORDERS.items():
        data["sets"][key] = build_set(source, video, key, order.split())
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
