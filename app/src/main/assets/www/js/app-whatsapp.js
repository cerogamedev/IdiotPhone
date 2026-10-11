// app-whatsapp.js - Windows 98 MSN Messenger / WhatsApp Edition for IdiotPhone

const AppWhatsApp = {
  chatHistory: [],

  init() {
    this.initTabs();
    this.loadChatHistory();
    this.initQuickResponses();
    this.initContactSelector();
  },

  initTabs() {
    const tabWeb = document.getElementById("wa-tab-web");
    const tabChat = document.getElementById("wa-tab-chat");
    const viewWeb = document.getElementById("wa-view-web");
    const viewChat = document.getElementById("wa-view-chat");

    if (tabWeb) {
      tabWeb.addEventListener("click", () => {
        tabWeb.classList.add("active");
        tabChat.classList.remove("active");
        viewWeb.style.display = "flex";
        viewChat.style.display = "none";
      });
    }

    if (tabChat) {
      tabChat.addEventListener("click", () => {
        tabChat.classList.add("active");
        tabWeb.classList.remove("active");
        viewWeb.style.display = "none";
        viewChat.style.display = "flex";
        this.populateContactDropdown();
      });
    }
  },

  initContactSelector() {
    const sel = document.getElementById("wa-contact-select");
    if (sel) {
      sel.addEventListener("change", (e) => {
        if (e.target.value) {
          document.getElementById("wa-recipient-input").value = e.target.value;
        }
      });
    }
  },

  populateContactDropdown() {
    const sel = document.getElementById("wa-contact-select");
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Or choose from contacts --</option>';
    const contacts = (window.AppContacts && window.AppContacts.contacts) ? window.AppContacts.contacts : [];
    contacts.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.number;
      opt.textContent = `${c.name} (${c.number})`;
      sel.appendChild(opt);
    });
  },

  loadChatHistory() {
    try {
      const saved = localStorage.getItem("idiotphone_wa_history");
      if (saved) this.chatHistory = JSON.parse(saved);
    } catch (e) {
      this.chatHistory = [];
    }
    this.renderChatHistory();
  },

  renderChatHistory() {
    const list = document.getElementById("wa-history-list");
    if (!list) return;

    if (this.chatHistory.length === 0) {
      list.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">No sent messages yet. Type a message below to start chatting.</div>';
      return;
    }

    list.innerHTML = "";
    this.chatHistory.forEach(item => {
      const el = document.createElement("div");
      el.className = "retro-list-item";
      const timeStr = new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      el.innerHTML = `
        <div style="flex: 1; overflow: hidden; padding-right: 4px;">
          <div style="font-weight: bold; color: #008000; font-size: 11px;">To: ${item.recipient}</div>
          <div style="color: #222; font-size: 11px; margin-top: 2px;">${item.message}</div>
          <div style="color: #888; font-size: 9px; margin-top: 1px;">Sent: ${timeStr}</div>
        </div>
        <div style="display: flex; gap: 3px; flex-shrink: 0;">
          <button class="wa-resend-btn" style="min-width: 36px; height: 20px; font-size: 9px;">Resend</button>
        </div>
      `;

      el.querySelector(".wa-resend-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("wa-recipient-input").value = item.recipient;
        document.getElementById("wa-message-input").value = item.message;
        document.getElementById("wa-message-input").focus();
      });

      el.addEventListener("click", () => {
        document.getElementById("wa-recipient-input").value = item.recipient;
      });

      list.appendChild(el);
    });
  },

  initQuickResponses() {
    const container = document.getElementById("wa-quick-replies");
    if (!container) return;

    const replies = [
      "OK", "On my way", "Call me later", "Where are you?", "Talk soon",
      "Running late", "Can't talk now", "Please call urgent", "Thanks!"
    ];

    container.innerHTML = "";
    replies.forEach(r => {
      const btn = document.createElement("button");
      btn.textContent = r;
      btn.style.minWidth = "auto";
      btn.style.padding = "2px 6px";
      btn.style.fontSize = "10px";
      btn.addEventListener("click", () => {
        SoundManager.playClick();
        const msgInput = document.getElementById("wa-message-input");
        msgInput.value = (msgInput.value ? msgInput.value + " " : "") + r;
        msgInput.focus();
      });
      container.appendChild(btn);
    });
  },

  openQuickChat(prefillNumber = "") {
    const tabChat = document.getElementById("wa-tab-chat");
    if (tabChat) tabChat.click();

    if (prefillNumber) {
      document.getElementById("wa-recipient-input").value = prefillNumber;
    }
    const msgInput = document.getElementById("wa-message-input");
    if (msgInput) msgInput.focus();
  },

  sendWhatsAppMessage() {
    const recipient = document.getElementById("wa-recipient-input").value.trim();
    const message = document.getElementById("wa-message-input").value.trim();
    const errorEl = document.getElementById("wa-chat-error");

    if (!recipient) {
      SoundManager.playChord();
      if (errorEl) errorEl.textContent = "Please enter a phone number or select a contact.";
      return;
    }
    if (!message) {
      SoundManager.playChord();
      if (errorEl) errorEl.textContent = "Please enter a message.";
      return;
    }

    if (errorEl) errorEl.textContent = "";
    SoundManager.playClick();

    let success = false;
    if (window.AndroidBridge) {
      success = window.AndroidBridge.openWhatsAppDirect(recipient, message);
    } else {
      window.open(`https://api.whatsapp.com/send?phone=${recipient}&text=${encodeURIComponent(message)}`, "_blank");
      success = true;
    }

    if (success) {
      this.chatHistory.unshift({ recipient, message, time: Date.now() });
      if (this.chatHistory.length > 50) this.chatHistory.pop();
      try {
        localStorage.setItem("idiotphone_wa_history", JSON.stringify(this.chatHistory));
      } catch (e) {}
      this.renderChatHistory();

      document.getElementById("wa-message-input").value = "";
      Desktop.showRetroNotification("WhatsApp Message Sent", `Dispatched to ${recipient}`, "info");
    }
  },

  openFullWeb() {
    SoundManager.playClick();
    if (window.AndroidBridge && window.AndroidBridge.openRetroBrowser) {
      window.AndroidBridge.openRetroBrowser("https://web.whatsapp.com", "MSN Messenger - WhatsApp Web");
    } else {
      window.open("https://web.whatsapp.com", "_blank");
    }
  }
};

window.AppWhatsApp = AppWhatsApp;
document.addEventListener("DOMContentLoaded", () => AppWhatsApp.init());
