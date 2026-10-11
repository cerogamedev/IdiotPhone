// app-recorder.js - Windows 98 Sound Recorder (sndrec32.exe) Voice Memos for IdiotPhone

const AppRecorder = {
  isRecording: false,
  isPlaying: false,
  mediaRecorder: null,
  audioChunks: [],
  recordings: [],
  currentAudio: null,
  canvas: null,
  ctx: null,
  waveTimer: null,
  posSeconds: 0,

  init() {
    this.canvas = document.getElementById("recorder-wave-canvas");
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      this.drawWave(false);
    }
    this.loadRecordings();
    this.initControls();
  },

  initControls() {
    const btnRecord = document.getElementById("rec-btn-record");
    const btnStop = document.getElementById("rec-btn-stop");
    const btnPlay = document.getElementById("rec-btn-play");
    const btnRewind = document.getElementById("rec-btn-rewind");

    if (btnRecord) btnRecord.addEventListener("click", () => this.toggleRecord());
    if (btnStop) btnStop.addEventListener("click", () => this.stopAll());
    if (btnPlay) btnPlay.addEventListener("click", () => this.playCurrent());
    if (btnRewind) btnRewind.addEventListener("click", () => this.rewind());
  },

  drawWave(active) {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = "#00ff00";
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    const mid = h / 2;
    this.ctx.moveTo(0, mid);

    for (let x = 0; x < w; x++) {
      let y = mid;
      if (active) {
        const amp = (Math.sin(x * 0.15 + Date.now() * 0.01) + Math.cos(x * 0.05)) * (mid * 0.4);
        y += amp;
      }
      this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
  },

  toggleRecord() {
    if (this.isRecording) {
      this.stopAll();
      return;
    }

    SoundManager.playClick();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.mediaRecorder = new MediaRecorder(stream);
          this.audioChunks = [];

          this.mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
          };

          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.audioChunks, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result;
              this.saveRecording(base64data);
            };
            reader.readAsDataURL(blob);
          };

          this.mediaRecorder.start();
          this.isRecording = true;
          this.startWaveAnimation();
          this.updateDisplay("Recording...");
        })
        .catch(err => {
          console.error("Mic access denied", err);
          this.simulateRecord();
        });
    } else {
      this.simulateRecord();
    }
  },

  simulateRecord() {
    this.isRecording = true;
    this.startWaveAnimation();
    this.updateDisplay("Recording (Demo)...");
  },

  stopAll() {
    SoundManager.playClick();
    if (this.isRecording) {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      } else {
        this.saveRecording(null);
      }
      this.isRecording = false;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.stopWaveAnimation();
    this.updateDisplay("Stopped");
  },

  playCurrent() {
    if (this.recordings.length === 0) {
      SoundManager.playChord();
      return;
    }
    SoundManager.playClick();
    const latest = this.recordings[0];
    if (latest.data) {
      this.currentAudio = new Audio(latest.data);
      this.currentAudio.onended = () => this.stopAll();
      this.currentAudio.play();
      this.isPlaying = true;
      this.startWaveAnimation();
      this.updateDisplay("Playing: " + latest.title);
    } else {
      SoundManager.playDing();
      this.updateDisplay("Simulated Playback");
    }
  },

  rewind() {
    SoundManager.playClick();
    this.posSeconds = 0;
    this.updateDisplay("Position: 0.00 sec");
  },

  startWaveAnimation() {
    clearInterval(this.waveTimer);
    this.waveTimer = setInterval(() => {
      this.drawWave(true);
      this.posSeconds += 0.1;
      const posEl = document.getElementById("recorder-pos-text");
      if (posEl) posEl.textContent = this.posSeconds.toFixed(2) + " sec";
    }, 50);
  },

  stopWaveAnimation() {
    clearInterval(this.waveTimer);
    this.drawWave(false);
  },

  updateDisplay(txt) {
    const el = document.getElementById("recorder-status-text");
    if (el) el.textContent = txt;
  },

  saveRecording(base64) {
    const id = Date.now().toString();
    const title = "Voice Memo " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.recordings.unshift({ id, title, data: base64, date: Date.now() });
    if (this.recordings.length > 20) this.recordings.pop();

    try {
      localStorage.setItem("idiotphone_memos", JSON.stringify(this.recordings.map(r => ({ id: r.id, title: r.title, date: r.date }))));
    } catch (e) {}

    this.renderRecordings();
    Desktop.showRetroNotification("Voice Memo Saved", `${title} has been recorded.`, "info");
  },

  loadRecordings() {
    try {
      const saved = localStorage.getItem("idiotphone_memos");
      if (saved) this.recordings = JSON.parse(saved);
    } catch (e) {
      this.recordings = [];
    }
    this.renderRecordings();
  },

  renderRecordings() {
    const list = document.getElementById("recorder-memos-list");
    if (!list) return;

    if (this.recordings.length === 0) {
      list.innerHTML = '<div style="padding: 6px; color: #666; font-size: 10px; text-align: center;">No voice memos recorded yet.</div>';
      return;
    }

    list.innerHTML = "";
    this.recordings.forEach(r => {
      const item = document.createElement("div");
      item.className = "retro-list-item";
      item.innerHTML = `
        <span>${r.title}</span>
        <button style="min-width: 38px; height: 18px; font-size: 9px;">Play</button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        SoundManager.playClick();
        if (r.data) {
          const a = new Audio(r.data);
          a.play();
        } else {
          SoundManager.playDing();
        }
      });
      list.appendChild(item);
    });
  }
};

window.AppRecorder = AppRecorder;
document.addEventListener("DOMContentLoaded", () => AppRecorder.init());
