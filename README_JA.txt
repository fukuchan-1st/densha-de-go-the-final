RAILWAY DRIVE v41 — HTML / CSS / JavaScript版

index.html が路線・列車選択画面です。
tohoku.html が東北本線の運転画面です。
HTML、CSS、JavaScript、画像、音声、路線データをすべて同梱しています。
React等のフレームワークやビルド作業、ゲーム本体の再読み込みは不要です。

編集する主なファイル
・index.html / tohoku.html — 画面の構成
・final-ui.css / driving-overlay.css — メニューと運転UIの見た目
・final-app.js / app.js — 運転・画面操作
・driving-overlay.js — 縦型マスコン
・final-world.js / scene.js — 3D表示
・assets/ — 車両・路線・画像・音声・ライブラリ

動作確認
JavaScriptモジュールとデータの読み込みを使うため、HTMLをダブルクリックするだけでは起動できません。
静的サイトのホスティングへフォルダー一式を置くか、VS CodeのLive Server等のローカルWebサーバーでindex.htmlを開いてください。
PythonがインストールされているPCでは、展開したフォルダーで次のコマンドでも確認できます。
  python -m http.server 8765
  http://127.0.0.1:8765/

外部のビルドサービスやAPIキーは不要です。
音声はブラウザーの制約で最初の操作後から有効になります。
元データと同梱ライブラリの出典・利用条件は保持してください。
