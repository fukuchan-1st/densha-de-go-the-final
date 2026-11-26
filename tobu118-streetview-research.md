# v118 沿線調査と実装範囲

確認日：2026年11月26日。Google MapsとGoogle Street Viewは代表地点の目視確認に使用。画像やGoogleの建物輪郭をゲーム素材へ複製していません。棟数と描画位置は別途OpenStreetMapデータから取得しています。

| 地点 | 確認した画像 | 観察した特徴 | 実装への反映 |
|---|---|---|---|
| 東武浅草駅・花川戸 | Google Street View、2022年8月、35.712062/139.7977061、pano `1ydzdbS3pP2xTK-JaMMKpg` | 商店と中層建物が連続し、奥の街区にも建物が続く。線路付近だけの狭い描画帯では空白が目立つ。 | 実OSM建物の取得帯を左右500mへ拡張。建物の階数・高さタグがない場合は推定のまま表示。 |
| 鬼怒川温泉駅前 | Google Street View、2024年6月、36.8232401/139.7159327、pano `IwW1cwEao1l4rDONyEnb8A` | 駅前広場の背後に連続した森林の山並み。浅草のような一様な市街地密度ではない。 | GSI標高断面の実斜面とOSM森林を描画。駅前・谷・山の高低差を区別。 |

参照：[浅草のStreet View](https://www.google.com/maps/@?api=1&map_action=pano&pano=1ydzdbS3pP2xTK-JaMMKpg)、[鬼怒川温泉のStreet View](https://www.google.com/maps/@?api=1&map_action=pano&pano=IwW1cwEao1l4rDONyEnb8A)。撮影日が現在の街並みと異なる可能性があります。

実装の対象は今回追加した東武スカイツリー・日光・鬼怒川・会津区間、および既存野岩区間の自然地形です。全路線の全地点をStreet Viewで確認したものではありません。東方鉄道の架空景観、Claudeによるv117までの運転・音声・ダイヤの変更は保持します。

建物数は `tobu118-building-stats.json`、自然地形の出典・近似条件は `tobu118-natural-notes.md` に記録。標高断面25,883点、川の実形状、森林と農地の配置を使用。橋の水位・未記録建物の高さ・個々の樹木は実測値ではありません。
