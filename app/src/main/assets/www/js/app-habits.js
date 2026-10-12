// app-habits.js - Habit & Routine Tracker 98 for IdiotPhone
// Features: Daily checklists, progress bar, streak counter, auto-midnight reset.

const AppHabits = {
  KEY_HABITS: 'idiotphone_habits_list',
  KEY_LAST_DATE: 'idiotphone_habits_last_date',
  KEY_STREAK: 'idiotphone_habits_streak',

  habits: [],
  streak: 0,

  init() {
    this.checkDayReset();
    this.loadHabits();
    this.renderUI();
  },

  getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  checkDayReset() {
    const today = this.getTodayString();
    const lastDate = localStorage.getItem(this.KEY_LAST_DATE);
    this.streak = parseInt(localStorage.getItem(this.KEY_STREAK) || '0', 10);

    if (lastDate && lastDate !== today) {
      // Check if yesterday's habits were finished
      try {
        const stored = JSON.parse(localStorage.getItem(this.KEY_HABITS) || '[]');
        const allDone = stored.length > 0 && stored.every(h => h.done);
        if (allDone) {
          this.streak += 1;
        } else {
          // Streak broken if yesterday was missed and gap > 1 day
          const diffDays = Math.round((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
          if (diffDays > 1) {
            this.streak = 0;
          }
        }
        localStorage.setItem(this.KEY_STREAK, this.streak);

        // Reset habits for new day
        const resetHabits = stored.map(h => ({ ...h, done: false }));
        localStorage.setItem(this.KEY_HABITS, JSON.stringify(resetHabits));
      } catch (e) {}

      localStorage.setItem(this.KEY_LAST_DATE, today);
    } else if (!lastDate) {
      localStorage.setItem(this.KEY_LAST_DATE, today);
    }
  },

  loadHabits() {
    try {
      const data = localStorage.getItem(this.KEY_HABITS);
      if (data) {
        this.habits = JSON.parse(data);
      } else {
        this.habits = [
          { id: 1, text: 'Drink 2L Water', done: false },
          { id: 2, text: 'Read 20 Pages', done: false },
          { id: 3, text: 'Walk 5000 Steps', done: false },
          { id: 4, text: 'No Screen 1hr Before Bed', done: false },
          { id: 5, text: '45min Deep Work / Focus', done: false }
        ];
        this.saveHabits();
      }
    } catch (e) {
      this.habits = [];
    }
  },

  saveHabits() {
    localStorage.setItem(this.KEY_HABITS, JSON.stringify(this.habits));
  },

  toggleHabit(id) {
    const habit = this.habits.find(h => h.id === id);
    if (!habit) return;
    habit.done = !habit.done;
    this.saveHabits();
    this.renderUI();
    if (window.SoundManager) SoundManager.playClick();

    // Check if all done
    if (this.habits.length > 0 && this.habits.every(h => h.done)) {
      if (window.Desktop) {
        Desktop.showRetroNotification('Habits 98', '🎉 Congratulations! You completed all daily habits for today!', 'info');
      }
    }
  },

  addHabit() {
    const input = document.getElementById('habits-new-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    this.habits.push({
      id: Date.now(),
      text: text,
      done: false
    });
    input.value = '';
    this.saveHabits();
    this.renderUI();
  },

  removeHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this.saveHabits();
    this.renderUI();
  },

  renderUI() {
    const list = document.getElementById('habits-list');
    const streakEl = document.getElementById('habits-streak-count');
    const progressText = document.getElementById('habits-progress-text');
    const progressBar = document.getElementById('habits-progress-bar');

    if (streakEl) streakEl.textContent = `${this.streak} days 🔥`;

    const total = this.habits.length;
    const completed = this.habits.filter(h => h.done).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (progressText) progressText.textContent = `${completed}/${total} completed (${pct}%)`;
    if (progressBar) progressBar.style.width = `${pct}%`;

    if (list) {
      if (this.habits.length === 0) {
        list.innerHTML = '<div style="padding:10px; color:#666; text-align:center;">No habits added yet. Type below to add one!</div>';
        return;
      }
      list.innerHTML = this.habits.map(h => `
        <div class="retro-list-item" style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px;">
          <label style="display:flex; align-items:center; gap:8px; flex:1; cursor:pointer; ${h.done ? 'text-decoration:line-through; color:#777;' : 'font-weight:bold;'}">
            <input type="checkbox" ${h.done ? 'checked' : ''} onchange="AppHabits.toggleHabit(${h.id})">
            <span>${h.text}</span>
          </label>
          <button onclick="AppHabits.removeHabit(${h.id})" style="min-width:22px; height:22px; padding:0; font-size:10px;">✕</button>
        </div>
      `).join('');
    }
  }
};

window.AppHabits = AppHabits;
