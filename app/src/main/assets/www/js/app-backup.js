/**
 * IdiotPhone 98 - System Registry Backup & Restore Wizard (RegEdit 98)
 */
const AppBackup = {
    init() {},

    createFullBackup() {
        const backupData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            speedDial: localStorage.getItem('idiotphone_speed_dial'),
            notepad: localStorage.getItem('idiotphone_notepad_autosave'),
            alarms: localStorage.getItem('idiotphone_alarms'),
            iceContact: localStorage.getItem('idiotphone_ice_contact'),
            iceName: localStorage.getItem('idiotphone_ice_name'),
            shortcuts: localStorage.getItem('idiotphone_desktop_shortcuts'),
            wallpaper: localStorage.getItem('idiotphone_wallpaper_choice'),
            crtScanlines: localStorage.getItem('idiotphone_crt_scanlines'),
            focusStats: localStorage.getItem('idiotphone_focus_stats')
        };

        const jsonStr = JSON.stringify(backupData, null, 2);

        // Save to native SharedPreferences as permanent safety copy
        if (window.AndroidBridge && window.AndroidBridge.saveBackupData) {
            window.AndroidBridge.saveBackupData(jsonStr);
        }

        const outputArea = document.getElementById('backup-json-textarea');
        if (outputArea) {
            outputArea.value = jsonStr;
        }

        if (window.SoundManager) SoundManager.play('tada');
        if (window.Desktop) Desktop.showNotification('Registry Backup', 'Full system backup created successfully!', 'info');
    },

    restoreFromText() {
        const inputArea = document.getElementById('backup-json-textarea');
        if (!inputArea || !inputArea.value.trim()) {
            alert('Please paste a valid IdiotPhone backup JSON into the box first.');
            return;
        }

        if (!confirm('Restore settings from backup? This will overwrite your current settings and refresh IdiotPhone.')) {
            return;
        }

        try {
            const data = JSON.parse(inputArea.value.trim());
            if (data.speedDial) localStorage.setItem('idiotphone_speed_dial', data.speedDial);
            if (data.notepad) localStorage.setItem('idiotphone_notepad_autosave', data.notepad);
            if (data.alarms) localStorage.setItem('idiotphone_alarms', data.alarms);
            if (data.iceContact) localStorage.setItem('idiotphone_ice_contact', data.iceContact);
            if (data.iceName) localStorage.setItem('idiotphone_ice_name', data.iceName);
            if (data.shortcuts) localStorage.setItem('idiotphone_desktop_shortcuts', data.shortcuts);
            if (data.wallpaper) localStorage.setItem('idiotphone_wallpaper_choice', data.wallpaper);
            if (data.crtScanlines) localStorage.setItem('idiotphone_crt_scanlines', data.crtScanlines);
            if (data.focusStats) localStorage.setItem('idiotphone_focus_stats', data.focusStats);

            if (window.SoundManager) SoundManager.play('tada');
            alert('Settings restored successfully! Reloading IdiotPhone...');
            window.location.reload();
        } catch (e) {
            alert('Error parsing backup JSON. Please check formatting.');
        }
    },

    restoreFromDeviceStorage() {
        if (window.AndroidBridge && window.AndroidBridge.loadBackupData) {
            const saved = window.AndroidBridge.loadBackupData();
            if (!saved) {
                alert('No previous backup found in device internal storage.');
                return;
            }
            const outputArea = document.getElementById('backup-json-textarea');
            if (outputArea) outputArea.value = saved;
            this.restoreFromText();
        }
    }
};

window.AppBackup = AppBackup;
