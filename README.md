# RAILWAY DRIVE — 5路線 運転乗務

16:9のメニュー・運転表示を、実際に起動した電車でGO！FINALのトップメニュー・路線選択を参考に作り替えました。黄文字の見出し、青緑のパネル、赤い選択矢印、段違いの路線リストを採用した独自デザインです。ゲームのロゴ・画面素材・モデルは同梱していません。

|路線|車両|区間・延長|停車駅数（出発後）|
|---|---|---|---|
|山手線|E235系・11両（試作設定）|東京→品川→渋谷→新宿→上野→東京・34.5km|30|
|中央線|E233系0番台・12両|東京→高尾・53.1km|23|
|大阪環状線|323系・8両|大阪→京橋→天王寺→西九条→大阪・21.7km|19|
|東海道線|207系2000番台・7両|京都→大阪→神戸・75.9km|32|
|東北本線|701系1500番台・2両|黒磯→郡山→福島・109.5km|23|

いずれも各駅停車。中央線は快速線の駅をすべて停車対象にし、高円寺・阿佐ケ谷・西荻窪にも停車します。途中の駅からも開始できます。東北本線も同じ路線一覧に並び、「運転をはじめる」で選んだ駅から701系の運転画面が開きます。

サイト版とPC版は、解凍済み車両から取り込んだ運転台・計器・収録音を運転開始前に自動で準備します。走行音は速度と線路の場面に応じて切り替え、モーター音は提供データの速度・力行・制動の設定を使います。E235系は起動時のモーター音を、E233系は提供された走行音と効果音を使用します。発車合図は東北本線と共通です。

ノッチは車両別で、E235/E233がP5・B8、323がP5・抑速＋B7、207がP6・B8です。S/↓でP側、W/↑でEB側、XでN、SpaceでEB、Hで警笛。ドア開閉でノッチを変えません。戸開中・戸閉中は力行しません。停車±3mで3秒停止後に戸開、15秒待って合図音・戸閉音を再生し、戸閉音終了後に戸閉灯が点灯します。最初の駅は戸開状態で即座に合図音から開始。±10mマーカー・5m以下cm表示・揺れ強度設定を引き継ぎました。

カーブ・駅位置はOSM線路座標と営業キロを対応付けた独自試作で、FINALのマップを移植したものではありません。ゲームの非暗号化map.datも読み取りましたが、分岐・単位・停止位置を確定できず採用していません。新4路線のホーム・建物・停止位置は概略、勾配は0‰、実際の線路速度制限は未取得です。「車両上限」を表示し、未取得の線路制限は表示しません。OSMに付いた橋・トンネル区間の概略構造物は描画しますが、実寸・標高の再現ではありません。

3Dは周辺の区間だけを生成し、過ぎた区間を破棄します。タッチ端末は軽量設定を初期値にし、PC・iPad・iPhoneで押せる大きさのボタンと固定16:9映像を分けています。実物のiPad/iPhoneのSafari上のフレームレートは未検証です。

路線出典は `dist/assets/final/route-data-notes.md`、車両読み込みの詳細は `vehicle-import-notes.md`。開発・検証は `npm start` / `npm test`。ローカル配布版の起動は下記と同じです。

### 路線ボタンの生成指示

組み込みの画像生成ツールを使用しました。東北本線は `cddata/menu/menu_mem_us.dat` 内の枠素材を参照し、残り4路線は生成した東北本線ボタンをデザインの参照にしました。5つの画像は `dist/assets/final/` にあります。

- `tohoku-route-button-v25.png`

  Use case: ui-mockup. Create a single wide rectangular route-selection button background for an early-2000s Japanese train simulator. Refer to the provided extracted game sprite sheet for the simple beveled frame and left thumbnail inset (especially sprite 428), and to the JR East 701 series commuter train design: silver stainless steel, dark windshield, centered end door, broad green stripe with a thin red accent. The button spans the full image edge to edge, target visible aspect about 6.5:1; all key detail is along the central horizontal band so the art can be center cropped to this shape. At the far left, in the leftmost 23 percent, show a close three-quarter front view of that two-car train on a rural northern Japan platform. Across the remaining 77 percent keep the area quiet, deep near-black green with subtle brushed-metal gradient, for real UI text added later. Thin silver and muted turquoise retro bevel around the tile, subtle 2004 game menu texture. No writing, letters, symbols, logos, watermark, exterior scene outside the tile, or separate icons. One continuous UI texture.
- `yamanote-route-button-v25.png`

  Create one route selection button background for a retro Japanese train simulator, matching the attached Tohoku button asset as closely as possible in layout, scale and visual style. The attached image is a design template. Preserve the full-width horizontal silver and muted turquoise beveled frame centered vertically, the thin vertical separator at exactly 25% width, the near-black brushed green fill in the right 75%, and black padding above and below, using the same 3:1 overall canvas and 5.5:1 button frame. Replace only the small photographic train vignette in the left inset. JR East E235 series Yamanote Line. Its modern flat full-width dark windshield face has a prominent lime green forehead panel and lime green vertical door bands on its stainless sides. Show the train at a Tokyo urban platform. Match the reference vignette's three-quarter front camera angle and headlight realism. The right-hand text area must be empty for live HTML text. No writing, logos, badges, watermark or extra buttons.
- `chuo-route-button-v25.png`

  Create one route selection button background for a retro Japanese train simulator, matching the attached Tohoku button asset as closely as possible in layout, scale and visual style. The attached image is a design template. Preserve the full-width horizontal silver and muted turquoise beveled frame centered vertically, the thin vertical separator at exactly 25% width, the near-black brushed green fill in the right 75%, and black padding above and below, using the same 3:1 overall canvas and 5.5:1 button frame. Replace only the small photographic train vignette in the left inset. JR East E233 series 0 subseries Chuo Line. Stainless commuter train with a bright vermilion-orange horizontal stripe, rounded dark front windscreen, on an open Tokyo suburban platform. Match the reference vignette's three-quarter front camera angle and headlight realism. The right-hand text area must be empty for live HTML text. No writing, logos, badges, watermark or extra buttons.
- `osaka-route-button-v25.png`

  Create one route selection button background for a retro Japanese train simulator, matching the attached Tohoku button asset as closely as possible in layout, scale and visual style. The attached image is a design template. Preserve the full-width horizontal silver and muted turquoise beveled frame centered vertically, the thin vertical separator at exactly 25% width, the near-black brushed green fill in the right 75%, and black padding above and below, using the same 3:1 overall canvas and 5.5:1 button frame. Replace only the small photographic train vignette in the left inset. JR West 323 series Osaka Loop Line. Stainless commuter train with a wide charcoal face, orange front and side accents, on a covered Osaka urban platform. Match the reference vignette's three-quarter front camera angle and headlight realism. The right-hand text area must be empty for live HTML text. No writing, logos, badges, watermark or extra buttons.
- `tokaido-route-button-v25.png`

  Create one route selection button background for a retro Japanese train simulator, matching the attached Tohoku button asset as closely as possible in layout, scale and visual style. The attached image is a design template. Preserve the full-width horizontal silver and muted turquoise beveled frame centered vertically, the thin vertical separator at exactly 25% width, the near-black brushed green fill in the right 75%, and black padding above and below, using the same 3:1 overall canvas and 5.5:1 button frame. Replace only the small photographic train vignette in the left inset. JR West 207 series 2000 subseries. Stainless commuter EMU with a central gangway door and paired front windscreens, a deep navy blue stripe with a slim orange accent, on a Kyoto-Osaka area commuter platform. Match the reference vignette's three-quarter front camera angle and headlight realism. The right-hand text area must be empty for live HTML text. No writing, logos, badges, watermark or extra buttons.

---

## 東北本線701系の運転

# 東北本線 701系運転プロトタイプ：黒磯〜福島

黒磯から福島まで、109.5km・24駅（出発後23駅停車）を運転できます。メニューの「出発駅」で新白河・郡山・南福島などから途中開始もできます。

## 起動

「起動する.cmd」をダブルクリックしてください。Pythonが必要です。ブラウザーでローカルページを開きます。終了はサーバーのウィンドウを閉じます。配布フォルダーだけで動き、走行時のインターネット接続は不要です。

開発用：このフォルダーで `npm start`。検証は `npm test`。

## 操作

|キー|操作|
|---|---|
|S / ↓|P5方向へ1段|
|W / ↑|EB方向へ1段|
|X|惰行N|
|Space|非常EB|
|戸開閉|自動（通常のキー操作不要）|
|Esc|一時停止|

P1〜P5、B1〜B7・抑速・非常EB（15段）。停止位置±3m以内で3秒停車すると自動戸開します。戸開から15秒待ち、黒磯ではkuroiso.mp3、白河ではshirakawa.mp3を最後まで再生し、続いてユーザー提供の「My Song 2.wav」（約1.49秒）のホイッスルを最後まで再生して戸閉音を再生し、その全再生終了後に戸閉状態を確定・戸閉灯点灯・力行許可します。他駅はホイッスルのみです。すべての開始駅では最初から戸開状態で、運転画面を表示したら待ち時間なしで発車音声を自動再生して戸閉します。黒磯・白河は駅音声→ホイッスル、他の開始駅はホイッスルのみで、出発駅を到着実績へ加算しません。通常の到着後は戸閉後に次駅へ進みます。動き出したり±3mを外れると戸開待ちはリセット。範囲外ではドアは開きません。戸開・乗降待ちは走行の時間倍率に左右されない実時間で、一時停止中は待ち時間と音声再生も止まります。音声の再生に失敗した場合は開扉したまま再試行を案内します。停止位置までの距離は5m以下でcm表示（例：0.5m→50cm、5m→500cm）に切り替え、行き過ぎにも適用します。停車アシスト、時間倍率1/3/10、前面展望、音量調整、前駅から再開に対応。福島の終点まで運転すると結果を表示します。

## 停止マーカー・表示

メニュー・3D・運転台を1600×900の16:9固定レイアウトで均等に拡大縮小し、異なる画面比率では上下または左右に黒帯を表示します。

映像の右端に細い緑の停止バーを配置。黄色地・赤枠のひし形は停止位置の±10mに入ると表示され、10m手前で緑の帯の上端、停止位置で中央、10m行き過ぎで帯の下端へと、上から下に動きます。範囲外ではひし形を非表示にします。前方の「力行中」等の案内カードは廃止し、操作結果は下部に表示します。

## 路線とデータの範囲

- 駅間距離：[RailLab](https://raillab.jp/transport/39)の黒磯〜福島109.5km。駅の一覧は `dist/assets/route-stations.json`。
- 平面線形：[OpenStreetMap](https://www.openstreetmap.org/copyright)の在来線本線座標1330点。駅間ごとに営業キロへ校正し、既存の黒磯〜新白河293点はそのまま保持。三次Hermite補間で線路をつなぎます。測量に基づく厳密な曲線半径や駅構内配線ではありません。
- **黒磯〜新白河0〜22.1km**：提供BVEデータから勾配81点・速度切替43点、主要構造物7件を参照。元がE531系用のため曲線＋10km/hは採用せず、701系の上限110km/hで抑えています。BVEと営業キロの差を6駅で校正しています。
- **新白河以北〜福島22.1〜109.5km**：地図と動画を参考にした試作区間。実際の勾配・常設速度制限は未確認です。勾配0‰・仮の車両上限110km/hを使用し、その旨を運転画面に表示します。BVE終点の下り勾配や20km/h制限を北へ引き延ばしていません。高さは新白河の相対高さから仮に一定とします。
- 車両性能：[指定の701系記事](https://ja.wikipedia.org/wiki/JR東日本701系電車)を基準に起動2.1km/h/s、常用・非常3.6km/h/s、最高110km/h。高速域の引張力低下・抵抗・ノッチ配分は試作の仮定です。
- トップ画面はユーザー提供のJR-east-701-1500(F2-510).jpg。運転台はユーザー指定Aki_N/PanelのPanel_19.txt（クモハ701-19・非ワンマン）の実画像を使用。背景4タイルとcommonの速度・圧力針を同じ座標変換で描画し、元のLocation/Origin/Radiusで回転軸を計器中心に合わせています。昼夜画像と戸閉灯・ブレーキ表示を使用します。走行性能の1500番台設定とは別の運転台バリエーションです。

## 動画を参考にした景観

[黒磯〜福島の前面展望](https://www.youtube.com/watch?v=FMLp1KOVSn0)と[701系の黒磯〜郡山前面展望](https://www.youtube.com/watch?v=8pTJ6NeF0GY)から実フレーム22枚を抽出・目視し、田畑・草地、駅近くの住宅、郡山・福島への接近時に線路や建物が増える傾向を参考にしています。現作は晴れ・緑の景観で、冬動画の積雪色は転用していません。

駅のホームは駅別データで配置し、黒磯〜新白河はBVEのホーム開始・終端と線路間隔・側線を参照、新白河以北は動画のホーム側とOSMの線路頂点を使用します。建物・植物・上屋・跨線橋の形状は近似です。動画をそのまま映像として再生するものでも、すべての建物を同じ位置に再現したものでもありません。実際に見た時刻・観察内容は `video-reference-notes.md` を参照してください。

## 構造物

既存BVE区間にはトンネル1、鉄橋2、道路跨線橋1、駅跨線橋1、切通し1、川1を収録。追加区間では選択した本線のOSM明示タグから橋38区間・トンネル3区間を抽出し、簡略3Dを配置しています。追加区間の構造物寸法や高さ・坑門の形式は測量値ではなく、仮の断面です。短いtunnelタグの区間も含みます。構造物のある場所では植物や架線柱が内側に入り込まないよう調整します。

## 音と計算

Motor音は提供701soundpack.zipの25 OGGと元RTMスクリプトの速度別ピッチ・音量・ノッチ別フェードを維持。Motor以外の既存RTM音は再生せず、指定Aki_N/soundのMc701-19.txtを参照し、22 WAV（ドア左右のうち左、戸閉灯リレー、マスコン、制動ハンドル、空気排気、警笛、MG、Run、軋り・摩擦）を使用。黒磯・白河のMP3とMy Song 2.wavのホイッスルも維持。Runは通常・橋・トンネルで切替え、速度に応じたピッチ・音量は試作の近似。ATS・コンプレッサー等の未実装機能の音は鳴らしません。Hは警笛、Jは空気笛です。速度表の2点の間をなめらかにつないで、現在の速度に合う音程と音量を計算します。動画音声のコピー・差し替え・聴取比較による補正は行っていません。

勾配が確認できるBVE区間では、上りで重力ぶん加速を弱め、下りでは加速が増えます。停車アシストは保守的な減速目標を使い、±10mの範囲外から位置補正はしません。実際の信号連動・ATS-Ps・ダイヤ・カント・列車後端による制限解除は未再現です。黒磯から701系を運転する試作シナリオで、現在の営業運転の再現ではありません。

## 詳細資料・ライセンス

`route-geometry-notes.md`、`bve-profile-notes.md`、`bve-structures-notes.md`、`sound-analysis.md`、`video-reference-notes.md` に出典・校正方法・限界を記録しています。

地図データ・派生線形：© OpenStreetMap contributors、[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)。元OSMデータと数値JSONを同梱。Three.jsはMIT（assets/vendor/LICENSE）。写真・音源・提供BVEデータの権利は各権利者に帰属します。路線構造物の元BVEモデル・テクスチャや参考動画の画像・音声は配布資産に複製していません。運転台については今回の明示指定に従い、元PNGを無加工で同梱しています。詳細はcab-panel-notes.md。

操作できない自動ドアボタンは隠し、音声エラー時の再試行だけ表示します。戸開中の力行、ノッチ上限・下限でさらに同じ方向へ操作するボタン、現在NのときのNボタンも非表示。未収録の白石・仙台はメニューの路線項目から外し、収録終点の福島を表示します。

元パネルの制動表示は抑速・B1〜B7・非常の素材をそのまま使い、各ノッチに対応するコマを表示します。B8の独自表示は廃止し、原画像は変更しません。

抑速はNの一段上。投入時の速度を記憶し、下り坂では最大3.6km/h/sの範囲で回生制動を加え、その速度を超えないようにします。上り坂や平坦で速度が下がっても力行は追加しません。実車制御の厳密な再現ではなく試作の制御です。B1〜B7は常用7段として配分しています。

## 駅のホームと構内配線

駅ごとにホームの開始・終端、左右・島式の違い、幅、上屋、跨線橋を変更しました。固定の相手線路4mと全駅共通の左ホームは撤去しています。データは `dist/assets/station-layouts.json`、出典・判断と動画時刻は `station-layout-notes.md` に記録。駅の営業キロは既存のRailLab距離に合わせたまま、ホームと構内線の相対位置を修正します。

黒磯〜新白河はBVEのTrack位置・Railリピーター・ホーム命令を参照。豊原は右側の島式、黒磯は多線と2つの島式ホーム部分、新白河はBVEの左側のホームを優先します。新白河では古い動画とBVEの年代・配線が異なり、終端線を福島方面へ接続する試作上の処理があります。線路間隔の変化は描画しますが、BVEの曲線補間・番線・信号連動を完全に再現するものではありません。

新白河以北は動画の左右・駅の構成とOSMの線路形状を組み合わせます。ホーム寸法・停止目標と駅中心のずれ・建物の位置は概略です。動画の映像ファイル・フレームや元BVEの.xモデル・テクスチャはサイトと配布ZIPに含めていません。線路とホームの範囲には草木を置かず、架線・橋桁の幅も配線に合わせます。

## PC・iPad・iPhoneの操作レイアウト

運転映像と運転台は16:9のまま、操作ボタンを拡縮されない別パネルに配置します。PCの広い画面は運転台左下、iPadなどは画面下、iPhoneは縦向きで画面下・横向きで左右に操作を分けます。画面サイズ変更・回転・画面端の余白に合わせて再配置します。タッチ用の主要ボタンは最小44px、制動・N・力行はさらに大きく表示。ボタンが使えない時も他のボタンの位置が動かないよう枠を固定します。

キーボード操作は従来どおりです。画面の「警笛」「一時停止」「その他」から視点・メニュー・停車アシスト・時間倍率・やり直し・空気笛を操作できます。音声エラー時の再試行ボタンだけを表示する仕組みも維持します。画面外の操作パネルに速度・ノッチ・次駅・距離を表示し、iPhoneの小さな16:9画面を隠しすぎないようにしています。メニュー・出発駅選択・ダイアログも小画面ではネイティブサイズで表示します。

ブラウザーのPC・iPad・iPhone相当サイズで配置を確認します。実物のiPad/iPhoneのSafari上の処理速度やメモリ使用量を確認したものではなく、3D描画の軽量化は今回の変更には含みません。

## ノッチ保持と車体の揺れ

戸開・戸閉開始・戸閉音の終了時にノッチを変更しません。乗降中に操作したノッチも維持します。戸開・戸閉中の力行禁止は継続します。

走行速度に応じた上下・左右の揺れ、カーブ時の横傾き、実際の加減速に応じた前後の傾きを3D視点に加えます。ばねの応答で滑らかに追従し、停車後は収束、一時停止では静止します。運転台と操作ボタンは固定です。実車の測定値ではなく視覚的な近似表現です。「音量・設定」でなし・弱め・標準を選択し、ブラウザーに保存できます。
