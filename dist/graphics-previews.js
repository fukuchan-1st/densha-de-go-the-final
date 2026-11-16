export function graphicsComparisonMarkup(){
 const modes=[['light','簡易表示','影なし・負荷を抑える'],['standard','通常表示','従来の影・動く雲'],['high','高画質','柔らかな影・接地の濃淡・光のにじみ']];
 return '<section class="graphics-comparison" aria-label="描画方式の比較画像"><h2>描画の見え方</h2><p>同じ車両・場所・時刻の比較用シーン</p>'+modes.map(([id,name,description])=>`<figure data-preview-quality="${id}"><img src="./assets/graphics-previews/${id}.jpg" width="960" height="540" alt="${name}の描画例：${description}"><figcaption><strong>${name}</strong><small>${description}</small></figcaption></figure>`).join('')+'</section>';
}
