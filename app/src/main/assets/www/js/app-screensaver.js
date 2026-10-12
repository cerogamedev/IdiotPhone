// app-screensaver.js - Classic Windows 98 Starfield Screensaver & Battery Saver

const AppScreensaver = {
  active: false,
  canvas: null,
  ctx: null,
  stars: [],
  numStars: 250,
  idleTimeout: 60000, // 1 minute default
  timer: null,
  animId: null,

  init() {
    this.canvas = document.getElementById("screensaver-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    const savedTimeout = localStorage.getItem("idiotphone_screensaver_timeout");
    if (savedTimeout !== null) {
      this.idleTimeout = parseInt(savedTimeout, 10);
    }

    this.initStars();
    this.resetTimer();
    this.bindEvents();
  },

  bindEvents() {
    const wake = () => {
      if (this.active) {
        this.stop();
      }
      this.resetTimer();
    };

    document.addEventListener("touchstart", wake, { passive: true });
    document.addEventListener("mousedown", wake);
    document.addEventListener("keydown", wake);
  },

  resetTimer() {
    clearTimeout(this.timer);
    if (this.idleTimeout > 0) {
      this.timer = setTimeout(() => this.start(), this.idleTimeout);
    }
  },

  initStars() {
    this.stars = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * w,
        y: (Math.random() - 0.5) * h,
        z: Math.random() * w
      });
    }
  },

  start() {
    if (this.active) return;
    this.active = true;
    this.canvas.style.display = "block";
    this.canvas.style.pointerEvents = "auto";
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initStars();
    this.loop();
  },

  stop() {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.animId);
    this.canvas.style.display = "none";
    this.canvas.style.pointerEvents = "none";
    this.resetTimer();
  },

  loop() {
    if (!this.active) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = "#ffffff";
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.z -= 4; // speed

      if (s.z <= 0) {
        s.x = (Math.random() - 0.5) * w;
        s.y = (Math.random() - 0.5) * h;
        s.z = w;
      }

      const k = 128.0 / s.z;
      const px = s.x * k + cx;
      const py = s.y * k + cy;

      if (px >= 0 && px <= w && py >= 0 && py <= h) {
        const size = Math.max(1, (1.0 - s.z / w) * 3);
        const shade = Math.floor((1.0 - s.z / w) * 255);
        this.ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        this.ctx.fillRect(px, py, size, size);
      }
    }

    this.animId = requestAnimationFrame(() => this.loop());
  },

  setTimeoutValue(ms) {
    this.idleTimeout = ms;
    localStorage.setItem("idiotphone_screensaver_timeout", ms.toString());
    this.resetTimer();
  }
};

window.AppScreensaver = AppScreensaver;
document.addEventListener("DOMContentLoaded", () => AppScreensaver.init());
