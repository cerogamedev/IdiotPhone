// app-mediaplayer.js - Windows Media Player 98 for IdiotPhone
// Features: Retro visualizer, offline Web Audio ambient synth generators (Rain, Zen Focus 432Hz, 8-Bit Chiptune), Voice Memo & Local File playback.

const AppMediaPlayer = {
  audioCtx: null,
  currentSource: null,
  gainNode: null,
  analyser: null,
  isPlaying: false,
  currentTrack: 'rain',
  volume: 0.8,
  animId: null,
  ambientInterval: null,
  audioElement: null,

  tracks: [
    { id: 'rain', name: 'Lofi Rain & Thunder.wav', type: 'ambient' },
    { id: 'focus', name: 'Zen 432Hz Focus Drone.wav', type: 'ambient' },
    { id: 'chiptune', name: 'Canyon.mid (Retro Chiptune)', type: 'ambient' },
    { id: 'local', name: 'Open Local Audio File...', type: 'file' }
  ],

  init() {
    this.renderTrackList();
    this.initAudioElement();
  },

  initAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.addEventListener('ended', () => this.stop());
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement.duration) {
        const pct = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        const seek = document.getElementById('media-seekbar');
        if (seek) seek.value = pct;
        const timeEl = document.getElementById('media-time-display');
        if (timeEl) timeEl.textContent = this.formatTime(this.audioElement.currentTime);
      }
    });
  },

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  renderTrackList() {
    const list = document.getElementById('media-playlist');
    if (!list) return;

    // Also check Voice Memos from AppRecorder
    let memoTracks = [];
    if (window.AppRecorder && AppRecorder.recordings) {
      memoTracks = AppRecorder.recordings.map((rec, i) => ({
        id: 'memo_' + rec.id,
        name: `Memo ${i + 1}: ${rec.name}`,
        type: 'memo',
        dataUri: rec.dataUri
      }));
    }

    const allTracks = [...this.tracks, ...memoTracks];
    list.innerHTML = allTracks.map((t, idx) => `
      <div class="retro-list-item ${this.currentTrack === t.id ? 'selected' : ''}" onclick="AppMediaPlayer.selectTrack('${t.id}')">
        <span>🎵 ${t.name}</span>
      </div>
    `).join('');
  },

  selectTrack(id) {
    if (id === 'local') {
      this.openFilePicker();
      return;
    }
    this.stop();
    this.currentTrack = id;
    this.renderTrackList();
    this.play();
  },

  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        this.tracks.push({
          id: 'custom_' + Date.now(),
          name: file.name,
          type: 'custom',
          url: url
        });
        this.currentTrack = this.tracks[this.tracks.length - 1].id;
        this.renderTrackList();
        this.play();
      }
    };
    input.click();
  },

  play() {
    this.ensureAudioContext();
    if (this.isPlaying) return;

    const titleEl = document.getElementById('media-now-playing');
    const track = [...this.tracks, ...(window.AppRecorder && AppRecorder.recordings ? AppRecorder.recordings.map(r => ({ id: 'memo_' + r.id, name: r.name, type: 'memo', dataUri: r.dataUri })) : [])].find(t => t.id === this.currentTrack) || this.tracks[0];

    if (titleEl) titleEl.textContent = track ? track.name : 'Playing...';

    if (track && (track.type === 'custom' || track.type === 'memo')) {
      const src = track.url || track.dataUri;
      if (src) {
        this.audioElement.src = src;
        this.audioElement.volume = this.volume;
        this.audioElement.play().catch(e => console.error(e));
        this.isPlaying = true;
        this.startVisualizer();
        this.updatePlayBtn(true);
        return;
      }
    }

    // Synthesized offline ambient generator
    this.isPlaying = true;
    this.updatePlayBtn(true);
    this.startVisualizer();

    if (this.currentTrack === 'rain') {
      this.startRainSynth();
    } else if (this.currentTrack === 'focus') {
      this.startFocusSynth();
    } else if (this.currentTrack === 'chiptune') {
      this.startChiptuneSynth();
    }
  },

  startRainSynth() {
    // Generate pink noise for soft rain
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    whiteNoise.start(0);
    this.currentSource = whiteNoise;
  },

  startFocusSynth() {
    // 432Hz Zen harmonic drone
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(432, this.audioCtx.currentTime);
    osc2.frequency.setValueAtTime(216, this.audioCtx.currentTime);

    const droneGain = this.audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(this.analyser);
    this.analyser.connect(this.gainNode);

    osc1.start();
    osc2.start();
    this.currentSource = {
      stop: () => {
        try { osc1.stop(); osc2.stop(); } catch(e) {}
      }
    };
  },

  startChiptuneSynth() {
    // Retro Win98 8-bit melody loop
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00];
    let noteIdx = 0;

    const playChiptuneNote = () => {
      if (!this.isPlaying) return;
      const osc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[noteIdx % notes.length], this.audioCtx.currentTime);
      noteGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);

      osc.connect(noteGain);
      noteGain.connect(this.analyser);
      this.analyser.connect(this.gainNode);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
      noteIdx++;
    };

    this.ambientInterval = setInterval(playChiptuneNote, 300);
    playChiptuneNote();
    this.currentSource = {
      stop: () => {
        clearInterval(this.ambientInterval);
      }
    };
  },

  pause() {
    this.stop();
  },

  stop() {
    this.isPlaying = false;
    this.updatePlayBtn(false);

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource = null;
    }
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    cancelAnimationFrame(this.animId);

    const canvas = document.getElementById('media-visualizer-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  },

  setVolume(val) {
    this.volume = parseFloat(val);
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  },

  updatePlayBtn(playing) {
    const btn = document.getElementById('media-btn-play');
    if (btn) btn.textContent = playing ? '❚❚' : '▶';
  },

  startVisualizer() {
    const canvas = document.getElementById('media-visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser ? this.analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isPlaying) return;
      this.animId = requestAnimationFrame(draw);
      if (this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
      }

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        // Classic Win98 green fluorescent oscilloscope bars
        ctx.fillStyle = `rgb(0, ${Math.min(255, 150 + dataArray[i])}, 50)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    draw();
  },

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
};

window.AppMediaPlayer = AppMediaPlayer;
