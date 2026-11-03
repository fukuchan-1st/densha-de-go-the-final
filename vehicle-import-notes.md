# 4車両のPC版内蔵データ

PC版では、解凍済みのフォルダーを `python tools/install-vehicle-assets.py <trainフォルダー>` に渡してセットアップします。各素材を元の設定と照合して、アプリの `local-vehicles/` にコピーします。セットアップ後は「起動する.cmd」から開き、車両を選ぶと、運転画面を表示する前に計器と走行音を準備します。以下は元ZIPとの照合機能と車両描画の開発資料です。

`dist/assets/final/vehicle-recipes.json` は元データのバイナリを含まない数値設定とZIP参照です。元PNG/WAV/DLLはホスティングに入れていません。ブラウザーは利用者が選んだ元ZIPを手元で読みます。アップロードはしません。

## API

```js
import {loadVehicleRecipes,LocalTrainPack,LocalCabPanel,LocalTrainAudio} from './final-vehicle.js';
const {trains}=await loadVehicleRecipes();
const recipe=trains.find(t=>t.id==='e235');
const pack=await LocalTrainPack.open(fileInput.files[0],recipe);
const panel=await LocalCabPanel.load(canvas,recipe,pack);
const audio=await LocalTrainAudio.create(recipe,pack,{volume:.65});
// Camera off-axis origin (1600x900 logical game frame): panel.viewOrigin
panel.render({v:20,notch:3,doors:false,elapsed:100},dt,inTunnel);
audio.update(72,3,dt,{surface:'long',doors:false});
const actuallyFinished=await audio.playEffect('close');
await audio.setPaused(true);
// Teardown: await audio.dispose(); panel.dispose(); pack.dispose();
```

Effect names: `open`, `close`, `hornPrimary`, `hornSecondary`, `notch`, `relayOn`, `relayOff`, `air`. Missing effects return false. Close resolves only at audio end; cancellation returns false. Loop playback is lazy, motor volume/pitch columns interpolate nonempty velocity knots from original tables. No motor synth/701 audio is substituted for absent source motor files. E235 has only startup motor sound. E233 ZIP has no motor waveforms.

`sourceSpecs` records supplied source formation. `playableSpecs` is the browser prototype choice; E235's Yamanote 11-car/3.0km/h/s is an explicit approximation, distinct from source Yokosuka 15-car/Tc settings. E233-0 uses provided12car,323eightcar,207sevencar;207'sP6 and323'sholding notch are retained.

Panel elements use original BVE pixel locations, needle anchors, radii, angles and digital sprite intervals. All source coordinates remain in metadata; fixed16:9 crops are `PANEL_CROPS`. Images are keyed and downsampled to game display resolution, retaining original logical image sizes and needle centers. Unknown ATS plugin indications remain hidden; native plugin safety logic is not emulated. 207 speedometer uses exact non-linear SpeedoMeter.csv angle knots, not the raw ATS0..360000 scale.

ZIP verification checks original archive size and entry count, central/local signatures, byte filename, compression method, local offset, expected compressed/uncompressed size and CRC32 of decoded bytes. Native deflate-raw is preferred; bundled official fflate0.8.3(MIT) is the compatibility fallback. Encrypted/multidisk/ZIP64 archives are not accepted. Output size capped80MiB per selected file. Only selected image/audio refs are extracted; DLL/EXE are never loaded.

## Source limitations and author terms

- E235: nagi's Readme says trial release, borrowed author assets, TC specification with startup-only motor audio. Only kura15car formation is supplied; tou(Yamanote) panel settings are supplied separately.
- E233: SotoHane source PDF prohibits unapproved secondary use/redistribution. Current source0series options are12car/8car/4car, with performance curves but no motor waveforms.
- 323: 南條 source PDF prohibits unauthorized reposting/upload. 8cars, P5, holding+B7, source directory identifies2.8km/h/s. The simplified force/mass quotient in metadata is not an authoritative measured acceleration.
- 207: 3notch source PDF expressly prohibits unapproved modification/reuse/redistribution and modified-dataSNSposting. Local personal source inspection here does not establish wider redistribution permission.

Selected offline extracted files stay under `work/final-redesign/vehicles/` for user-local inspection only. Do not copy those PNG/WAV into dist or a hosted package.

## Checks

5 module tests pass: modified ZIP rejection/CRC, ref-only import/noDLL references, source/playableformation distinction and notch counts, all original needle centers with16:9crops, velocity interpolation. `check-original-zips.mjs` additionally reads one original panel and door WAV from each of the four source ZIPs using slice-only filesystem reads and passes CRC/signature checks. Actual browser panel rendering should be checked by the owning agent before publication.
