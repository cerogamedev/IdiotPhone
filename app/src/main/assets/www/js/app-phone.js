// app-phone.js - Windows 98 Phone Dialer, Call Log & Speed Dial for IdiotPhone

const AppPhone = {
  currentNumber: "",
  speedDial: {},

  init() {
    this.loadSpeedDial();
    this.renderKeypad();
    this.initTabs();
  },

  loadSpeedDial() {
    try {
      const saved = localStorage.getItem("idiotphone_speed_dial");
      this.speedDial = saved ? JSON.parse(saved) : { "1": "112" };
    } catch (e) {
      this.speedDial = { "1": "112" };
    }
  },

  saveSpeedDial() {
    try {
      localStorage.setItem("idiotphone_speed_dial", JSON.stringify(this.speedDial));
    } catch (e) {}
    this.renderSpeedDialList();
  },

  initTabs() {
    const tabKeypad = document.getElementById("phone-tab-keypad");
    const tabLog = document.getElementById("phone-tab-log");
    const tabSpeed = document.getElementById("phone-tab-speed");
    const viewKeypad = document.getElementById("phone-view-keypad");
    const viewLog = document.getElementById("phone-view-log");
    const viewSpeed = document.getElementById("phone-view-speed");

    const selectTab = (activeTab, activeView) => {
      [tabKeypad, tabLog, tabSpeed].forEach(t => t && t.classList.remove("active"));
      [viewKeypad, viewLog, viewSpeed].forEach(v => v && (v.style.display = "none"));
      if (activeTab) activeTab.classList.add("active");
      if (activeView) activeView.style.display = "block";
    };

    if (tabKeypad) tabKeypad.addEventListener("click", () => selectTab(tabKeypad, viewKeypad));
    if (tabLog) tabLog.addEventListener("click", () => {
      selectTab(tabLog, viewLog);
      this.loadCallLog();
    });
    if (tabSpeed) tabSpeed.addEventListener("click", () => {
      selectTab(tabSpeed, viewSpeed);
      this.renderSpeedDialList();
    });
  },

  renderKeypad() {
    const keypadContainer = document.getElementById("dialer-keypad");
    const keys = [
      { d: "1", s: "" }, { d: "2", s: "ABC" }, { d: "3", s: "DEF" },
      { d: "4", s: "GHI" }, { d: "5", s: "JKL" }, { d: "6", s: "MNO" },
      { d: "7", s: "PQRS" }, { d: "8", s: "TUV" }, { d: "9", s: "WXYZ" },
      { d: "*", s: "" }, { d: "0", s: "+" }, { d: "#", s: "" }
    ];

    keypadContainer.innerHTML = "";
    keys.forEach(k => {
      const btn = document.createElement("button");
      btn.className = "dial-btn";
      btn.innerHTML = `<span>${k.d}</span>${k.s ? `<span class="dial-sub">${k.s}</span>` : ''}`;

      let holdTimer = null;
      let isHold = false;

      const startHold = () => {
        isHold = false;
        if (this.speedDial[k.d]) {
          holdTimer = setTimeout(() => {
            isHold = true;
            SoundManager.playDing();
            this.setNumber(this.speedDial[k.d]);
            this.makeCall();
          }, 650);
        }
      };

      const clearHold = () => {
        clearTimeout(holdTimer);
      };

      btn.addEventListener("mousedown", startHold);
      btn.addEventListener("touchstart", startHold, { passive: true });
      btn.addEventListener("mouseup", clearHold);
      btn.addEventListener("mouseleave", clearHold);
      btn.addEventListener("touchend", clearHold);

      btn.addEventListener("click", () => {
        if (!isHold) {
          this.appendDigit(k.d);
        }
      });

      keypadContainer.appendChild(btn);
    });
  },

  appendDigit(digit) {
    SoundManager.playClick();
    this.currentNumber += digit;
    this.updateDisplay();
  },

  backspace() {
    SoundManager.playClick();
    this.currentNumber = this.currentNumber.slice(0, -1);
    this.updateDisplay();
  },

  clearNumber() {
    SoundManager.playClick();
    this.currentNumber = "";
    this.updateDisplay();
  },

  setNumber(num) {
    this.currentNumber = num || "";
    this.updateDisplay();
    const tab = document.getElementById("phone-tab-keypad");
    if (tab) tab.click();
  },

  updateDisplay() {
    const display = document.getElementById("dialer-display-num");
    if (display) {
      display.textContent = this.currentNumber || " ";
    }
  },

  makeCall() {
    if (!this.currentNumber.trim()) {
      SoundManager.playChord();
      return;
    }
    SoundManager.playClick();
    if (window.AndroidBridge) {
      window.AndroidBridge.makeCall(this.currentNumber.trim());
    } else {
      alert("Making call to: " + this.currentNumber);
    }
  },

  loadCallLog() {
    const listContainer = document.getElementById("call-log-list");
    listContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Loading call history...</div>';

    let calls = [];
    if (window.AndroidBridge) {
      try {
        const json = window.AndroidBridge.getCallLogJson();
        calls = JSON.parse(json);
      } catch (e) {
        console.error("Error parsing call log", e);
      }
    }

    if (calls.length === 0) {
      listContainer.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">No recent calls found.</div>';
      return;
    }

    listContainer.innerHTML = "";
    calls.forEach(c => {
      const item = document.createElement("div");
      item.className = "retro-list-item";

      const typeSymbol = c.type === "missed" ? "🔴 Missed" : (c.type === "incoming" ? "📥 Incoming" : "📤 Outgoing");
      const dateStr = new Date(c.date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

      item.innerHTML = `
        <div>
          <div style="font-weight: bold;">${c.name || c.number}</div>
          <div style="color: #666; font-size: 10px;">${typeSymbol} • ${c.number} • ${dateStr}</div>
        </div>
        <div>
          <button class="action-btn" style="min-width: 45px; height: 22px; font-size: 10px;">Call</button>
        </div>
      `;

      item.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        this.setNumber(c.number);
        this.makeCall();
      });

      item.addEventListener("click", () => {
        this.setNumber(c.number);
      });

      listContainer.appendChild(item);
    });
  },

  renderSpeedDialList() {
    const container = document.getElementById("speed-dial-list");
    if (!container) return;

    container.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
      const digit = String(i);
      const val = this.speedDial[digit] || "";

      const row = document.createElement("div");
      row.className = "retro-list-item";
      row.style.gap = "8px";
      row.innerHTML = `
        <span style="font-weight: bold; width: 20px;">[${digit}]</span>
        <input type="text" value="${val}" placeholder="Phone number" style="flex: 1; height: 24px; font-size: 11px;">
        <button style="min-width: 45px; height: 22px; font-size: 10px;">Save</button>
      `;

      const input = row.querySelector("input");
      row.querySelector("button").addEventListener("click", () => {
        SoundManager.playClick();
        if (input.value.trim()) {
          this.speedDial[digit] = input.value.trim();
        } else {
          delete this.speedDial[digit];
        }
        this.saveSpeedDial();
        Desktop.showRetroNotification("Speed Dial Updated", `Key [${digit}] assigned to ${input.value.trim()}`, "info");
      });

      container.appendChild(row);
    }
  },

  answerIncomingCall() {
    SoundManager.playClick();
    const dlg = document.getElementById("dlg-incoming-call");
    if (dlg) dlg.style.display = "none";
    const number = document.getElementById("incoming-call-number").textContent;
    if (window.AndroidBridge) {
      window.AndroidBridge.makeCall(number);
    }
  },

  declineIncomingCall() {
    SoundManager.playClick();
    const dlg = document.getElementById("dlg-incoming-call");
    if (dlg) dlg.style.display = "none";
  }
};

window.AppPhone = AppPhone;
document.addEventListener("DOMContentLoaded", () => AppPhone.init());
