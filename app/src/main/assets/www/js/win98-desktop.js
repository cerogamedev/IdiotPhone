// win98-desktop.js - Windows 98 Desktop & Window Manager for IdiotPhone

const Desktop = {
  activeWindow: null,
  highestZIndex: 100,
  openWindows: new Map(),

  init() {
    this.initClock();
    this.initBattery();
    this.initStartMenu();
    this.initGlobalEvents();

    // Init new subsystems
    if (window.AppTorch) AppTorch.init();
    if (window.AppEmergency) AppEmergency.init();
    if (window.AppAlarm) AppAlarm.init();
    if (window.AppFocus) AppFocus.init();
    if (window.AppCleanmgr) AppCleanmgr.init();
    if (window.AppShortcuts) AppShortcuts.init();
    if (window.AppVolume) AppVolume.init();
    if (window.AppBackup) AppBackup.init();
    if (window.AppDxDiag) AppDxDiag.init();
    if (window.AppMediaPlayer) AppMediaPlayer.init();
    if (window.AppConverter) AppConverter.init();
    if (window.AppStickyNote) AppStickyNote.init();
    if (window.AppHabits) AppHabits.init();
    if (window.AppSearch) AppSearch.init();
  },

  // ==========================================
  // CLOCK & SYSTEM TRAY
  // ==========================================

  initClock() {
    const clockEl = document.getElementById("tray-clock");
    const update = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      clockEl.textContent = `${hours}:${mins} ${ampm}`;
    };
    update();
    setInterval(update, 1000);
  },

  initBattery() {
    const batteryText = document.getElementById("tray-battery-text");
    const update = () => {
      let percent = 100;
      let charging = false;
      if (window.AndroidBridge) {
        try {
          percent = window.AndroidBridge.getBatteryPercent();
          charging = window.AndroidBridge.isBatteryCharging();
        } catch (e) {}
      }
      if (batteryText) {
        batteryText.textContent = `${percent}%${charging ? '⚡' : ''}`;
      }
    };
    update();
    setInterval(update, 15000);
  },

  // ==========================================
  // START MENU
  // ==========================================

  initStartMenu() {
    const startBtn = document.getElementById("start-button");
    const startMenu = document.getElementById("start-menu");

    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      SoundManager.playClick();
      const isOpen = startMenu.classList.contains("open");
      if (isOpen) {
        this.closeStartMenu();
      } else {
        this.highestZIndex += 1;
        startMenu.style.zIndex = this.highestZIndex + 50;
        startMenu.classList.add("open");
        startBtn.classList.add("active");
      }
    });

    document.addEventListener("click", (e) => {
      if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
        this.closeStartMenu();
      }
    });
  },

  closeStartMenu() {
    const startBtn = document.getElementById("start-button");
    const startMenu = document.getElementById("start-menu");
    if (startMenu) startMenu.classList.remove("open");
    if (startBtn) startBtn.classList.remove("active");
  },

  // ==========================================
  // WINDOW MANAGER
  // ==========================================

  openWindow(id) {
    this.closeStartMenu();
    SoundManager.playClick();

    const win = document.getElementById(id);
    if (!win) return;

    if (win.classList.contains("minimized")) {
      win.classList.remove("minimized");
    }
    win.style.display = "flex";
    this.bringToFront(win);

    // Initial position & mobile sizing
    if (!win.dataset.positioned) {
      this.centerWindow(win);
      win.dataset.positioned = "true";
      this.makeDraggable(win);
    }

    // Module lifecycle triggers
    if (id === 'win-torch' && window.AppTorch) AppTorch.updateState();
    if (id === 'win-emergency' && window.AppEmergency) AppEmergency.renderIceInfo();
    if (id === 'win-alarm' && window.AppAlarm) AppAlarm.renderAlarmsList();
    if (id === 'win-focus' && window.AppFocus) AppFocus.renderUI();
    if (id === 'win-minesweeper' && window.AppMinesweeper) AppMinesweeper.init();
    if (id === 'win-cleanmgr' && window.AppCleanmgr) AppCleanmgr.scanStorage();
    if (id === 'win-volume' && window.AppVolume) AppVolume.syncWithNative();
    if (id === 'win-dxdiag' && window.AppDxDiag) AppDxDiag.loadDiagnostics();
    if (id === 'win-mediaplayer' && window.AppMediaPlayer) AppMediaPlayer.renderTrackList();
    if (id === 'win-habits' && window.AppHabits) AppHabits.renderUI();
    if (id === 'win-search' && window.AppSearch) AppSearch.search('');

    // Add or update taskbar button
    this.updateTaskbar();
    return win;
  },

  centerWindow(win) {
    const isMobile = window.innerWidth < 650;
    if (isMobile) {
      win.style.left = "0px";
      win.style.top = "0px";
      win.style.width = "100vw";
      win.style.height = "calc(100vh - 34px)";
    } else {
      win.style.left = "30px";
      win.style.top = "30px";
      win.style.width = "400px";
      win.style.height = "480px";
    }
  },

  closeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    SoundManager.playClick();
    win.style.display = "none";
    if (this.activeWindow === win) {
      this.activeWindow = null;
    }
    this.updateTaskbar();
  },

  minimizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    SoundManager.playClick();
    win.classList.add("minimized");
    if (this.activeWindow === win) {
      win.classList.add("inactive");
      this.activeWindow = null;
    }
    this.updateTaskbar();
  },

  toggleMaximize(id) {
    const win = document.getElementById(id);
    if (!win) return;
    SoundManager.playClick();
    win.classList.toggle("maximized");
    this.bringToFront(win);
  },

  bringToFront(win) {
    if (this.activeWindow === win && !win.classList.contains("inactive")) return;

    // Set inactive on all other windows
    document.querySelectorAll(".window").forEach(w => {
      w.classList.add("inactive");
    });

    this.highestZIndex += 1;
    win.style.zIndex = this.highestZIndex;
    win.classList.remove("inactive");
    this.activeWindow = win;
    this.updateTaskbar();
  },

  makeDraggable(win) {
    const titleBar = win.querySelector(".title-bar");
    if (!titleBar) return;

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const onStart = (e) => {
      if (win.classList.contains("maximized")) return;
      if (e.target.closest(".title-bar-controls")) return;

      this.bringToFront(win);
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      startX = clientX;
      startY = clientY;
      initialLeft = win.offsetLeft;
      initialTop = win.offsetTop;

      document.addEventListener(e.touches ? "touchmove" : "mousemove", onMove, { passive: false });
      document.addEventListener(e.touches ? "touchend" : "mouseup", onEnd);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Restrict within desktop boundaries
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 60));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - 60));

      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;
    };

    const onEnd = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };

    titleBar.addEventListener("mousedown", onStart);
    titleBar.addEventListener("touchstart", onStart, { passive: true });
    win.addEventListener("mousedown", () => this.bringToFront(win));
    win.addEventListener("touchstart", () => this.bringToFront(win), { passive: true });
  },

  updateTaskbar() {
    const taskbarWindows = document.getElementById("taskbar-windows");
    if (!taskbarWindows) return;
    taskbarWindows.innerHTML = "";

    const windows = document.querySelectorAll(".window");
    windows.forEach(win => {
      if (win.style.display !== "none" && !win.classList.contains("dialog-modal")) {
        const titleText = win.querySelector(".title-bar-text") ? win.querySelector(".title-bar-text").innerText.trim() : "Window";
        const iconSrc = win.querySelector(".title-bar-text img") ? win.querySelector(".title-bar-text img").src : "img/computer.png";

        const btn = document.createElement("button");
        btn.className = "taskbar-tab" + (this.activeWindow === win && !win.classList.contains("minimized") ? " active" : "");
        btn.innerHTML = `<img src="${iconSrc}"><span>${titleText}</span>`;

        btn.addEventListener("click", () => {
          SoundManager.playClick();
          if (win.classList.contains("minimized")) {
            win.classList.remove("minimized");
            this.bringToFront(win);
          } else if (this.activeWindow === win) {
            this.minimizeWindow(win.id);
          } else {
            this.bringToFront(win);
          }
        });

        taskbarWindows.appendChild(btn);
      }
    });
  },

  // ==========================================
  // RETRO NOTIFICATIONS
  // ==========================================

  showRetroNotification(title, message, iconType = "info", onViewCallback = null) {
    SoundManager.playDing();

    const notif = document.getElementById("retro-notification");
    if (!notif) return;

    const titleEl = notif.querySelector(".title-bar-text span");
    const iconEl = notif.querySelector(".dialog-content img");
    const msgEl = notif.querySelector(".dialog-text");
    const viewBtn = document.getElementById("notif-view-btn");
    const okBtn = document.getElementById("notif-ok-btn");

    if (titleEl) titleEl.textContent = title || "IdiotPhone 98";
    if (msgEl) msgEl.textContent = message;

    let iconSrc = "img/msg_info.png";
    if (iconType === "warning") iconSrc = "img/msg_warning.png";
    if (iconType === "error") iconSrc = "img/msg_error.png";
    if (iconEl) iconEl.src = iconSrc;

    if (onViewCallback) {
      viewBtn.style.display = "inline-block";
      viewBtn.onclick = () => {
        SoundManager.playClick();
        notif.style.display = "none";
        onViewCallback();
      };
    } else {
      viewBtn.style.display = "none";
    }

    okBtn.onclick = () => {
      SoundManager.playClick();
      notif.style.display = "none";
    };

    notif.style.display = "flex";
  },

  // ==========================================
  // GLOBAL ANDROID EVENTS
  // ==========================================

  initGlobalEvents() {
    // Back Button Handler
    window.onBackPressed = () => {
      const startMenu = document.getElementById("start-menu");
      if (startMenu && startMenu.classList.contains("open")) {
        this.closeStartMenu();
        return;
      }

      // Check if modal dialog is open
      const shutDownDlg = document.getElementById("dlg-shutdown");
      if (shutDownDlg && shutDownDlg.style.display === "flex") {
        shutDownDlg.style.display = "none";
        return;
      }

      // Check active window
      if (this.activeWindow && this.activeWindow.style.display !== "none") {
        this.closeWindow(this.activeWindow.id);
        return;
      }

      // If at desktop, do nothing (kiosk mode preserves home)
    };

    // Incoming Call Handler
    window.onIncomingCall = (number) => {
      SoundManager.playDing();
      const dlg = document.getElementById("dlg-incoming-call");
      if (dlg) {
        document.getElementById("incoming-call-number").textContent = number || "Unknown Caller";
        dlg.style.display = "flex";
        Desktop.bringToFront(dlg);
      }
    };

    // Auto-dismiss Incoming Call Dialog when caller hangs up
    window.onDismissIncomingCall = () => {
      const dlg = document.getElementById("dlg-incoming-call");
      if (dlg) dlg.style.display = "none";
    };

    // Incoming SMS Handler
    window.onIncomingSms = (sender, body) => {
      this.showRetroNotification(`New SMS from ${sender}`, body, "info", () => {
        Desktop.openWindow("win-sms");
        if (window.AppSMS && window.AppSMS.loadInbox) {
          window.AppSMS.loadInbox();
        }
      });
    };

    // Real-time Battery Updates from Android Broadcast
    window.onBatteryChanged = (pct, charging) => {
      const batteryText = document.getElementById("tray-battery-text");
      if (batteryText) {
        batteryText.textContent = `${pct}%${charging ? '⚡' : ''}`;
      }
    };

    // Screen Locked Resume Handler (only triggered if screen actually turned off)
    window.onScreenLockedResume = () => {
      if (window.AndroidBridge && window.AndroidBridge.isLockActive()) {
        if (window.AppLockScreen) {
          window.AppLockScreen.show();
        }
      }
    };

    // General Resume Handler (refreshes data without unwanted lock screen)
    window.onDeviceResume = () => {
      this.initBattery();
    };

    // Permissions Updated
    window.onPermissionsUpdated = () => {
      if (window.AppContacts) window.AppContacts.loadContacts();
      if (window.AppPhone) window.AppPhone.loadCallLog();
      if (window.AppSMS) window.AppSMS.loadInbox();
    };
  },

  // ==========================================
  // SHUT DOWN & EXIT TO ANDROID (PIN PROTECTED)
  // ==========================================

  showShutDownDialog() {
    this.closeStartMenu();
    SoundManager.playClick();
    const dlg = document.getElementById("dlg-shutdown");
    if (dlg) {
      dlg.style.display = "flex";
      this.bringToFront(dlg);
    }
  },

  executeShutDownAction() {
    const action = document.querySelector('input[name="shutdown_action"]:checked').value;
    const dlg = document.getElementById("dlg-shutdown");

    if (action === "lock") {
      dlg.style.display = "none";
      if (window.AppLockScreen) window.AppLockScreen.show();
    } else if (action === "launcher") {
      dlg.style.display = "none";
      if (window.AppControlPanel) window.AppControlPanel.promptSetDefaultLauncher();
    } else if (action === "restart") {
      dlg.style.display = "none";
      location.reload();
    } else if (action === "exit") {
      // Exit to Android Launcher requires Master PIN!
      dlg.style.display = "none";
      this.promptExitPin();
    }
  },

  promptExitPin() {
    const pinDlg = document.getElementById("dlg-exit-pin");
    const pinInput = document.getElementById("exit-pin-input");
    const pinError = document.getElementById("exit-pin-error");

    pinInput.value = "";
    pinError.textContent = "";
    pinDlg.style.display = "flex";
    this.bringToFront(pinDlg);
    pinInput.focus();

    if (!pinInput.dataset.enterBound) {
      pinInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.confirmExitPin();
      });
      pinInput.dataset.enterBound = "true";
    }
  },

  confirmExitPin() {
    const pinInput = document.getElementById("exit-pin-input");
    const pinError = document.getElementById("exit-pin-error");
    const pin = pinInput.value.trim();

    if (window.AndroidBridge && window.AndroidBridge.verifyPin(pin)) {
      SoundManager.playClick();
      document.getElementById("dlg-exit-pin").style.display = "none";
      window.AndroidBridge.exitToAndroid(pin);
    } else {
      SoundManager.playChord();
      pinError.textContent = "The password you entered is incorrect. Access denied.";
      pinInput.value = "";
      pinInput.focus();
    }
  },

  showRunDialog() {
    this.closeStartMenu();
    SoundManager.playClick();
    const dlg = document.getElementById("dlg-run");
    const input = document.getElementById("run-cmd-input");
    if (dlg && input) {
      input.value = "";
      dlg.style.display = "flex";
      this.bringToFront(dlg);
      input.focus();
      if (!input.dataset.bound) {
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") this.executeRunCommand();
        });
        input.dataset.bound = "true";
      }
    }
  },

  executeRunCommand() {
    const input = document.getElementById("run-cmd-input");
    const cmd = input ? input.value.trim().toLowerCase() : "";
    document.getElementById("dlg-run").style.display = "none";

    const commandMap = {
      "calc": "win-calc", "calculator": "win-calc",
      "notepad": "win-notepad", "note": "win-notepad",
      "dialer": "win-phone", "phone": "win-phone",
      "contacts": "win-contacts", "wab": "win-contacts", "address": "win-contacts",
      "sms": "win-sms", "messages": "win-sms", "inbox": "win-sms",
      "wa": "win-whatsapp", "whatsapp": "win-whatsapp",
      "mail": "win-gmail", "gmail": "win-gmail",
      "maps": "win-maps", "map": "win-maps",
      "rec": "win-recorder", "recorder": "win-recorder", "sndrec32": "win-recorder",
      "control": "win-controlpanel", "settings": "win-controlpanel",
      "torch": "win-torch", "flashlight": "win-torch",
      "sos": "win-emergency", "emergency": "win-emergency",
      "alarm": "win-alarm", "clock": "win-alarm", "timer": "win-alarm",
      "focus": "win-focus", "standby": "win-focus",
      "mine": "win-minesweeper", "mines": "win-minesweeper", "minesweeper": "win-minesweeper", "winmine": "win-minesweeper",
      "cleanmgr": "win-cleanmgr", "cleanup": "win-cleanmgr",
      "volume": "win-volume", "mixer": "win-volume", "sndvol32": "win-volume",
      "backup": "win-backup", "regedit": "win-backup",
      "dxdiag": "win-dxdiag",
      "mplayer": "win-mediaplayer", "wmplayer": "win-mediaplayer", "music": "win-mediaplayer", "media": "win-mediaplayer",
      "convert": "win-converter", "converter": "win-converter",
      "sticky": "win-stickynote", "stickynote": "win-stickynote", "postit": "win-stickynote",
      "habits": "win-habits", "routine": "win-habits", "todo": "win-habits",
      "find": "win-search", "search": "win-search"
    };

    if (cmd === "lock") {
      AppLockScreen.show();
    } else if (commandMap[cmd]) {
      this.openWindow(commandMap[cmd]);
    } else if (cmd) {
      SoundManager.playChord();
      this.showRetroNotification("Cannot find file", `Windows cannot find '${cmd}'. Make sure you typed the name correctly, and then try again.`, "error");
    }
  },

  showVolumeControl() {
    SoundManager.playClick();
    const dlg = document.getElementById("dlg-volume");
    if (dlg) {
      dlg.style.display = dlg.style.display === "flex" ? "none" : "flex";
      this.bringToFront(dlg);
    }
  },

  showBatteryInfo() {
    SoundManager.playClick();
    const dlg = document.getElementById("dlg-battery-info");
    if (dlg) {
      dlg.style.display = dlg.style.display === "flex" ? "none" : "flex";
      this.bringToFront(dlg);
    }
  }
};

window.Desktop = Desktop;
document.addEventListener("DOMContentLoaded", () => Desktop.init());
