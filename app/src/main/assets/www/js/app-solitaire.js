// app-solitaire.js - Windows 98 Klondike Solitaire for IdiotPhone

const AppSolitaire = {
  suits: ['♠', '♥', '♦', '♣'],
  ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
  deck: [],
  stock: [],
  waste: [],
  foundations: [[], [], [], []], // 0: ♠, 1: ♥, 2: ♦, 3: ♣
  tableau: [[], [], [], [], [], [], []],
  selectedCard: null,
  score: 0,
  timerSeconds: 0,
  timerInterval: null,
  isWon: false,

  init() {
    this.newGame();
  },

  newGame() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerSeconds = 0;
    this.score = 0;
    this.isWon = false;
    this.selectedCard = null;

    // Build fresh 52 deck
    this.deck = [];
    this.suits.forEach((suit, sIdx) => {
      this.ranks.forEach((rank, rIdx) => {
        this.deck.push({
          suit,
          rank,
          value: rIdx + 1,
          color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
          faceUp: false
        });
      });
    });

    // Shuffle deck
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }

    // Reset piles
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.waste = [];

    // Deal to tableau (1 to 7)
    let cardIdx = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const c = this.deck[cardIdx++];
        c.faceUp = (row === col);
        this.tableau[col].push(c);
      }
    }

    // Remaining cards go to stock
    this.stock = this.deck.slice(cardIdx);

    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateStatus();
    }, 1000);

    this.render();
  },

  drawStock() {
    SoundManager.playClick();
    if (this.stock.length > 0) {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
    } else {
      // Recycle waste back into stock
      if (this.waste.length === 0) return;
      this.stock = this.waste.reverse().map(c => {
        c.faceUp = false;
        return c;
      });
      this.waste = [];
      this.score = Math.max(0, this.score - 20);
    }
    this.selectedCard = null;
    this.render();
  },

  tryAutoMove(card, sourceCol, cardIdx) {
    // 1. Try moving to foundations
    for (let f = 0; f < 4; f++) {
      const targetPile = this.foundations[f];
      if (this.canMoveToFoundation(card, targetPile, f)) {
        SoundManager.playClick();
        this.removeCardFromSource(sourceCol, cardIdx);
        targetPile.push(card);
        this.score += 10;
        this.checkWin();
        this.render();
        return true;
      }
    }

    // 2. Try moving to another tableau column
    for (let t = 0; t < 7; t++) {
      if (t === sourceCol) continue;
      const targetCol = this.tableau[t];
      if (this.canMoveToTableau(card, targetCol)) {
        SoundManager.playClick();
        const movingCards = this.getCardsFromSource(sourceCol, cardIdx);
        this.removeCardFromSource(sourceCol, cardIdx);
        targetCol.push(...movingCards);
        this.score += 5;
        this.render();
        return true;
      }
    }

    return false;
  },

  canMoveToFoundation(card, fPile, fIdx) {
    if (card.suit !== this.suits[fIdx]) return false;
    if (fPile.length === 0) {
      return card.value === 1; // Ace
    }
    const top = fPile[fPile.length - 1];
    return card.value === top.value + 1;
  },

  canMoveToTableau(card, targetCol) {
    if (targetCol.length === 0) {
      return card.value === 13; // King on empty column
    }
    const top = targetCol[targetCol.length - 1];
    if (!top.faceUp) return false;
    return (card.color !== top.color) && (card.value === top.value - 1);
  },

  getCardsFromSource(sourceCol, cardIdx) {
    if (sourceCol === 'waste') {
      return [this.waste[this.waste.length - 1]];
    }
    return this.tableau[sourceCol].slice(cardIdx);
  },

  removeCardFromSource(sourceCol, cardIdx) {
    if (sourceCol === 'waste') {
      this.waste.pop();
    } else {
      this.tableau[sourceCol].splice(cardIdx);
      // Flip new top card if needed
      if (this.tableau[sourceCol].length > 0) {
        const top = this.tableau[sourceCol][this.tableau[sourceCol].length - 1];
        if (!top.faceUp) {
          top.faceUp = true;
          this.score += 5;
        }
      }
    }
  },

  checkWin() {
    const totalFoundations = this.foundations.reduce((sum, f) => sum + f.length, 0);
    if (totalFoundations === 52 && !this.isWon) {
      this.isWon = true;
      if (this.timerInterval) clearInterval(this.timerInterval);
      SoundManager.playTada();
      Desktop.showRetroNotification("Solitaire Victory!", `Congratulations! Solitaire solved with score: ${this.score}`, "info");
      const winBanner = document.getElementById("solitaire-win-banner");
      if (winBanner) winBanner.style.display = "block";
    }
  },

  render() {
    const stockEl = document.getElementById("sol-stock");
    const wasteEl = document.getElementById("sol-waste");
    if (!stockEl || !wasteEl) return;

    // Stock render
    stockEl.innerHTML = "";
    if (this.stock.length > 0) {
      stockEl.appendChild(this.createCardElement({ faceUp: false }));
    }

    // Waste render
    wasteEl.innerHTML = "";
    if (this.waste.length > 0) {
      const topWaste = this.waste[this.waste.length - 1];
      const cardEl = this.createCardElement(topWaste);
      cardEl.onclick = () => this.handleCardClick(topWaste, 'waste', this.waste.length - 1);
      wasteEl.appendChild(cardEl);
    }

    // Foundations render
    for (let f = 0; f < 4; f++) {
      const fEl = document.getElementById(`sol-foundation-${f}`);
      if (!fEl) continue;
      fEl.innerHTML = "";
      const fPile = this.foundations[f];
      if (fPile.length > 0) {
        const topF = fPile[fPile.length - 1];
        fEl.appendChild(this.createCardElement(topF));
      } else {
        fEl.innerHTML = `<span style="opacity:0.3; font-size:20px; line-height:64px; text-align:center; display:block;">${this.suits[f]}</span>`;
      }
    }

    // Tableau render
    for (let t = 0; t < 7; t++) {
      const tEl = document.getElementById(`sol-tableau-${t}`);
      if (!tEl) continue;
      tEl.innerHTML = "";
      const col = this.tableau[t];

      col.forEach((c, idx) => {
        const cEl = this.createCardElement(c);
        cEl.style.position = "absolute";
        cEl.style.top = `${idx * 16}px`;
        cEl.style.left = "0px";
        cEl.style.zIndex = idx + 1;

        if (c.faceUp) {
          cEl.onclick = () => this.handleCardClick(c, t, idx);
        }

        tEl.appendChild(cEl);
      });

      // Allow clicking empty tableau to move a selected King
      if (col.length === 0) {
        tEl.onclick = () => {
          if (this.selectedCard && this.selectedCard.card.value === 13) {
            const movingCards = this.getCardsFromSource(this.selectedCard.col, this.selectedCard.idx);
            this.removeCardFromSource(this.selectedCard.col, this.selectedCard.idx);
            this.tableau[t].push(...movingCards);
            this.selectedCard = null;
            this.render();
          }
        };
      }
    }

    this.updateStatus();
  },

  handleCardClick(card, col, idx) {
    if (!card.faceUp) return;

    // Direct auto-move attempt on tap
    const moved = this.tryAutoMove(card, col, idx);
    if (!moved) {
      this.selectedCard = { card, col, idx };
    } else {
      this.selectedCard = null;
    }
  },

  createCardElement(c) {
    const el = document.createElement("div");
    el.className = "sol-card";
    if (!c.faceUp) {
      el.classList.add("back");
      return el;
    }

    el.classList.add(c.color);
    el.innerHTML = `
      <div style="line-height:10px;">${c.rank} ${c.suit}</div>
      <div style="font-size:16px; text-align:center;">${c.suit}</div>
      <div style="line-height:10px; text-align:right;">${c.rank}</div>
    `;
    return el;
  },

  updateStatus() {
    const scoreEl = document.getElementById("sol-score");
    const timeEl = document.getElementById("sol-time");
    if (scoreEl) scoreEl.textContent = `Score: ${this.score}`;
    if (timeEl) {
      const m = Math.floor(this.timerSeconds / 60);
      const s = this.timerSeconds % 60;
      timeEl.textContent = `Time: ${m}:${s < 10 ? '0' : ''}${s}`;
    }
  }
};

window.AppSolitaire = AppSolitaire;
document.addEventListener("DOMContentLoaded", () => AppSolitaire.init());
