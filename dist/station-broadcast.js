export const stationMusicFile=file=>file+(/^syutoken41/.test(file)?'.ogg':'.mp3');
const music=(file,platform=null)=>({file:stationMusicFile(file),platform});
const rows={};
const pair=(names,up,down)=>{for(const name of names.split(' '))rows[name]={up:typeof up==='string'?music(up):up,down:typeof down==='string'?music(down):down};};
pair('神田 御茶ノ水 四ツ谷 中野 高円寺 荻窪 西荻窪 吉祥寺 武蔵境 東小金井 国立 立川 日野 西八王子','ikst016-01','ikst016-02');
rows['東京']={up:null,down:music('ikst016-02',1),platforms:{1:'ikst016-02',2:'ikst016-01'}};
rows['新宿']={up:music('ikst016-01',8),down:music('ikst016-02',12),expressUp:music('ikst011-01',7),expressDown:music('ikst011-02',11),platforms:{7:'ikst011-01',8:'ikst016-01',11:'ikst011-02',12:'ikst016-02'}};
rows['中野'].platforms={6:'ikst016-02',7:'ikst011-01',8:'ikst016-01'};
pair('阿佐ケ谷','tanabata_d','tanabata_c');pair('三鷹',music('medaka_e',6),music('medaka_f',4));rows['三鷹'].platforms={3:'medaka_b',4:'medaka_f',5:'medaka_a',6:'medaka_e'};
pair('武蔵小金井',music('ikst016-01',4),music('sakurasakura_a',1));rows['武蔵小金井'].platforms={1:'sakurasakura_a',2:'sakurasakura_b',3:'ikst016-04',4:'ikst016-01'};
pair('国分寺',music('denshagokko_d',3),music('denshagokko_b',2));rows['国分寺'].platforms={1:'denshagokko_a',2:'denshagokko_b',3:'denshagokko_d',4:'denshagokko_c'};
pair('西国分寺','ichibanboshi_a','ichibanboshi_b');rows['東小金井'].platforms={1:'ikst016-01',2:'ikst016-04',3:'ikst016-02'};rows['国立'].platforms={1:'ikst016-02',2:'ikst016-04',3:'ikst016-01'};rows['立川'].platforms={3:'ikst016-01',4:'ikst016-04',5:'ikst016-03',6:'ikst016-02'};
pair('豊田','takibi_a','takibi_b');pair('八王子',music('yuuyake_b',2),music('yuuyake_a',4));rows['八王子'].platforms={2:'yuuyake_b',3:'yuuyake_d',4:'yuuyake_a'};
pair('高尾',music('ikst016-01',1),music('ikst012-02',4));rows['高尾'].platforms={1:'ikst016-01',2:'ikst012-01',3:'ikst016-02',4:'ikst012-02'};
pair('相模湖 藤野 上野原 四方津 梁川 鳥沢 猿橋 大月 初狩 笹子 甲斐大和 勝沼ぶどう郷 塩山 東山梨 山梨市 春日居町 酒折 竜王 塩崎 韮崎 新府 穴山 日野春 長坂 小淵沢','ikst012-01','ikst012-02');rows['初狩'].down=music('ikst012-01');
for(const name of ['相模湖','山梨市'])rows[name].platforms={1:'ikst012-02',2:'ikst012-08',3:'ikst012-01'};
rows['大月'].platforms={3:'ikst012-02',4:'ikst012-03',5:'ikst012-01'};rows['塩山'].platforms={1:'ikst012-02',2:'ikst012-04',3:'ikst012-01'};rows['竜王'].platforms={1:'ikst012-02',2:'ikst012-04',3:'ikst012-01'};
pair('石和温泉','takedabushi_b','takedabushi_a');pair('甲府',music('ikst012-01',2),music('ikst012-02',1));rows['甲府'].platforms={1:'ikst012-02',2:'ikst012-01',3:'ikst012-03'};
pair('富士見','kanno_bell_2','kanno_bell_2');pair('上諏訪 岡谷 村井 南松本 南小谷','kanno_bell','kanno_bell');
pair('茅野',music('nagano4_p1',1),music('nagano4_p2',2));rows['茅野'].platforms={1:'nagano4_p1',2:'nagano4_p2',3:'nagano4_p3'};
pair('下諏訪',music('nagano1_p1',1),music('nagano1_p2',2));rows['下諏訪'].platforms={1:'nagano1_p1',2:'nagano1_p2'};
pair('塩尻',music('ikst012-01',1),music('syutoken39-1',2));rows['塩尻'].platforms={1:'ikst012-01',2:'syutoken39-1',3:'ikst012-shiojiri',4:'syutoken39-4',6:'syutoken39-5'};
pair('松本',music('ikst012-matsumoto',1),music('syutoken39-1',3));rows['松本'].platforms={1:'ikst012-matsumoto',2:'syutoken39',3:'syutoken39-1',4:'syutoken39-2',5:'syutoken39-3',6:'syutoken40'};
pair('篠ノ井','watercrown','watercrown');pair('今井','ikst026-01','ikst026-02');pair('長野',music('old_music_box',3),music('spring_boxes',4));rows['長野'].platforms={3:'old_music_box',4:'spring_boxes'};
// User confirmed all electronic bells share this supplied recording.
pair('広丘 平田 すずらんの里 川中島 安茂里 豊科 穂高 信濃大町 白馬 信濃森上','bell(tokyu)','bell(tokyu)');
pair('明科','nagano2','nagano2');
// Current Ome/Itsukaichi station melodies (user-supplied recordings, 2026 usage).
pair('西立川 東中神 中神 昭島 牛浜 福生 羽村 小作','syutoken41-1','syutoken41');
pair('拝島',music('syutoken41-1',3),music('syutoken41',2));rows['拝島'].platforms={1:'syutoken41-6',2:'syutoken41',3:'syutoken41-1'};
pair('河辺',music('syutoken41-1',1),music('syutoken41',2));rows['河辺'].platforms={1:'syutoken41-1',2:'syutoken41',3:'syutoken41-2'};
pair('東青梅','syutoken41-3','syutoken41-3');
pair('青梅',music('syutoken41-5',4),music('syutoken41',1));rows['青梅'].platforms={1:'syutoken41',2:'syutoken41-1',3:'syutoken41-4',4:'syutoken41-5'};
pair('東秋留 秋川 武蔵増戸','syutoken41-1','syutoken41');pair('熊川','syutoken41-7','syutoken41-7');pair('武蔵引田','syutoken41-8','syutoken41-8');
rows['武蔵五日市']={up:music('syutoken41-1',1),down:null,platforms:{1:'syutoken41-1',2:'syutoken41'}};
Object.assign(rows['立川'].platforms,{1:'syutoken41',2:'syutoken41-1'});
const ome='立川 西立川 東中神 中神 昭島 拝島 牛浜 福生 羽村 小作 河辺 東青梅 青梅 宮ノ平 日向和田 石神前 二俣尾 軍畑 沢井 御嶽 川井 古里 鳩ノ巣 白丸 奥多摩'.split(' ');
const itsukaichi='拝島 熊川 東秋留 秋川 武蔵引田 武蔵増戸 武蔵五日市'.split(' ');
const missing={};
const central='東京 神田 御茶ノ水 四ツ谷 新宿 中野 高円寺 阿佐ケ谷 荻窪 西荻窪 吉祥寺 三鷹 武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川 日野 豊田 八王子 西八王子 高尾 相模湖 藤野 上野原 四方津 梁川 鳥沢 猿橋 大月 初狩 笹子 甲斐大和 勝沼ぶどう郷 塩山 東山梨 山梨市 春日居町 石和温泉 酒折 甲府 竜王 塩崎 韮崎 新府 穴山 日野春 長坂 小淵沢 信濃境 富士見 すずらんの里 青柳 茅野 上諏訪 下諏訪 岡谷 みどり湖 塩尻 広丘 村井 平田 南松本 松本 田沢 明科 西条 坂北 聖高原 冠着 姨捨 稲荷山 篠ノ井 今井 川中島 安茂里 長野'.split(' ');
const oito='松本 北松本 島内 島高松 梓橋 一日市場 中萱 南豊科 豊科 柏矢町 穂高 有明 安曇追分 細野 北細野 信濃松川 安曇沓掛 信濃常盤 南大町 信濃大町 北大町 信濃木崎 稲尾 海ノ口 簗場 ヤナバ前 南神城 神城 飯森 白馬 信濃森上 白馬大池 千国 南小谷'.split(' ');
export const STATION_BROADCAST_ROWS=rows;export const MISSING_STATION_MELODIES=missing;
const yamanoteRows={};
for(const n of '東京 有楽町 新橋 浜松町 田町 品川 大崎 五反田 目黒 渋谷 原宿 代々木 新宿 新大久保 目白 大塚 巣鴨 駒込 田端 西日暮里 日暮里 鶯谷 上野 御徒町 秋葉原 神田 池袋 高田馬場 恵比寿 高輪ゲートウェイ'.split(' '))yamanoteRows[n]={outer:'ikst010-02',inner:'ikst010-01'};
for(const [n,a,b]of [['神田','mondamin_a','mondamin_b'],['鶯谷','seseragi','haru_tremolo'],['田端','seseragi','ikst010-01'],['日暮里','seseragi','ikst010-01'],['駒込','sakurasakura_a','sakurasakura_b'],['池袋','bigcamera_b','bigcamera_d'],['高田馬場','tetsuwanatom_a','tetsuwanatom_b'],['恵比寿','thirdman_e','thirdman_f'],['高輪ゲートウェイ','glorious_gateway_b','glorious_gateway_a']])yamanoteRows[n]={outer:a,inner:b};
yamanoteRows['大崎'].platforms={1:'ikst010-01',2:'ikst010-03',3:'ikst010-02',4:'ikst010-05'};yamanoteRows['池袋'].platforms={5:'bigcamera_a',6:'bigcamera_b',7:'bigcamera_c',8:'bigcamera_d'};
export const YAMANOTE_BROADCAST_ROWS=yamanoteRows;
function yamanoteCue(route,station){const row=yamanoteRows[station.name];if(!row)return null;const dir=route.reverseDirection?'inner':'outer',platform=Number(station.departurePlatform??station.platformNumber??station.platform),file=(row.platforms?.[platform]??row[dir])+'.mp3';return {file,station:station.name,direction:dir,embeddedAnnouncement:false,refs:[{entryIndex:'station-broadcast:yamanote:'+file,driverVoiceFile:'./assets/station-broadcast/east/yamanote/'+file,mixCategory:'se'},{entryIndex:'station-broadcast:sample',driverVoiceFile:'./assets/station-broadcast/east/voice/sample.mp3',mixCategory:'voice'}]};}
export function stationDepartureCue(route,station){
 if(route?.id==='yamanote')return yamanoteCue(route,station);
 if(!/^(chuo|shinonoi|oito|tatsuno|suwa-nagano|ome|itsukaichi)/.test(route?.id??''))return null;
 const all=route.sceneryStations??route.stations??[],at=all.findIndex(st=>Math.abs(st.s-station.s)<1),adjacent=[all[at-1]?.name,all[at+1]?.name],isOito=route.id==='oito'||adjacent.some(n=>oito.includes(n)&&n!=='松本'),isItsukaichi=/itsukaichi/.test(route.id)||all.some(st=>itsukaichi.includes(st.name)&&st.name!=='拝島'),isOme=isItsukaichi||/ome/.test(route.id)||all.some(st=>ome.includes(st.name)&&!['立川','拝島'].includes(st.name)),order=isOito?oito:isItsukaichi&&itsukaichi.includes(station.name)?itsukaichi:isOme&&ome.includes(station.name)?ome:central,rank=order.indexOf(station.name);
 let down=!route.reverseDirection;const next=all.slice(at+1).find(st=>order.includes(st.name)),prev=all.slice(0,Math.max(0,at)).findLast(st=>order.includes(st.name));if(rank>=0&&next)down=order.indexOf(next.name)>rank;else if(rank>=0&&prev)down=rank>order.indexOf(prev.name);
 const row=rows[station.name];if(!row)return null;
 // Station switches are no longer used on the Ome–Okutama one-man section.
 if(order===ome&&((rank>ome.indexOf('青梅'))||(station.name==='青梅'&&down)))return null;
 const explicit=station.departurePlatform??station.platformNumber??station.platform,platform=Number(explicit),express=(route.service??'').includes('特急');
 if(Number.isFinite(platform)&&row.missingPlatforms?.[platform])return null;
 let cue=Number.isFinite(platform)&&row.platforms?.[platform]?music(row.platforms[platform],platform):row[express?(down?'expressDown':'expressUp'):'']??row[down?'down':'up'];
 if(isOme&&station.name==='立川'&&!Number.isFinite(platform))cue=down?music('syutoken41',1):music('ikst016-01',3);
 if(isItsukaichi&&station.name==='拝島'&&!Number.isFinite(platform))cue=music('syutoken41-6',1);
 if(isOito&&station.name==='松本'&&!Number.isFinite(platform))cue=music(express?'syutoken39-2':'syutoken40',express?4:6);
 if(!cue)return null;const embedded=/^nagano[14]_/.test(cue.file);
 const ref=(file,category)=>({entryIndex:'station-broadcast:'+file,driverVoiceFile:'./assets/station-broadcast/east/'+file,mixCategory:category});
 return {...cue,station:station.name,direction:down?'down':'up',inferredPlatform:!Number.isFinite(platform),embeddedAnnouncement:embedded,refs:[ref('chuo/'+cue.file,'se'),...(embedded?[]:[ref('voice/sample.mp3','voice')])]};
}
