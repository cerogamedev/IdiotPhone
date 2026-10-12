// app-snake.js - Nokia 3310 / Windows 98 Retro Snake for IdiotPhone

const AppSnake = {
  canvas: null,
  ctx: null,
  gridSize: 14,
  tileCount: 20,
  snake: [],
  velocity: { x: 0, y: 0 },
  nextVelocity: { x: 0, y: 0 },
  food: { x: 5, y: 5 },
  score: 0,
  highScore: 0,
  speed: 110, // ms
  gameInterval: null,
  isGameOver: false,
  isPaused: false,

  init() {
    this.canvas = document.getElementById("snake-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.highScore = parseInt(localStorage.getItem("idiotphone_snake_high") || "0", 10);
    this.initControls();
    this.resetGame();
  },

  resetGame() {
    if (this.gameInterval) clearInterval(this.gameInterval);
    this.snake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ];
    this.velocity = { x: 0, y: -1 };
    this.nextVelocity = { x: 0, y: -1 };
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.spawnFood();

    const gameOverOverlay = document.getElementById("snake-gameover");
    if (gameOverOverlay) gameOverOverlay.style.display = "none";

    this.updateScoreDisplay();
    this.gameInterval = setInterval(() => this.tick(), this.speed);
  },

  setSpeed(ms) {
    this.speed = ms;
    if (!this.isGameOver) {
      if (this.gameInterval) clearInterval(this.gameInterval);
      this.gameInterval = setInterval(() => this.tick(), this.speed);
    }
  },

  spawnFood() {
    while (true) {
      const rx = Math.floor(Math.random() * this.tileCount);
      const ry = Math.floor(Math.random() * this.tileCount);
      const onSnake = this.snake.some(segment => segment.x === rx && segment.y === ry);
      if (!onSnake) {
        this.food = { x: rx, y: ry };
        break;
      }
    }
  },

  tick() {
    if (this.isGameOver || this.isPaused) return;

    this.velocity = { ...this.nextVelocity };
    const head = {
      x: this.snake[0].x + this.velocity.x,
      y: this.snake[0].y + this.velocity.y
    };

    // Wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.gameOver();
      return;
    }

    // Self collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    // Food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      SoundManager.playClick();
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem("idiotphone_snake_high", this.highScore.toString());
      }
      this.updateScoreDisplay();
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  },

  gameOver() {
    this.isGameOver = true;
    if (this.gameInterval) clearInterval(this.gameInterval);
    SoundManager.playChord();

    const gameOverOverlay = document.getElementById("snake-gameover");
    const finalScoreEl = document.getElementById("snake-final-score");
    if (finalScoreEl) finalScoreEl.textContent = `Score: ${this.score} | Best: ${this.highScore}`;
    if (gameOverOverlay) gameOverOverlay.style.display = "flex";
  },

  draw() {
    if (!this.ctx || !this.canvas) return;

    // Clear with retro green LCD tint
    this.ctx.fillStyle = "#9bc088";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid dots
    this.ctx.fillStyle = "#8fb47c";
    for (let x = 0; x < this.tileCount; x++) {
      for (let y = 0; y < this.tileCount; y++) {
        this.ctx.fillRect(x * this.gridSize + 6, y * this.gridSize + 6, 1, 1);
      }
    }

    // Draw Food (Pixel apple)
    this.ctx.fillStyle = "#8a2424";
    this.ctx.fillRect(
      this.food.x * this.gridSize + 1,
      this.food.y * this.gridSize + 1,
      this.gridSize - 2,
      this.gridSize - 2
    );

    // Draw Snake
    this.snake.forEach((segment, index) => {
      this.ctx.fillStyle = index === 0 ? "#122a0a" : "#204214";
      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
  },

  initControls() {
    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      const win = document.getElementById("win-snake");
      if (!win || win.style.display === "none") return;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.changeDir(0, -1);
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.changeDir(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.changeDir(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.changeDir(1, 0);
      if (e.key === " " && this.isGameOver) this.resetGame();
    });

    // Touch swipe gestures on canvas
    if (this.canvas) {
      let touchStartX = 0, touchStartY = 0;
      this.canvas.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      this.canvas.addEventListener("touchend", (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 20) this.changeDir(1, 0);
          else if (dx < -20) this.changeDir(-1, 0);
        } else {
          if (dy > 20) this.changeDir(0, 1);
          else if (dy < -20) this.changeDir(0, -1);
        }
      }, { passive: true });
    }
  },

  changeDir(x, y) {
    // Prevent immediate 180 reverse
    if (x !== 0 && this.velocity.x !== 0) return;
    if (y !== 0 && this.velocity.y !== 0) return;
    this.nextVelocity = { x, y };
  },

  updateScoreDisplay() {
    const sEl = document.getElementById("snake-score");
    const hEl = document.getElementById("snake-high");
    if (sEl) sEl.textContent = `Score: ${this.score}`;
    if (hEl) hEl.textContent = `High: ${this.highScore}`;
  }
};

window.AppSnake = AppSnake;
document.addEventListener("DOMContentLoaded", () => AppSnake.init());
