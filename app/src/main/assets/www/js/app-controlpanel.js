// app-controlpanel.js - Windows 98 Control Panel & System Configuration for IdiotPhone

const AppControlPanel = {
  init() {
    this.initSettings();
    this.initWallpapers();
    this.initScreensaverSetting();
    this.checkPermissions();
  },

  initSettings() {
    // Sound toggle
    const soundCheck = document.getElementById("setting-sound-toggle");
    if (soundCheck) {
      soundCheck.checked = (localStorage.getItem("idiotphone_sound") !== "false");
      soundCheck.addEventListener("change", (e) => {
        SoundManager.toggleSound(e.target.checked);
      });
    }

    // Lock toggle
    const lockCheck = document.getElementById("setting-lock-toggle");
    if (lockCheck) {
      let isLock = true;
      if (window.AndroidBridge) {
        isLock = window.AndroidBridge.isLockActive();
      }
      lockCheck.checked = isLock;
      lockCheck.addEventListener("change", (e) => {
        if (window.AndroidBridge) {
          window.AndroidBridge.setLockActive(e.target.checked);
        }
      });
    }

    // Haptics setting
    const hapticSelect = document.getElementById("setting-haptic-select");
    if (hapticSelect) {
      hapticSelect.value = localStorage.getItem("idiotphone_haptic") || "med";
      hapticSelect.addEventListener("change", (e) => {
        localStorage.setItem("idiotphone_haptic", e.target.value);
        SoundManager.playClick();
      });
    }
  },

  initWallpapers() {
    let savedWallpaper = "teal";
    if (window.AndroidBridge) {
      savedWallpaper = window.AndroidBridge.getWallpaperSetting();
    } else {
      savedWallpaper = localStorage.getItem("idiotphone_wallpaper") || "teal";
    }
    this.applyWallpaper(savedWallpaper);

    const selector = document.getElementById("setting-wallpaper-select");
    if (selector) {
      selector.value = savedWallpaper;
      selector.addEventListener("change", (e) => {
        const val = e.target.value;
        this.applyWallpaper(val);
        if (window.AndroidBridge) {
          window.AndroidBridge.setWallpaperSetting(val);
        } else {
          localStorage.setItem("idiotphone_wallpaper", val);
        }
      });
    }
  },

  initScreensaverSetting() {
    const sel = document.getElementById("setting-screensaver-select");
    if (sel) {
      const saved = localStorage.getItem("idiotphone_screensaver_timeout") || "60000";
      sel.value = saved;
      sel.addEventListener("change", (e) => {
        const ms = parseInt(e.target.value, 10);
        if (window.AppScreensaver) {
          window.AppScreensaver.setTimeoutValue(ms);
        }
        SoundManager.playClick();
      });
    }
  },

  applyWallpaper(theme) {
    document.body.className = `theme-${theme}`;
    const monitorPreview = document.getElementById("monitor-preview-screen");
    if (monitorPreview) {
      monitorPreview.className = `theme-${theme}`;
    }
  },

  checkPermissions() {
    const permStatusEl = document.getElementById("setting-permissions-status");
    if (!permStatusEl) return;

    if (window.AndroidBridge) {
      try {
        const json = window.AndroidBridge.checkPermissionsStatus();
        const p = JSON.parse(json);
        const allGranted = p.phone && p.contacts && p.sms && p.location;
        permStatusEl.innerHTML = allGranted
          ? '<span style="color: green;">✓ All permissions granted</span>'
          : '<span style="color: red;">⚠ Some permissions missing</span>';
      } catch (e) {
        permStatusEl.textContent = "Status unknown";
      }
    } else {
      permStatusEl.textContent = "Web preview mode";
    }
  },

  requestPermissions() {
    SoundManager.playClick();
    if (window.AndroidBridge) {
      window.AndroidBridge.requestAllPermissions();
    }
  },

  showChangePinModal() {
    SoundManager.playClick();
    const modal = document.getElementById("dlg-change-pin");
    document.getElementById("change-pin-old").value = "";
    document.getElementById("change-pin-new").value = "";
    document.getElementById("change-pin-confirm").value = "";
    document.getElementById("change-pin-error").textContent = "";
    modal.style.display = "flex";
    Desktop.bringToFront(modal);
  },

  saveNewPin() {
    const oldP = document.getElementById("change-pin-old").value.trim();
    const newP = document.getElementById("change-pin-new").value.trim();
    const confP = document.getElementById("change-pin-confirm").value.trim();
    const errEl = document.getElementById("change-pin-error");

    if (newP.length < 4) {
      SoundManager.playChord();
      errEl.textContent = "New PIN must be at least 4 digits.";
      return;
    }
    if (newP !== confP) {
      SoundManager.playChord();
      errEl.textContent = "New PIN and confirmation do not match.";
      return;
    }

    let success = false;
    if (window.AndroidBridge) {
      success = window.AndroidBridge.changePin(oldP, newP);
    } else {
      const stored = localStorage.getItem("idiotphone_pin");
      if (stored === oldP) {
        localStorage.setItem("idiotphone_pin", newP);
        success = true;
      }
    }

    if (success) {
      SoundManager.playClick();
      document.getElementById("dlg-change-pin").style.display = "none";
      Desktop.showRetroNotification("Security Update", "Master PIN changed successfully.", "info");
    } else {
      SoundManager.playChord();
      errEl.textContent = "Current PIN is incorrect.";
    }
  },

  openAndroidSettingsPrompt() {
    const pin = prompt("Enter Master PIN to open Android Settings:");
    if (pin && window.AndroidBridge && window.AndroidBridge.verifyPin(pin)) {
      window.AndroidBridge.openAndroidSettings(pin);
    } else if (pin) {
      SoundManager.playChord();
      alert("Invalid Master PIN. Access Denied.");
    }
  },

  promptSetDefaultLauncher() {
    SoundManager.playClick();
    if (window.AndroidBridge) {
      window.AndroidBridge.promptSetDefaultLauncher();
    } else {
      alert("Running in web preview mode. Default launcher is set on Android devices.");
    }
  },

  toggleKioskPinning() {
    SoundManager.playClick();
    if (!window.AndroidBridge) {
      alert("App Pinning (Lock Task) is supported on Android devices.");
      return;
    }
    const isPinned = window.AndroidBridge.isKioskPinned();
    if (!isPinned) {
      if (confirm("Enable Android Screen Pinning (Lock Task Mode)?\nThis locks your device into IdiotPhone so Home, Recents, and Status Bar notifications are completely restricted at OS level.")) {
        window.AndroidBridge.startKioskPinning();
      }
    } else {
      const pin = prompt("Enter Master PIN to unpin device / exit Kiosk mode:");
      if (pin && window.AndroidBridge.verifyPin(pin)) {
        window.AndroidBridge.stopKioskPinning(pin);
        Desktop.showRetroNotification("Kiosk Mode", "Device unpinned.", "info");
      } else if (pin) {
        SoundManager.playChord();
        alert("Invalid PIN. Access denied.");
      }
    }
  }
};

window.AppControlPanel = AppControlPanel;
document.addEventListener("DOMContentLoaded", () => AppControlPanel.init());
