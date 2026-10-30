importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.sound);
importPackage(Packages.jp.ngt.ngtlib.io);

function onUpdate(su) {
    onUpdate_RSM2(su);
}

//ここから下のプログラムをコピペしてonUpdate(su)にonUpdate_RSM2(su);を記述することで別のスクリプトに移植できます。
//##### 定数 #####

//音量フェードの時間の長さを設定します 単位:tick
var PowerFadeTime = 5;

//音量フェードの開始時間を遅らせます 単位:tick
var PowerFadeDelay = 0;

//トンネル走行音のフェードの時間の長さを設定します 単位:tick
var TunnelFadeTime = 10;

//ブレーキ緩解音を再生する車両の速度の上限を設定します
//回生ブレーキなど、走行中に緩解音を鳴らしたくない場合は1.0などに設定します  単位:km/h
var AirBrakeMaxSpeed = 1.0;

//##### データ #####
var SoundTrackData = [{"pitch":[[0,1],[1,1],[1.2,1],[1.8,1]],"volume":[[0,0],[0.1,0.3],[0.6,0.3],[1,0.3],[1.8,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"motor0.ogg"},{"pitch":[[3,0.625],[4.8,1],[6.5,1.354167]],"volume":[[0,0],[3,0],[4,0.8],[5,0.8],[5.2,0.8],[5.4,0.8],[5.6,0.8],[6.32,0.8],[6.34,0.8],[6.5,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"motor1.ogg"},{"pitch":[[0,0.5],[0.3,0.5],[1,0.5],[1.2,0.5],[1.9,0.5],[2,0.55],[4,1.325]],"volume":[[0,0],[2.5,0.8],[3,0.8],[4,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"motor2_F.ogg"},{"pitch":[[21.1,0.91342],[23.1,1],[24,1.038961]],"volume":[[0,0],[21.1,0],[21.3,0.8],[21.5,0.8],[22,0.8],[22.1,0.8],[24,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"motor3_F.ogg"},{"pitch":[[13.6,0.937931],[14.5,1],[18.2,1.255172]],"volume":[[0,0],[13.6,0],[13.845,0.8],[14,0.8],[14.1,0.8],[14.7,0.8],[14.74,0.8],[14.9,0.8],[15,0.8],[16,0.8],[18.2,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"motor3.ogg"},{"pitch":[[23,0.730159],[31.5,1],[37,1.174603]],"volume":[[0,0],[23,0],[27,0.8],[29,0.8],[29.2,0.8],[30,0.8],[30.2,0.8],[33,0.8],[37,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"motor7.ogg"},{"pitch":[[70,0.883838],[79.2,1],[100,1.262626]],"volume":[[0,0],[70,0],[79.4,0.8],[80,0.8],[83,0.8],[86.4,0.8],[89,0.8],[100,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor14.ogg"},{"pitch":[[6.32,0.79],[8,1],[10,1.25]],"volume":[[0,0],[6.32,0],[6.34,0.8],[6.36,0.8],[6.5,0.8],[7,0.8],[10,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor18.ogg"},{"pitch":[[6.36,0.53],[12,1],[13.36,1.08]],"volume":[[0,0],[6.36,0],[9,0.8],[10,0.8],[11,0.8],[11.8,0.8],[12,0.8],[12.2,0.8],[12.53,0.8],[13.1,0.8],[13.4,0.8],[13.5,0.8],[13.6,0.8],[13.775,0.8],[13.845,0.8],[14,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor18a.ogg"},{"pitch":[[14.7,0.803279],[18.3,1],[21.5,1.174863]],"volume":[[0,0],[14.7,0],[16,0.8],[17,0.8],[18.2,0.8],[18.4,0.8],[18.6,0.8],[19,0.8],[20,0.8],[20.2,0.8],[20.4,0.8],[21.1,0.8],[21.3,0.8],[21.5,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor20.ogg"},{"pitch":[[21.1,0.821012],[25.7,1],[30.2,1.175097]],"volume":[[0,0],[21.1,0],[22,0.8],[22.1,0.8],[23,0.8],[24,0.8],[26,0.8],[30.2,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor21.ogg"},{"pitch":[[33,0.889488],[37.1,1],[40,1.078167]],"volume":[[0,0],[33,0],[33.2,0.8],[40,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor22.ogg"},{"pitch":[[33.2,0.770302],[43.1,1],[55,1.276102]],"volume":[[0,0],[33.2,0],[37,0.8],[45,0.8],[55,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor23.ogg"},{"pitch":[[40,0.793651],[50.4,1],[72.2,1.43254]],"volume":[[0,0],[40,0],[46.8,0.8],[51,0.8],[53.2,0.8],[55,0.8],[59.2,0.8],[72.2,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor24-2.ogg"},{"pitch":[[40,0.793651],[50.4,1],[72.2,1.43254]],"volume":[[0,0],[40,0],[46.8,0.8],[51,0.8],[53.2,0.8],[65,0.8],[72.2,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor24.ogg"},{"pitch":[[55,0.772472],[71.2,1],[83,1.16573]],"volume":[[0,0],[55,0],[66,0.8],[70,0.8],[72.2,0.8],[75,0.8],[83,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor27.ogg"},{"pitch":[[83,1.01467],[130,1.589242]],"volume":[[0,0],[83,0],[89,0.8],[93,0.8],[95,0.8],[100,0.8],[130,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor29.ogg"},{"pitch":[[93,0.869159],[107,1],[159.8,1.493458]],"volume":[[0,0],[93,0],[100,0.8],[130,0.8],[159.8,0]],"isMute":false,"isNotchPower":true,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":true,"isTunnelFade":null,"fileName":"Motor30.ogg"},{"pitch":[[38,0.904762],[42,1],[55,1.309524]],"volume":[[0,0],[38,0],[39.2,0.8],[39.4,0.8],[39.6,0.8],[40,0.8],[45,0.8],[55,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor31.ogg"},{"pitch":[[33,0.896739],[36.8,1],[39.4,1.070652]],"volume":[[0,0],[33,0],[33.2,0.8],[35,0.8],[37,0.8],[38,0.8],[38.2,0.8],[38.4,0.8],[39.2,0.8],[39.4,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor32.ogg"},{"pitch":[[23,0.766667],[30,1],[35,1.166667]],"volume":[[0,0],[23,0],[27,0.8],[29,0.8],[29.2,0.8],[30,0.8],[30.2,0.8],[33,0.8],[35,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":true,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor33.ogg"},{"pitch":[[19,0.785124],[24.2,1],[30.2,1.247934]],"volume":[[0,0],[19,0],[22,0.8],[22.1,0.8],[23,0.8],[24,0.8],[26,0.8],[30.2,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor34.ogg"},{"pitch":[[15.1,0.762626],[19.8,1],[26,1.313131]],"volume":[[0,0],[15.1,0],[15.3,0.8],[15.5,0.8],[16,0.8],[17,0.8],[18.2,0.8],[18.4,0.8],[18.6,0.8],[19,0.8],[20,0.8],[20.2,0.8],[20.4,0.8],[21.1,0.8],[21.3,0.8],[26,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor35.ogg"},{"pitch":[[9,0.681818],[13.2,1],[15.5,1.104242]],"volume":[[0,0],[9,0],[13.1,0.8],[13.4,0.8],[13.5,0.8],[13.6,0.8],[13.775,0.8],[13.845,0.8],[14,0.8],[14.1,0.8],[14.3,0.8],[14.5,0.8],[14.7,0.8],[14.74,0.8],[14.9,0.8],[15,0.8],[15.1,0.8],[15.3,0.8],[15.5,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor36.ogg"},{"pitch":[[1.3,0.5],[9.7,1],[13.775,1.420103]],"volume":[[0,0],[1.3,0],[6.36,0.8],[6.5,0.8],[7,0.8],[9,0.8],[10,0.8],[11,0.8],[11.8,0.8],[12,0.8],[12.2,0.8],[13.775,0]],"isMute":false,"isNotchPower":false,"isNotchOff":false,"isNotchBrake":false,"isFadeMixer":false,"isTunnelFade":null,"fileName":"Motor37.ogg"},{"pitch":[[0,0.5],[160,1.3]],"volume":[[0,0],[100,0.8],[160,0.8]],"isMute":false,"isNotchPower":true,"isNotchOff":true,"isNotchBrake":true,"isFadeMixer":false,"isTunnelFade":null,"fileName":"run0.ogg"}];
var SoundEffectData = {"209dooropn.ogg":{"fileName":"209dooropn.ogg"},"doorcls.ogg":{"fileName":"doorcls.ogg"},"701doorcls.ogg":{"fileName":"701doorcls.ogg"},"701dooropn.ogg":{"fileName":"701dooropn.ogg"}};
var SoundData = {"motor0.ogg":["sound_701","701.motor0"],"motor1.ogg":["sound_701","701.motor1"],"motor2_F.ogg":["sound_701","701.motor2_F"],"motor3_F.ogg":["sound_701","701.motor3_F"],"motor3.ogg":["sound_701","701.motor3"],"motor7.ogg":["sound_701","701.motor7"],"Motor14.ogg":["sound_701","701.Motor14"],"Motor18.ogg":["sound_701","701.Motor18"],"Motor18a.ogg":["sound_701","701.Motor18a"],"Motor20.ogg":["sound_701","701.Motor20"],"Motor21.ogg":["sound_701","701.Motor21"],"Motor22.ogg":["sound_701","701.Motor22"],"Motor23.ogg":["sound_701","701.Motor23"],"Motor24-2.ogg":["sound_701","701.Motor24-2"],"Motor24.ogg":["sound_701","701.Motor24"],"Motor27.ogg":["sound_701","701.Motor27"],"Motor29.ogg":["sound_701","701.Motor29"],"Motor30.ogg":["sound_701","701.Motor30"],"Motor31.ogg":["sound_701","701.Motor31"],"Motor32.ogg":["sound_701","701.Motor32"],"Motor33.ogg":["sound_701","701.Motor33"],"Motor34.ogg":["sound_701","701.Motor34"],"Motor35.ogg":["sound_701","701.Motor35"],"Motor36.ogg":["sound_701","701.Motor36"],"Motor37.ogg":["sound_701","701.Motor37"],"run0.ogg":["sound_701","701.run0"],"209dooropn.ogg":["sound_701","701.209dooropn"],"doorcls.ogg":["sound_701","701.doorcls"],"701doorcls.ogg":["sound_701","701.701doorcls"],"701dooropn.ogg":["sound_701","701.701dooropn"]};
//##### データ #####

//##### onUpdate #####
function onUpdate_RSM2(su) {
    var entity = su.getEntity();
    var dataMap = entity.getResourceState().getDataMap();
    var speed = su.getSpeed();
    var notch = su.getNotch();
    //powerFade
    var powerFade = dataMap.getInt("powerFade");
    var powerFadeDelayTime = dataMap.getInt("powerFadeDelayTime");
    if (notch === 0) powerFadeDelayTime = Math.min(powerFadeDelayTime + 1, PowerFadeDelay);
    else if (speed > 0) powerFadeDelayTime = Math.max(powerFadeDelayTime - 1, 0);
    if (notch > 0 && powerFadeDelayTime === 0) powerFade = Math.min(powerFade + 1, PowerFadeTime);
    else if (notch < 0 && powerFadeDelayTime === 0) powerFade = Math.max(powerFade - 1, -PowerFadeTime);
    else if (powerFadeDelayTime === PowerFadeDelay) powerFade += powerFade < 0 ? 1 : powerFade > 0 ? -1 : 0;
    dataMap.setInt("powerFadeDelayTime", powerFadeDelayTime, 0);
    dataMap.setInt("powerFade", powerFade, 0);
    powerFade = powerFade / PowerFadeTime;
    //tunnelFade
    var isTunnel = su.inTunnel();
    var tunnelFade = dataMap.getInt("tunnelFade");
    if (isTunnel) tunnelFade = Math.min(tunnelFade + 1, TunnelFadeTime);
    else tunnelFade = Math.max(tunnelFade - 1, 0);
    dataMap.setInt("tunnelFade", tunnelFade, 0);
    tunnelFade = tunnelFade / TunnelFadeTime;
    //SoundTrack
    SoundTrackData.forEach(function (trackData) {
        var soundName = trackData.fileName;
        var customPitch = 1;
        var customVolume = 1;
        var sound = new SoundState(su, trackData);
        /* 指定の音源でpitchとvolumeを乗算でカスタムすることができます
        例)

        //フェード時にピッチを変える
        if (soundName === "vvvf3.ogg") { //soundName はRSM2での音源の表示名に対応します(拡張子付きファイル名)
            customPitch = Math.abs(powerFade) / 4 + 0.75; // 0.75～1.0の間で変化
            //powerFade は力行/制動時に応じて+1.0～-1.0の値を取る
            //customPitch に値をいれると現在の速度でのピッチに乗算処理がされる(この場合は今のピッチから0.75～1.0倍になる)
        }

        //フェード時にSEを再生する(元の音声は無音化)
        if (soundName === "vvvf4.ogg") {
            if (notch !== 0) {
                if (Math.abs(powerFade) < 1.0 && sound.getVolume(speed) > 0) { //sound.getVolume(任意の速度) でその速度のときの音量を取得可能
                                                                               //sound.getPitch(任意の速度)  でその速度のときのピッチを取得可能
                    customVolume = 0;//元の音声("vvvf4.ogg")を無音化
                    su.playSound("sound_hi03nex", "e259.addPower", 1, 1, false);//通常の再生処理も実行可能
                }
            }
            else su.stopSound("sound_hi03nex", "e259.addPower");
        }

        */

        sound.play(speed, notch, powerFade, tunnelFade, customPitch, customVolume);
    });
    //SoundEffect
    var se = {};
    Object.keys(SoundEffectData).forEach(function (key) {
        var trackData = SoundEffectData[key];
        se[key] = new SoundState(su, trackData);
    });
    //Compressor
    var isCPActive = su.isComplessorActive();
    if (se["cpStart"]) se["cpStart"].playSE(isCPActive, false);
    if (se["cpLoop"]) se["cpLoop"].playSE(isCPActive, true);
    if (se["cpEnd"]) se["cpEnd"].playSE(!isCPActive, false);
    //Brake release
    var prevNotch = dataMap.getInt("prevNotch");
    dataMap.setInt("prevNotch", notch, 0);
    var isPlayBrakeH = prevNotch < notch && prevNotch === -8;
    var isPlayBrakeL = prevNotch <= 0 && prevNotch < notch && prevNotch < -1;
    var isPlayBrakeN = prevNotch < 0 && prevNotch < notch && notch >= 0;
    if (speed <= AirBrakeMaxSpeed) {
        if (se["brakeLow"]) se["brakeLow"].playSEOnce(isPlayBrakeL);
        if (se["brakeOff"]) se["brakeOff"].playSEOnce(isPlayBrakeN);
    }
    if (se["brakeHigh"]) se["brakeHigh"].playSEOnce(isPlayBrakeH);
}

//##### 関数 #####
var SoundState = function (su, trackData) {
    this.su = su;
    this.pitch = trackData.pitch || null;
    this.volume = trackData.volume || null;
    this.isMute = trackData.isMute || null;
    this.isNotchPower = trackData.isNotchPower || null;
    this.isNotchOff = trackData.isNotchOff || null;
    this.isNotchBrake = trackData.isNotchBrake || null;
    this.isFadeMixer = trackData.isFadeMixer || null;
    this.isTunnelFade = trackData.isTunnelFade; // null / true / false
    if (this.isTunnelFade === undefined) this.isTunnelFade = null;
    this.fileName = trackData.fileName;
    this.soundDmain = null;
    this.soundName = null;
    if (SoundData[this.fileName]) {
        this.soundDmain = SoundData[this.fileName][0];
        this.soundName = SoundData[this.fileName][1];
    }
};
SoundState.prototype = {
    getPitch: function (speed) {
        var pitch = interpolate(this.pitch, speed);
        return Math.min(Math.max(pitch, 0.5), 2.0);
    },
    getVolume: function (speed) {
        var volume = interpolate(this.volume, speed);
        if (speed > this.volume[this.volume.length - 1][0]) return 0;
        return Math.min(Math.max(volume, 0), 1.0);
    },
    getMixerVolume: function (notch, volumeFade, tunnelFade) {
        var volume = 1;
        var isNotchPower = this.isNotchPower;
        var isNotchOff = this.isNotchOff;
        var isNotchBrake = this.isNotchBrake;
        //Volume fade
        if (this.isFadeMixer && (isNotchOff !== isNotchPower || isNotchOff !== isNotchBrake)) {
            var notchFade = Number(volumeFade);
            var notchFadeF = Number(1 - Math.abs(notchFade));
            volume *= Math.max(
                Number(isNotchPower && notchFade > 0),
                Number(isNotchOff && notchFadeF > 0),
                Number(isNotchBrake && notchFade < 0)
            );
            volume *= isNotchOff ? Number(notchFadeF) : Number(Math.abs(notchFade));
        }
        else {
            volume *= Math.max(
                Number(isNotchPower && notch > 0),
                Number(isNotchOff && notch === 0),
                Number(isNotchBrake && notch < 0)
            );
        }
        //Tunnnel fade
        if (this.isTunnelFade !== null) {
            if (this.isTunnelFade === true) volume *= Number(tunnelFade);
            else volume *= Number(1 - tunnelFade);
        }
        volume *= Number(!this.isMute);
        return volume;
    },
    play: function (speed, notch, volumeFade, tunnelFade, customPitch, customVolume) {
        if (!this.soundDmain || !this.soundName) return;
        var pitch = this.getPitch(speed) * customPitch;
        var volume = this.getVolume(speed) * this.getMixerVolume(notch, volumeFade, tunnelFade) * customVolume;
        if (volume > 0) {
            this.su.playSound(this.soundDmain, this.soundName, volume, pitch, true);
        }
        else {
            this.su.stopSound(this.soundDmain, this.soundName);
        }
    },
    //条件分岐がtrueのときに再生する(falseで停止)
    playSE: function (condition, isLoop) {
        if (condition) this.su.playSound(this.soundDmain, this.soundName, 1, 1, isLoop);
        else this.su.stopSound(this.soundDmain, this.soundName);
    },
    //1tickだけ再生処理を実行するSEに使用する
    playSEOnce: function (condition) {
        if (condition) {
            this.su.stopSound(this.soundDmain, this.soundName);
            this.su.playSound(this.soundDmain, this.soundName, 1, 1, false);
        }
    }
};
function interpolate(valueList, speed) {
    if (valueList.length === 1) return 0;
    if (speed < valueList[0][0]) return valueList[0][1];
    for (var i = 0; i < valueList.length - 1; i++) {
        var currentSpeed = valueList[i][0];
        var currentValue = valueList[i][1];
        var nextSpeed = valueList[i + 1][0];
        var nextValue = valueList[i + 1][1];
        if (speed >= currentSpeed && speed <= nextSpeed) {
            var ratio = (speed - currentSpeed) / (nextSpeed - currentSpeed);
            return currentValue + (nextValue - currentValue) * ratio;
        }
    }
    return valueList[valueList.length - 1][1];
}