/**
 * IdiotPhone 98 - Clock, Alarm & Quick Timers (Alarm 98)
 */
const AppAlarm = {
    KEY_ALARMS: 'idiotphone_alarms',
    alarms: [],
    timerEnd: null,
    timerInterval: null,
    lastCheckedMinute: -1,

    init() {
        this.loadAlarms();
        this.renderAlarmsList();
        this.startBackgroundMonitor();
    },

    loadAlarms() {
        try {
            const data = localStorage.getItem(this.KEY_ALARMS);
            this.alarms = data ? JSON.parse(data) : [
                { id: 1, time: '07:00', label: 'Morning Wakeup', enabled: true },
                { id: 2, time: '22:30', label: 'Wind Down / Sleep', enabled: false }
            ];
        } catch (e) {
            this.alarms = [];
        }
    },

    saveAlarms() {
        localStorage.setItem(this.KEY_ALARMS, JSON.stringify(this.alarms));
    },

    startBackgroundMonitor() {
        setInterval(() => {
            const now = new Date();
            const currentMinute = now.getHours() * 60 + now.getMinutes();
            if (currentMinute !== this.lastCheckedMinute) {
                this.lastCheckedMinute = currentMinute;
                this.checkAlarms(now);
            }
        }, 1000);
    },

    checkAlarms(now) {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${hh}:${mm}`;

        this.alarms.forEach(alarm => {
            if (alarm.enabled && alarm.time === currentTimeStr) {
                this.triggerAlarmAlert(alarm);
            }
        });
    },

    triggerAlarmAlert(alarm) {
        if (window.SoundManager) {
            SoundManager.play('tada');
            SoundManager.vibrate(500);
        }
        if (window.Desktop) {
            Desktop.showNotification('Alarm Alert ⏰', `${alarm.label} (${alarm.time})`, 'warning');
        }

        const dialog = document.getElementById('dialog-alarm-ringing');
        const labelEl = document.getElementById('alarm-ringing-label');
        if (dialog && labelEl) {
            labelEl.textContent = `${alarm.label} (${alarm.time})`;
            dialog.style.display = 'block';
            dialog.style.zIndex = '99999';
        }
    },

    dismissAlarm() {
        const dialog = document.getElementById('dialog-alarm-ringing');
        if (dialog) dialog.style.display = 'none';
        if (window.SoundManager) SoundManager.play('click');
    },

    snoozeAlarm(minutes = 5) {
        this.dismissAlarm();
        const now = new Date();
        now.setMinutes(now.getMinutes() + minutes);
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const snoozeTime = `${hh}:${mm}`;
        
        this.alarms.push({
            id: Date.now(),
            time: snoozeTime,
            label: `Snoozed (${minutes}m)`,
            enabled: true
        });
        this.saveAlarms();
        this.renderAlarmsList();
        if (window.Desktop) Desktop.showNotification('Alarm Snoozed', `Will ring again at ${snoozeTime}`, 'info');
    },

    addAlarm() {
        const time = prompt('Enter alarm time (24h format HH:MM, e.g. 08:30):', '08:00');
        if (!time || !/^\d{2}:\d{2}$/.test(time)) {
            if (time) alert('Invalid time format. Please use HH:MM (e.g. 08:30).');
            return;
        }
        const label = prompt('Alarm label:', 'Alarm') || 'Alarm';
        this.alarms.push({
            id: Date.now(),
            time,
            label,
            enabled: true
        });
        this.saveAlarms();
        this.renderAlarmsList();
        if (window.SoundManager) SoundManager.play('click');
    },

    toggleAlarm(id) {
        const a = this.alarms.find(x => x.id === id);
        if (a) {
            a.enabled = !a.enabled;
            this.saveAlarms();
            this.renderAlarmsList();
            if (window.SoundManager) SoundManager.play('click');
        }
    },

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(x => x.id !== id);
        this.saveAlarms();
        this.renderAlarmsList();
        if (window.SoundManager) SoundManager.play('click');
    },

    startNapTimer(minutes) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerEnd = Date.now() + minutes * 60 * 1000;

        if (window.Desktop) Desktop.showNotification('Timer Started', `${minutes}-minute timer running.`, 'info');
        if (window.SoundManager) SoundManager.play('click');

        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            const remaining = this.timerEnd - Date.now();
            if (remaining <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.timerEnd = null;
                this.updateTimerDisplay();
                this.triggerAlarmAlert({ label: `${minutes}-Minute Timer Finished!`, time: 'Now' });
            } else {
                this.updateTimerDisplay();
            }
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerEnd = null;
        this.updateTimerDisplay();
        if (window.SoundManager) SoundManager.play('click');
    },

    updateTimerDisplay() {
        const display = document.getElementById('alarm-timer-countdown');
        if (!display) return;
        if (!this.timerEnd) {
            display.textContent = '00:00';
            return;
        }
        const diff = Math.max(0, Math.floor((this.timerEnd - Date.now()) / 1000));
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        display.textContent = `${m}:${s}`;
    },

    renderAlarmsList() {
        const container = document.getElementById('alarm-items-list');
        if (!container) return;
        if (this.alarms.length === 0) {
            container.innerHTML = '<div style="padding:12px;color:#808080;text-align:center;">No alarms configured.<br>Click "Add Alarm..." below.</div>';
            return;
        }

        container.innerHTML = this.alarms.map(a => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px;border-bottom:1px solid #dfdfdf;background:${a.enabled ? '#ffffff' : '#f0f0f0'};">
                <div>
                    <strong style="font-size:16px;font-family:'Courier New',monospace;color:${a.enabled ? '#000080' : '#808080'};">${a.time}</strong>
                    <div style="font-size:11px;color:#555;">${a.label}</div>
                </div>
                <div style="display:flex;gap:4px;">
                    <button onclick="AppAlarm.toggleAlarm(${a.id})" style="font-size:11px;padding:2px 8px;">
                        ${a.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="AppAlarm.deleteAlarm(${a.id})" style="font-size:11px;padding:2px 6px;color:#800000;">
                        ✕
                    </button>
                </div>
            </div>
        `).join('');
    }
};

window.AppAlarm = AppAlarm;
