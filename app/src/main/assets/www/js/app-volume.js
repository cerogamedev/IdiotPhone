/**
 * IdiotPhone 98 - Volume Mixer & Sound Profiles (Volume 98)
 */
const AppVolume = {
    currentProfile: 2, // 0 = Silent, 1 = Vibrate, 2 = Normal
    volumeLevel: 80,

    init() {
        this.syncWithNative();
        this.renderUI();
    },

    syncWithNative() {
        if (window.AndroidBridge && window.AndroidBridge.getRingerMode) {
            this.currentProfile = window.AndroidBridge.getRingerMode();
        }
        const savedVol = localStorage.getItem('idiotphone_master_volume');
        if (savedVol !== null) {
            this.volumeLevel = parseInt(savedVol, 10);
        }
    },

    setProfile(mode) {
        this.currentProfile = mode;
        if (window.AndroidBridge && window.AndroidBridge.setRingerMode) {
            window.AndroidBridge.setRingerMode(mode);
        }

        const modeNames = ['Silent (Muted)', 'Vibrate Only', 'Normal (Ringing + Sounds)'];
        if (window.Desktop) {
            Desktop.showNotification('Sound Profile', `Switched to ${modeNames[mode]}`, 'info');
        }
        if (window.SoundManager) {
            if (mode !== 0) SoundManager.play('click');
            SoundManager.vibrate(mode === 1 ? 100 : 30);
        }
        this.renderUI();
    },

    setVolume(val) {
        this.volumeLevel = parseInt(val, 10);
        localStorage.setItem('idiotphone_master_volume', this.volumeLevel);
        this.renderUI();
    },

    testSpeaker() {
        if (window.SoundManager) {
            SoundManager.play('chord');
            SoundManager.vibrate(40);
        }
    },

    renderUI() {
        // Update tray icon / profile badge
        const trayProfile = document.getElementById('tray-sound-profile-icon');
        if (trayProfile) {
            if (this.currentProfile === 0) trayProfile.textContent = '🔇';
            else if (this.currentProfile === 1) trayProfile.textContent = '📳';
            else trayProfile.textContent = '🔊';
        }

        // Update profile radio buttons or indicators
        const btnSilent = document.getElementById('vol-btn-silent');
        const btnVibrate = document.getElementById('vol-btn-vibrate');
        const btnNormal = document.getElementById('vol-btn-normal');

        if (btnSilent) btnSilent.style.fontWeight = this.currentProfile === 0 ? 'bold' : 'normal';
        if (btnVibrate) btnVibrate.style.fontWeight = this.currentProfile === 1 ? 'bold' : 'normal';
        if (btnNormal) btnNormal.style.fontWeight = this.currentProfile === 2 ? 'bold' : 'normal';

        const slider = document.getElementById('vol-slider-master');
        const label = document.getElementById('vol-level-label');
        if (slider) slider.value = this.volumeLevel;
        if (label) label.textContent = `${this.volumeLevel}%`;
    }
};

window.AppVolume = AppVolume;
