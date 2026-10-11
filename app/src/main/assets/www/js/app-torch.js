/**
 * IdiotPhone 98 - Flashlight & Torch Utility (Torch 98)
 */
const AppTorch = {
    isOn: false,
    strobeInterval: null,
    isStrobeActive: false,

    init() {
        this.updateState();
    },

    updateState() {
        if (window.AndroidBridge && window.AndroidBridge.isFlashlightOn) {
            this.isOn = window.AndroidBridge.isFlashlightOn();
        }
        this.renderUI();
    },

    toggle() {
        if (this.isStrobeActive) {
            this.stopStrobe();
        }
        this.isOn = !this.isOn;
        if (window.AndroidBridge && window.AndroidBridge.setFlashlight) {
            window.AndroidBridge.setFlashlight(this.isOn);
        }
        if (window.SoundManager) {
            SoundManager.play('click');
            SoundManager.vibrate(this.isOn ? 40 : 20);
        }
        this.renderUI();
    },

    toggleStrobe() {
        if (this.isStrobeActive) {
            this.stopStrobe();
        } else {
            this.startStrobe();
        }
    },

    startStrobe() {
        this.isStrobeActive = true;
        let step = 0;
        // Morse code SOS: ... --- ... (short=100ms, long=300ms)
        const sequence = [
            1, 0, 1, 0, 1, 0, // S
            0,
            1, 1, 0, 1, 1, 0, 1, 1, 0, // O
            0,
            1, 0, 1, 0, 1, 0, // S
            0, 0, 0 // Pause
        ];
        
        this.strobeInterval = setInterval(() => {
            const state = sequence[step % sequence.length] === 1;
            if (window.AndroidBridge && window.AndroidBridge.setFlashlight) {
                window.AndroidBridge.setFlashlight(state);
            }
            step++;
            this.isOn = state;
            this.renderUI();
        }, 150);

        if (window.SoundManager) SoundManager.play('chord');
        this.renderUI();
    },

    stopStrobe() {
        if (this.strobeInterval) {
            clearInterval(this.strobeInterval);
            this.strobeInterval = null;
        }
        this.isStrobeActive = false;
        this.isOn = false;
        if (window.AndroidBridge && window.AndroidBridge.setFlashlight) {
            window.AndroidBridge.setFlashlight(false);
        }
        this.renderUI();
    },

    toggleScreenTorch() {
        let overlay = document.getElementById('screen-torch-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'screen-torch-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#ffffff;z-index:999999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
            overlay.innerHTML = '<span style="color:#000;font-family:Tahoma,sans-serif;font-size:14px;background:#c0c0c0;padding:8px 16px;border:2px outset #ffffff;">Tap anywhere to close screen torch</span>';
            overlay.onclick = () => {
                document.body.removeChild(overlay);
            };
            document.body.appendChild(overlay);
        } else {
            overlay.remove();
        }
    },

    renderUI() {
        const statusEl = document.getElementById('torch-status-text');
        const bulbEl = document.getElementById('torch-bulb-indicator');
        const btnToggle = document.getElementById('torch-toggle-btn');
        const btnStrobe = document.getElementById('torch-strobe-btn');

        if (statusEl) {
            statusEl.textContent = this.isStrobeActive ? 'STATUS: SOS STROBE ACTIVE' : (this.isOn ? 'STATUS: TORCH IS ON' : 'STATUS: TORCH IS OFF');
            statusEl.style.color = (this.isOn || this.isStrobeActive) ? '#008000' : '#800000';
        }
        if (bulbEl) {
            bulbEl.style.background = (this.isOn || this.isStrobeActive) ? '#ffff00' : '#808080';
            bulbEl.style.boxShadow = (this.isOn || this.isStrobeActive) ? '0 0 20px #ffff00' : 'none';
        }
        if (btnToggle) {
            btnToggle.textContent = this.isOn ? 'Turn OFF' : 'Turn ON';
        }
        if (btnStrobe) {
            btnStrobe.textContent = this.isStrobeActive ? 'Stop SOS Strobe' : 'Emergency SOS Strobe';
        }
    }
};

window.AppTorch = AppTorch;
