// sound-manager.js - Retro Audio & Sound Effects for IdiotPhone 98

const SoundManager = {
  soundEnabled: true,
  audioCache: {},

  init() {
    this.soundEnabled = localStorage.getItem("idiotphone_sound") !== "false";
  },

  play(type) {
    if (!this.soundEnabled) return;

    // Try Android Bridge native MediaPlayer first (lowest latency, works in background)
    if (window.AndroidBridge) {
      try {
        if (type === "ding") { window.AndroidBridge.playNotificationSound(); window.AndroidBridge.vibrate(40); return; }
        if (type === "chord") { window.AndroidBridge.playChordSound(); window.AndroidBridge.vibrate(80); return; }
        if (type === "tada") { window.AndroidBridge.playTadaSound(); window.AndroidBridge.vibrate(120); return; }
        if (type === "click") { window.AndroidBridge.playClickSound(); window.AndroidBridge.vibrate(15); return; }
      } catch (e) {
        console.warn("AndroidBridge sound error, using audio fallback", e);
      }
    }

    // HTML5 Audio fallback
    try {
      if (!this.audioCache[type]) {
        this.audioCache[type] = new Audio(`sound/${type}.wav`);
      }
      const audio = this.audioCache[type];
      audio.currentTime = 0;
      audio.play().catch(e => console.log("Audio play blocked", e));
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  },

  playDing() { this.play("ding"); },
  playChord() { this.play("chord"); },
  playTada() { this.play("tada"); },
  playClick() { this.play("click"); },

  toggleSound(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem("idiotphone_sound", enabled ? "true" : "false");
  }
};

window.SoundManager = SoundManager;
SoundManager.init();
