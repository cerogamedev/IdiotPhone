// app-brickbreaker.js - Windows 98 / DX-Ball Retro Brick Breaker for IdiotPhone

const AppBrickBreaker = {
  canvas: null,
  ctx: null,
  paddle: { x: 110, y: 300, width: 60, height: 10, speed: 6 },
  ball: { x: 140, y: 280, radius: 4, dx: 3, dy: -3, speed: 3.5 },
  bricks: [],
  brickRows: 5,
  brickCols: 7,
  brickWidth: 34,
  brickHeight: 12,
  brickPadding: 4,
  brickOffsetTop: 30,
  brickOffsetLeft: 8,
  score: 0,
  highScore: 0,
  lives: 3,
  stage: 1,
  isRunning: false,
  isGameOver: false,
  animationId: null,

  init() {
    this.canvas = document.getElementById("bb-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.highScore = parseInt(localStorage.getItem("idiotphone_bb_high") || "0", 10);
    this.initControls();
    this.resetGame();
  },

  resetGame() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.lives = 3;
    this.stage = 1;
    this.isGameOver = false;
    this.paddle.width = 60;
    this.initStage();

    const overlay = document.getElementById("bb-gameover");
    if (overlay) overlay.style.display = "none";

    this.isRunning = true;
    this.loop();
  },

  initStage() {
    this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
    this.resetBall();

    // Procedural color palette for Windows 98 bricks
    const colors = ["#cc0000", "#d97706", "#2563eb", "#16a34a", "#9333ea", "#0891b2"];
    this.bricks = [];

    for (let c = 0; c < this.brickCols; c++) {
      this.bricks[c] = [];
      for (let r = 0; r < this.brickRows; r++) {
        const color = colors[(r + this.stage) % colors.length];
        this.bricks[c][r] = {
          x: c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft,
          y: r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop,
          status: 1,
          color: color,
          points: (this.brickRows - r) * 10
        };
      }
    }

    this.updateStatus();
  },

  resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.paddle.y - 12;
    const baseSpeed = Math.min(3.5 + (this.stage - 1) * 0.3, 6);
    this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * (baseSpeed * 0.7);
    this.ball.dy = -baseSpeed;
  },

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  },

  update() {
    if (this.isGameOver) return;

    // Ball movement
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Wall bounce: Left and Right
    if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
      this.ball.dx = -this.ball.dx;
      SoundManager.playClick();
    }

    // Wall bounce: Ceiling
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.dy = -this.ball.dy;
      SoundManager.playClick();
    }

    // Paddle collision
    if (
      this.ball.y + this.ball.radius >= this.paddle.y &&
      this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
      this.ball.x >= this.paddle.x &&
      this.ball.x <= this.paddle.x + this.paddle.width
    ) {
      // Calculate hit offset for dynamic reflection angles (-1 to +1)
      const hitPoint = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
      this.ball.dx = hitPoint * (speed * 0.85);
      this.ball.dy = -Math.abs(this.ball.dy);
      SoundManager.playClick();
    }

    // Bottom loss
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.lives--;
      SoundManager.playChord();
      if (this.lives <= 0) {
        this.gameOver();
        return;
      } else {
        this.resetBall();
      }
      this.updateStatus();
    }

    // Brick collisions
    let allCleared = true;
    for (let c = 0; c < this.brickCols; c++) {
      for (let r = 0; r < this.brickRows; r++) {
        const b = this.bricks[c][r];
        if (b && b.status === 1) {
          allCleared = false;
          if (
            this.ball.x > b.x &&
            this.ball.x < b.x + this.brickWidth &&
            this.ball.y > b.y &&
            this.ball.y < b.y + this.brickHeight
          ) {
            this.ball.dy = -this.ball.dy;
            b.status = 0;
            this.score += b.points;
            if (this.score > this.highScore) {
              this.highScore = this.score;
              localStorage.setItem("idiotphone_bb_high", this.highScore.toString());
            }
            this.updateStatus();
            SoundManager.playClick();
          }
        }
      }
    }

    // Stage Clear -> Infinite Next Level
    if (allCleared) {
      this.stage++;
      SoundManager.playTada();
      Desktop.showRetroNotification("Stage Cleared!", `Advancing to Stage ${this.stage}!`, "info");
      this.initStage();
    }
  },

  gameOver() {
    this.isGameOver = true;
    this.isRunning = false;
    SoundManager.playChord();
    const overlay = document.getElementById("bb-gameover");
    const scoreEl = document.getElementById("bb-final-score");
    if (scoreEl) scoreEl.textContent = `Score: ${this.score} | Stage: ${this.stage} | Best: ${this.highScore}`;
    if (overlay) overlay.style.display = "flex";
  },

  draw() {
    if (!this.ctx || !this.canvas) return;

    // Dark arcade background
    this.ctx.fillStyle = "#101020";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Bricks
    for (let c = 0; c < this.brickCols; c++) {
      for (let r = 0; r < this.brickRows; r++) {
        const b = this.bricks[c][r];
        if (b && b.status === 1) {
          // Retro beveled brick
          this.ctx.fillStyle = b.color;
          this.ctx.fillRect(b.x, b.y, this.brickWidth, this.brickHeight);

          // Top/left highlight
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          this.ctx.fillRect(b.x, b.y, this.brickWidth, 2);
          this.ctx.fillRect(b.x, b.y, 2, this.brickHeight);

          // Bottom/right shadow
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          this.ctx.fillRect(b.x, b.y + this.brickHeight - 2, this.brickWidth, 2);
          this.ctx.fillRect(b.x + this.brickWidth - 2, b.y, 2, this.brickHeight);
        }
      }
    }

    // Draw Paddle
    this.ctx.fillStyle = "#c0c0c0";
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, 2);
    this.ctx.fillStyle = "#404040";
    this.ctx.fillRect(this.paddle.x, this.paddle.y + this.paddle.height - 2, this.paddle.width, 2);

    // Draw Ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fill();
    this.ctx.closePath();
  },

  initControls() {
    // Touch dragging on canvas
    if (this.canvas) {
      const handleMove = (clientX) => {
        const rect = this.canvas.getBoundingClientRect();
        const rootX = clientX - rect.left;
        this.paddle.x = Math.max(0, Math.min(rootX - this.paddle.width / 2, this.canvas.width - this.paddle.width));
      };

      this.canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }, { passive: false });

      this.canvas.addEventListener("mousemove", (e) => {
        handleMove(e.clientX);
      });
    }

    // Keyboard support
    window.addEventListener("keydown", (e) => {
      const win = document.getElementById("win-brickbreaker");
      if (!win || win.style.display === "none") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.paddle.x = Math.max(0, this.paddle.x - 18);
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.paddle.x = Math.min(this.canvas.width - this.paddle.width, this.paddle.x + 18);
      }
      if (e.key === " " && this.isGameOver) this.resetGame();
    });
  },

  movePaddle(dir) {
    if (dir === 'left') {
      this.paddle.x = Math.max(0, this.paddle.x - 24);
    } else {
      this.paddle.x = Math.min(this.canvas.width - this.paddle.width, this.paddle.x + 24);
    }
  },

  updateStatus() {
    const sEl = document.getElementById("bb-score");
    const lEl = document.getElementById("bb-lives");
    const stEl = document.getElementById("bb-stage");
    if (sEl) sEl.textContent = `Score: ${this.score}`;
    if (lEl) lEl.textContent = `Lives: ${"❤️".repeat(Math.max(0, this.lives))}`;
    if (stEl) stEl.textContent = `Stage: ${this.stage}`;
  }
};

window.AppBrickBreaker = AppBrickBreaker;
document.addEventListener("DOMContentLoaded", () => AppBrickBreaker.init());
