# Tobu/Aizu route import (v114)

New distributable files are `dist/tobu-routes.js`, four `*-route.json` assets (tobu-skytree, tobu-nikko, tobu-kinugawa, aizu), four corresponding `*-geography.json.gz` assets, and `tobu-hibiya-bve-profile.json`.

`loadTobuRouteParts()` loads the four horizontal OSM routes and their mapped roads/buildings. `assembleTobuRoutes(parts, loadedOriginalYagan)` returns `{ main, nikko }`: main id `tobu-aizu` covers 浅草→会津田島; nikko id `tobu-nikko` covers 南栗橋→東武日光. Load the original yagan road/building assets before calling this function. Existing yagan asset and saved progress identifiers are untouched.

The combined main route measures 191120.856 m and has 73 stations; the Nikko slice measures 84352.183 m and has 23 stations. These are lengths of mapped rail geometry, not published tariff kilometres. The original yagan section retains its supplied BVE chainage (30773 m). The main path contains no synthetic circular sections or straight connections between station labels: station positions are projections onto connected mapped rails. Maximum station label offsets are 41.783/66.163/23.117/25.586 m for the four new segments.

The assets contain OSM bridge/tunnel spans, actual main-track count sections (including 北千住→北越谷 quadruple track and 鬼怒川温泉→鬼怒川公園 double track), and GSI terrain-derived estimated elevation. GSI elevations are smoothed over 700 m, with tunnel portal interpolation and a ±35 per mille gradient cap. They are not surveyed rail levels. Platform sides, loop lengths, and default stop positions remain approximations.

`applyTobuHibiyaPlatform(route)` is intended only for a Hibiya-line 70000 service. It applies 北千住3階6番線, a 10.7 m elevated approach/departure approximation, and the explicit 60/65 km/h restrictions found in the user-provided ARATobu MapB. Select it for the canonical northbound route before slicing/reversal; existing route transforms then preserve the station and elevation metadata in the service direction. Normal 浅草-origin main-line services should retain the ground-level main-line platform.

Local source `OneDrive/Desktop/ARATobu-main/ARATobu-main/Scenarios/東武伊勢崎線下り/MapB.txt` covers 北千住→西新井 only. Its controls are preserved separately in the BVE profile asset. `OneDrive/Desktop/整理/folder/dengo_thef/data/AizuKinugawa/Map_0805.txt` includes the already imported 新藤原→会津高原尾瀬口 section; no further Aizu-Tajima BVE extension was provided. No original meshes/textures/audio were copied by the route import.

Rebuild order: `extract-tobu114.py`, `import-tobu114.py`, `tobu-dem114.py`, `tobu-geography114.py`, `extract-tobu-bve114.py`. The retained regional Geofabrik PBFs and extraction cache stay outside the distributable.

Integration: preserve preloaded `route.mappedBuildings` in `loadMappedBuildings` instead of fetching an absent combined-id asset. The helper preloads roads and clears `roadAsset` before joining, so shared road loaders do not need new registration. Source attribution is retained in every geographic asset and route sources.
