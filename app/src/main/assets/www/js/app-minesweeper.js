/**
 * IdiotPhone 98 - Minesweeper (Classic Mayın Tarlası 98)
 */
const AppMinesweeper = {
    ROWS: 9,
    COLS: 9,
    MINES: 10,
    board: [],
    revealedCount: 0,
    flagsCount: 0,
    gameOver: false,
    gameWon: false,
    startTime: null,
    timerInterval: null,
    flagMode: false, // For easy mobile touch toggle

    init() {
        this.resetGame();
    },

    resetGame() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.board = [];
        this.revealedCount = 0;
        this.flagsCount = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.startTime = null;
        this.flagMode = false;

        this.setSmiley('normal');
        this.updateMineDisplay();
        this.updateTimeDisplay(0);
        this.createBoard();
        this.renderBoard();
        this.updateFlagModeBtn();
    },

    createBoard() {
        // Initialize empty cells
        for (let r = 0; r < this.ROWS; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.COLS; c++) {
                this.board[r][c] = {
                    mine: false,
                    revealed: false,
                    flagged: false,
                    adjacentMines: 0
                };
            }
        }

        // Place 10 mines randomly
        let placed = 0;
        while (placed < this.MINES) {
            const r = Math.floor(Math.random() * this.ROWS);
            const c = Math.floor(Math.random() * this.COLS);
            if (!this.board[r][c].mine) {
                this.board[r][c].mine = true;
                placed++;
            }
        }

        // Calculate adjacent mines
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.board[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                            if (this.board[nr][nc].mine) count++;
                        }
                    }
                }
                this.board[r][c].adjacentMines = count;
            }
        }
    },

    startTimer() {
        if (this.timerInterval) return;
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.min(999, Math.floor((Date.now() - this.startTime) / 1000));
            this.updateTimeDisplay(elapsed);
        }, 1000);
    },

    toggleFlagMode() {
        this.flagMode = !this.flagMode;
        this.updateFlagModeBtn();
        if (window.SoundManager) SoundManager.play('click');
    },

    updateFlagModeBtn() {
        const btn = document.getElementById('ms-flag-toggle-btn');
        if (btn) {
            btn.textContent = this.flagMode ? 'Mode: 🚩 Flagging' : 'Mode: ⛏️ Digging';
            btn.style.background = this.flagMode ? '#ffffcc' : '';
        }
    },

    handleCellClick(r, c) {
        if (this.gameOver || this.gameWon) return;

        if (!this.startTime) this.startTimer();

        const cell = this.board[r][c];

        if (this.flagMode) {
            this.toggleFlag(r, c);
            return;
        }

        if (cell.flagged || cell.revealed) return;

        if (cell.mine) {
            // Hit a mine! Game Over
            this.triggerGameOver(r, c);
            return;
        }

        // Reveal cell
        this.revealCell(r, c);
        if (window.SoundManager) {
            SoundManager.play('click');
            SoundManager.vibrate(15);
        }

        // Check victory
        if (this.revealedCount === (this.ROWS * this.COLS - this.MINES)) {
            this.triggerWin();
        }

        this.renderBoard();
    },

    toggleFlag(r, c) {
        const cell = this.board[r][c];
        if (cell.revealed) return;

        cell.flagged = !cell.flagged;
        this.flagsCount += cell.flagged ? 1 : -1;
        this.updateMineDisplay();

        if (window.SoundManager) {
            SoundManager.play('chord');
            SoundManager.vibrate(25);
        }
        this.renderBoard();
    },

    revealCell(r, c) {
        const cell = this.board[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        this.revealedCount++;

        // Cascade if zero
        if (cell.adjacentMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                        this.revealCell(nr, nc);
                    }
                }
            }
        }
    },

    triggerGameOver(hitR, hitC) {
        this.gameOver = true;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.setSmiley('dead');

        // Reveal all mines
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.board[r][c].mine) {
                    this.board[r][c].revealed = true;
                }
            }
        }

        this.renderBoard();
        if (window.SoundManager) {
            SoundManager.play('ding');
            SoundManager.vibrate(200);
        }
    },

    triggerWin() {
        this.gameWon = true;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.setSmiley('cool');

        this.renderBoard();
        if (window.SoundManager) {
            SoundManager.play('tada');
            SoundManager.vibrate(100);
        }
        if (window.Desktop) {
            Desktop.showNotification('Minesweeper 98', 'Victory! You cleared the minefield! 🎉', 'info');
        }
    },

    setSmiley(state) {
        const btn = document.getElementById('ms-smiley-btn');
        if (!btn) return;
        const faces = {
            normal: '🙂',
            worried: '😮',
            dead: '😵',
            cool: '😎'
        };
        btn.textContent = faces[state] || '🙂';
    },

    updateMineDisplay() {
        const el = document.getElementById('ms-mines-count');
        if (!el) return;
        const remaining = Math.max(0, this.MINES - this.flagsCount);
        el.textContent = String(remaining).padStart(3, '0');
    },

    updateTimeDisplay(val) {
        const el = document.getElementById('ms-time-count');
        if (!el) return;
        el.textContent = String(val).padStart(3, '0');
    },

    renderBoard() {
        const grid = document.getElementById('ms-grid-container');
        if (!grid) return;

        const numberColors = [
            '', '#0000ff', '#008000', '#ff0000', '#000080',
            '#800000', '#008080', '#000000', '#808080'
        ];

        let html = '';
        for (let r = 0; r < this.ROWS; r++) {
            html += '<div style="display:flex;">';
            for (let c = 0; c < this.COLS; c++) {
                const cell = this.board[r][c];
                let content = '';
                let cellStyle = 'width:28px;height:28px;font-size:14px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-sizing:border-box;user-select:none;';

                if (cell.revealed) {
                    cellStyle += 'background:#c0c0c0;border:1px solid #7b7b7b;';
                    if (cell.mine) {
                        content = '💣';
                        cellStyle += 'background:#ff4d4d;';
                    } else if (cell.adjacentMines > 0) {
                        content = cell.adjacentMines;
                        cellStyle += `color:${numberColors[cell.adjacentMines]};`;
                    }
                } else {
                    cellStyle += 'background:#c0c0c0;border:2px outset #ffffff;cursor:pointer;';
                    if (cell.flagged) {
                        content = '🚩';
                    }
                }

                html += `<div style="${cellStyle}" onclick="AppMinesweeper.handleCellClick(${r}, ${c})" oncontextmenu="event.preventDefault();AppMinesweeper.toggleFlag(${r}, ${c});">${content}</div>`;
            }
            html += '</div>';
        }

        grid.innerHTML = html;
    }
};

window.AppMinesweeper = AppMinesweeper;
