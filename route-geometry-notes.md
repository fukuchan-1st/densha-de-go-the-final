# 黒磯→新白河の地図から取得した線形

`dist/assets/route-geometry.json` はOpenStreetMapの在来線レール形状に基づく。新幹線、側線、ヤードを除き、1067 mmの連続した西側本線を抽出した。

293点の配列 `points` は `[営業距離m, 東方向m, 北方向m]`。黒磯は `[0,0,0]`、新白河は `[22100,11394.2095,17008.4136]`。横方向の座標には地図の実際の曲がり方を保持している。

駅位置はOSMの駅ラベルノードを本線へ投影して求めた。黒磯・高久・黒田原・豊原・白坂・新白河の6駅は、RailLabの累積距離 `0 / 4000 / 8200 / 13400 / 18700 / 22100m` に合わせた。駅間の距離軸だけを線形に校正しており、横方向の形状は動かしていない。元の駅間ポリライン長合計は22108.546m。駅ラベルと本線の距離は6.7〜30.8m程度で、運転士の実際の停止位置とは異なる。

これは地図から得た水平線形であり、設計図面による正確な曲線半径、カント、縦断勾配、信号配置、実際の制限速度を含まない。OSMの点をつないだ形状のため、表示では点間を滑らかにつなぐ必要がある。元の点の間隔は最大456.8m、単一頂点の最大方向変化は約9.73度。

元データは `dist/assets/osm-railways-source.json` と `dist/assets/osm-stations-source.json` に保存。取得時のOSMタイムスタンプ、Overpassクエリー、採用したWay ID、駅ノードID、区間ごとの校正係数をJSONのmetadataに保持した。

検証：距離軸の厳密な単調増加、6駅の制御点、接続した一筆書きの本線を確認。データには地図外からの直線ジャンプや上下線間の乗り移りを含めていない。

## 出典・ライセンス

© OpenStreetMap contributors. Open Database License (ODbL) 1.0。

- 地図データと帰属表示：[OpenStreetMap copyright](https://www.openstreetmap.org/copyright)
- ODbL全文：[Open Data Commons](https://opendatacommons.org/licenses/odbl/1-0/)
- 営業距離：[RailLab 東北本線](https://raillab.jp/transport/39)

画面上またはアクセスしやすい情報画面に、`© OpenStreetMap contributors` と上記copyrightリンクを表示すること。
