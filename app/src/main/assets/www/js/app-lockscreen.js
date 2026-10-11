// app-lockscreen.js - Windows 98 Logon Screen & First-Run Master PIN Setup

const AppLockScreen = {
  isLocked: true,

  init() {
    this.checkStatus();
    const logonInput = document.getElementById("logon-pin-input");
    if (logonInput) {
      logonInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.submitLogon();
      });
    }
    const setup2 = document.getElementById("setup-pin-2");
    if (setup2) {
      setup2.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.submitSetupPin();
      });
    }
  },

  checkStatus() {
    const lockScreen = document.getElementById("lock-screen");
    const setupView = document.getElementById("lock-setup-view");
    const logonView = document.getElementById("lock-logon-view");

    let pinIsSet = false;
    if (window.AndroidBridge) {
      pinIsSet = window.AndroidBridge.isPinSet();
    } else {
      pinIsSet = localStorage.getItem("idiotphone_pin") !== null;
    }

    if (!pinIsSet) {
      // First boot: Show Setup Wizard
      setupView.style.display = "block";
      logonView.style.display = "none";
      lockScreen.classList.remove("hidden");
      this.isLocked = true;
    } else {
      // Normal lock screen
      setupView.style.display = "none";
      logonView.style.display = "block";
      lockScreen.classList.remove("hidden");
      this.isLocked = true;
    }
  },

  show() {
    const lockScreen = document.getElementById("lock-screen");
    const passwordInput = document.getElementById("logon-pin-input");
    const errorMsg = document.getElementById("logon-error-msg");

    if (passwordInput) passwordInput.value = "";
    if (errorMsg) errorMsg.textContent = "";

    lockScreen.classList.remove("hidden");
    this.isLocked = true;
    this.checkStatus();
  },

  unlock() {
    const lockScreen = document.getElementById("lock-screen");
    lockScreen.classList.add("hidden");
    this.isLocked = false;
    SoundManager.playTada();
  },

  // First boot PIN setup
  submitSetupPin() {
    const p1 = document.getElementById("setup-pin-1").value.trim();
    const p2 = document.getElementById("setup-pin-2").value.trim();
    const errorEl = document.getElementById("setup-error-msg");

    if (p1.length < 4) {
      errorEl.textContent = "PIN must be at least 4 digits.";
      SoundManager.playChord();
      return;
    }
    if (p1 !== p2) {
      errorEl.textContent = "PINs do not match. Please re-enter.";
      SoundManager.playChord();
      return;
    }

    let success = false;
    if (window.AndroidBridge) {
      success = window.AndroidBridge.setPin(p1);
    } else {
      localStorage.setItem("idiotphone_pin", p1);
      success = true;
    }

    if (success) {
      this.unlock();
      Desktop.showRetroNotification("Security Setup Complete", "Your master PIN has been set. Use it whenever you need to shut down or modify system settings.", "info");
    } else {
      errorEl.textContent = "Failed to save PIN.";
    }
  },

  // Logon attempt
  submitLogon() {
    const input = document.getElementById("logon-pin-input");
    const errorMsg = document.getElementById("logon-error-msg");
    const entered = input.value.trim();

    let verified = false;
    if (window.AndroidBridge) {
      verified = window.AndroidBridge.verifyPin(entered);
    } else {
      verified = (entered === localStorage.getItem("idiotphone_pin"));
    }

    if (verified) {
      this.unlock();
    } else {
      SoundManager.playChord();
      errorMsg.textContent = "The password you entered is incorrect. Access denied.";
      input.value = "";
      input.focus();
    }
  },

  // Pin Keypad helper
  pressKey(digit, targetInputId) {
    SoundManager.playClick();
    const input = document.getElementById(targetInputId);
    if (!input) return;

    if (digit === 'BACK') {
      input.value = input.value.slice(0, -1);
    } else if (digit === 'CLEAR') {
      input.value = "";
    } else {
      input.value += digit;
    }
  },

  openEmergencySOS() {
    SoundManager.playChord();
    if (window.Desktop) {
      Desktop.openWindow("win-emergency");
      const win = document.getElementById("win-emergency");
      if (win) {
        win.style.zIndex = "999999";
      }
    }
  }
};

window.AppLockScreen = AppLockScreen;
document.addEventListener("DOMContentLoaded", () => AppLockScreen.init());
