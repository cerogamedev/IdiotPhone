/**
 * IdiotPhone 98 - Focus Mode & Dumbphone Standby
 */
const AppFocus = {
    KEY_STATS: 'idiotphone_focus_stats',
    isFocusActive: false,
    endTime: null,
    timerInterval: null,
    previousRingerMode: 2,

    init() {
        this.renderStats();
    },

    startFocus(minutes) {
        if (this.isFocusActive) {
            alert('Focus session already active!');
            return;
        }

        this.isFocusActive = true;
        this.endTime = Date.now() + minutes * 60 * 1000;

        // Save and mute ringer
        if (window.AndroidBridge && window.AndroidBridge.getRingerMode) {
            this.previousRingerMode = window.AndroidBridge.getRingerMode();
            if (window.AndroidBridge.setRingerMode) {
                window.AndroidBridge.setRingerMode(0); // Silent
            }
        }

        if (window.Desktop) {
            Desktop.showNotification('Focus Mode Active', `Distraction-free mode for ${minutes} minutes.`, 'info');
        }
        if (window.SoundManager) SoundManager.play('click');

        this.renderUI();
        this.timerInterval = setInterval(() => {
            const diff = this.endTime - Date.now();
            if (diff <= 0) {
                this.completeFocus(minutes);
            } else {
                this.renderUI();
            }
        }, 1000);
    },

    stopFocus() {
        if (!this.isFocusActive) return;
        if (!confirm('End current focus session early?')) return;

        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isFocusActive = false;
        this.endTime = null;

        // Restore ringer
        if (window.AndroidBridge && window.AndroidBridge.setRingerMode) {
            window.AndroidBridge.setRingerMode(this.previousRingerMode);
        }

        if (window.Desktop) Desktop.showNotification('Focus Mode Ended', 'Sound profile restored.', 'info');
        this.renderUI();
    },

    completeFocus(minutes) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isFocusActive = false;
        this.endTime = null;

        // Restore ringer
        if (window.AndroidBridge && window.AndroidBridge.setRingerMode) {
            window.AndroidBridge.setRingerMode(this.previousRingerMode);
        }

        // Add stats
        let stats = this.getStats();
        stats.totalMinutes += minutes;
        stats.sessions += 1;
        localStorage.setItem(this.KEY_STATS, JSON.stringify(stats));

        if (window.SoundManager) SoundManager.play('tada');
        if (window.Desktop) Desktop.showNotification('Focus Completed! 🏆', `Great work! ${minutes} mins distraction-free.`, 'info');
        
        this.renderStats();
        this.renderUI();
    },

    getStats() {
        try {
            const d = localStorage.getItem(this.KEY_STATS);
            return d ? JSON.parse(d) : { totalMinutes: 0, sessions: 0 };
        } catch (e) {
            return { totalMinutes: 0, sessions: 0 };
        }
    },

    renderStats() {
        const stats = this.getStats();
        const statEl = document.getElementById('focus-stats-display');
        if (statEl) {
            const hrs = (stats.totalMinutes / 60).toFixed(1);
            statEl.textContent = `${hrs} hrs focused across ${stats.sessions} sessions`;
        }
    },

    renderUI() {
        const statusEl = document.getElementById('focus-status-text');
        const countdownEl = document.getElementById('focus-countdown-display');
        const btnCancel = document.getElementById('focus-cancel-btn');
        const trayIcon = document.getElementById('tray-focus-badge');

        if (trayIcon) {
            trayIcon.style.display = this.isFocusActive ? 'inline-block' : 'none';
        }

        if (!this.isFocusActive) {
            if (statusEl) statusEl.textContent = 'STATUS: IDLE';
            if (countdownEl) countdownEl.textContent = '00:00';
            if (btnCancel) btnCancel.style.display = 'none';
            return;
        }

        if (statusEl) statusEl.textContent = 'STATUS: DEEP FOCUS ACTIVE (SILENT)';
        if (btnCancel) btnCancel.style.display = 'inline-block';

        const diff = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        if (countdownEl) countdownEl.textContent = `${m}:${s}`;
    }
};

window.AppFocus = AppFocus;
