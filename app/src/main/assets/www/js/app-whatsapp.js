// app-whatsapp.js - Windows 98 MSN Messenger / WhatsApp Edition for IdiotPhone

const AppWhatsApp = {
  conversations: {},
  currentChat: null,

  init() {
    this.initTabs();
    this.loadConversations();
    this.initSearch();
    this.initIncomingListener();
  },

  initTabs() {
    const tabChats = document.getElementById("wa-tab-chats");
    const tabCompose = document.getElementById("wa-tab-compose");
    const tabWeb = document.getElementById("wa-tab-web");

    const viewChats = document.getElementById("wa-view-chats");
    const viewCompose = document.getElementById("wa-view-compose");
    const viewWeb = document.getElementById("wa-view-web");

    if (tabChats) {
      tabChats.addEventListener("click", () => {
        this.selectTab(tabChats, viewChats);
      });
    }

    if (tabCompose) {
      tabCompose.addEventListener("click", () => {
        this.selectTab(tabCompose, viewCompose);
        this.populateComposeDropdown();
      });
    }

    if (tabWeb) {
      tabWeb.addEventListener("click", () => {
        this.selectTab(tabWeb, viewWeb);
      });
    }
  },

  selectTab(activeTab, activeView) {
    document.querySelectorAll("#win-whatsapp .tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#win-whatsapp .tab-content > div").forEach(v => v.style.display = "none");
    if (activeTab) activeTab.classList.add("active");
    if (activeView) activeView.style.display = "flex";
  },

  initSearch() {
    const searchInput = document.getElementById("wa-search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      this.renderConversationsList(q);
    });
  },

  loadConversations() {
    try {
      const saved = localStorage.getItem("idiotphone_wa_conversations");
      if (saved) {
        this.conversations = JSON.parse(saved);
      } else {
        this.conversations = {};
      }
    } catch (e) {
      this.conversations = {};
    }

    // Sync from AppContacts if available
    if (window.AppContacts && window.AppContacts.contacts && window.AppContacts.contacts.length > 0) {
      this.onContactsLoaded(window.AppContacts.contacts);
    } else {
      this.renderConversationsList();
    }
  },

  saveConversations() {
    try {
      localStorage.setItem("idiotphone_wa_conversations", JSON.stringify(this.conversations));
    } catch (e) {
      console.error("Failed to save WA conversations", e);
    }
  },

  onContactsLoaded(contacts) {
    if (!contacts || !Array.isArray(contacts)) return;

    // Merge contacts into conversations without overwriting existing message histories
    contacts.forEach(c => {
      if (!c.number) return;
      const key = this.normalizeKey(c.number);
      if (!this.conversations[key]) {
        this.conversations[key] = {
          id: key,
          name: c.name || c.number,
          phone: c.number,
          messages: [
            {
              text: "Conversation started with " + (c.name || c.number),
              direction: "system",
              time: Date.now() - 3600000
            }
          ],
          lastTime: Date.now() - 3600000,
          unread: 0
        };
      } else {
        // Update contact name if changed
        if (c.name) this.conversations[key].name = c.name;
        this.conversations[key].phone = c.number;
      }
    });

    this.saveConversations();
    this.renderConversationsList();
  },

  normalizeKey(phone) {
    if (!phone) return "unknown";
    return phone.replace(/[^0-9+]/g, "");
  },

  renderConversationsList(query = "") {
    const listEl = document.getElementById("wa-conversations-list");
    if (!listEl) return;

    const keys = Object.keys(this.conversations);
    if (keys.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 24px 14px; text-align: center; color: #555;">
          <img src="img/whatsapp.png" style="width: 32px; height: 32px; margin-bottom: 6px;"><br>
          <b>No WhatsApp Conversations</b>
          <p style="font-size: 11px; margin: 6px 0 12px 0;">Open your Address Book to sync contacts or tap "New Chat" below.</p>
          <div style="display:flex; justify-content:center; gap:6px;">
            <button onclick="Desktop.openWindow('win-contacts')" style="font-weight:bold;">Open Address Book</button>
            <button onclick="AppWhatsApp.openComposeTab()">+ New Chat</button>
          </div>
        </div>
      `;
      return;
    }

    // Sort by last activity descending
    const sorted = keys
      .map(k => this.conversations[k])
      .sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

    const filtered = sorted.filter(c => {
      if (!query) return true;
      const matchName = c.name && c.name.toLowerCase().includes(query);
      const matchPhone = c.phone && c.phone.includes(query);
      return matchName || matchPhone;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: #666;">No matching conversations.</div>';
      return;
    }

    listEl.innerHTML = "";
    filtered.forEach(item => {
      const el = document.createElement("div");
      el.className = "wa-conversation-item";

      const initial = (item.name && item.name.length > 0) ? item.name.charAt(0).toUpperCase() : "W";
      const lastMsg = (item.messages && item.messages.length > 0) ? item.messages[item.messages.length - 1] : null;
      const snippet = lastMsg ? (lastMsg.direction === 'out' ? '✓ ' + lastMsg.text : lastMsg.text) : 'Tap to start chat';
      const timeStr = item.lastTime ? new Date(item.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      el.innerHTML = `
        <div class="wa-avatar">${this.escapeHtml(initial)}</div>
        <div style="flex: 1; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.name)}</span>
            <span class="wa-item-time" style="font-size: 9px; color: #777;">${timeStr}</span>
          </div>
          <div class="wa-item-subtitle" style="font-size: 10px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
            ${this.escapeHtml(snippet)}
          </div>
        </div>
      `;

      el.addEventListener("click", () => {
        this.openConversation(item.name, item.phone);
      });

      listEl.appendChild(el);
    });
  },

  openConversation(name, phone) {
    SoundManager.playClick();
    const key = this.normalizeKey(phone);
    if (!this.conversations[key]) {
      this.conversations[key] = {
        id: key,
        name: name || phone,
        phone: phone,
        messages: [],
        lastTime: Date.now(),
        unread: 0
      };
      this.saveConversations();
    }

    this.currentChat = this.conversations[key];
    this.currentChat.unread = 0;

    // Show Chat Detail View
    const masterView = document.getElementById("wa-view-chats-list");
    const detailView = document.getElementById("wa-view-chat-thread");
    if (masterView && detailView) {
      masterView.style.display = "none";
      detailView.style.display = "flex";
    }

    // Set header info
    const nameEl = document.getElementById("wa-thread-name");
    const numEl = document.getElementById("wa-thread-number");
    const avatarEl = document.getElementById("wa-thread-avatar");

    if (nameEl) nameEl.textContent = this.currentChat.name;
    if (numEl) numEl.textContent = this.currentChat.phone;
    if (avatarEl) avatarEl.textContent = this.currentChat.name.charAt(0).toUpperCase();

    this.renderMessages();
    this.initThreadQuickReplies();

    const msgInput = document.getElementById("wa-thread-input");
    if (msgInput) {
      msgInput.value = "";
      msgInput.focus();
    }
  },

  backToChatsList() {
    SoundManager.playClick();
    this.currentChat = null;
    const masterView = document.getElementById("wa-view-chats-list");
    const detailView = document.getElementById("wa-view-chat-thread");
    if (masterView && detailView) {
      masterView.style.display = "flex";
      detailView.style.display = "none";
    }
    this.renderConversationsList();
  },

  renderMessages() {
    const box = document.getElementById("wa-messages-box");
    if (!box || !this.currentChat) return;

    box.innerHTML = "";
    const msgs = this.currentChat.messages || [];

    if (msgs.length === 0) {
      box.innerHTML = `
        <div style="margin: auto; text-align: center; color: #777; font-size: 11px;">
          Type a message below or use quick responses to chat with <b>${this.escapeHtml(this.currentChat.name)}</b>.
        </div>
      `;
      return;
    }

    msgs.forEach(m => {
      const bubble = document.createElement("div");
      if (m.direction === "system") {
        bubble.style.cssText = "align-self: center; background: #fff8c4; border: 1px solid #e0c868; font-size: 9px; padding: 3px 8px; border-radius: 3px; color: #555; margin: 4px 0;";
        bubble.textContent = m.text;
      } else {
        bubble.className = "wa-bubble " + (m.direction === "out" ? "wa-bubble-out" : "wa-bubble-in");
        const timeStr = m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        bubble.innerHTML = `
          <div>${this.escapeHtml(m.text)}</div>
          <div class="wa-bubble-meta">
            <span>${timeStr}</span>
            ${m.direction === 'out' ? '<span style="color:#34b7f1; font-weight:bold;">✓✓</span>' : ''}
          </div>
        `;
      }
      box.appendChild(bubble);
    });

    // Auto scroll to bottom
    box.scrollTop = box.scrollHeight;
  },

  initThreadQuickReplies() {
    const container = document.getElementById("wa-thread-quick-replies");
    if (!container) return;

    const replies = [
      "Tamam (OK)", "Yoldayım", "Arayacağım", "Neredesin?",
      "Teşekkürler", "Görüşürüz", "Şu an konuşamam", "Acil ara"
    ];

    container.innerHTML = "";
    replies.forEach(r => {
      const btn = document.createElement("button");
      btn.textContent = r;
      btn.style.cssText = "min-width: auto; padding: 2px 6px; font-size: 10px;";
      btn.addEventListener("click", () => {
        SoundManager.playClick();
        const input = document.getElementById("wa-thread-input");
        if (input) {
          input.value = (input.value ? input.value + " " : "") + r;
          input.focus();
        }
      });
      container.appendChild(btn);
    });
  },

  sendMessage() {
    if (!this.currentChat) return;
    const input = document.getElementById("wa-thread-input");
    const text = input ? input.value.trim() : "";
    if (!text) return;

    SoundManager.playClick();
    const phone = this.currentChat.phone;

    // Append outgoing message
    const msgObj = {
      text: text,
      direction: "out",
      time: Date.now()
    };

    this.currentChat.messages.push(msgObj);
    this.currentChat.lastTime = Date.now();
    this.saveConversations();
    this.renderMessages();

    if (input) input.value = "";

    // Dispatch via AndroidBridge
    if (window.AndroidBridge && window.AndroidBridge.openWhatsAppDirect) {
      window.AndroidBridge.openWhatsAppDirect(phone, text);
    } else {
      window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`, "_blank");
    }

    Desktop.showRetroNotification("WhatsApp Dispatched", `Sent to ${this.currentChat.name}`, "info");
  },

  openInOfficialWhatsApp() {
    if (!this.currentChat) return;
    SoundManager.playClick();
    if (window.AndroidBridge && window.AndroidBridge.openWhatsAppDirect) {
      window.AndroidBridge.openWhatsAppDirect(this.currentChat.phone, "");
    } else {
      window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(this.currentChat.phone)}`, "_blank");
    }
  },

  callCurrentContact() {
    if (!this.currentChat) return;
    SoundManager.playClick();
    Desktop.openWindow("win-phone");
    if (window.AppPhone) {
      AppPhone.setNumber(this.currentChat.phone);
      AppPhone.makeCall();
    }
  },

  initIncomingListener() {
    // Listen for incoming WhatsApp messages captured by IdiotPhoneNotificationService
    window.onIncomingWhatsApp = (sender, body) => {
      this.handleIncomingMessage(sender, body);
    };
  },

  handleIncomingMessage(sender, body) {
    if (!sender || !body) return;
    SoundManager.playNotification();

    // Match or create conversation
    let target = null;
    const keys = Object.keys(this.conversations);
    for (const k of keys) {
      if (this.conversations[k].name === sender || this.conversations[k].phone.includes(sender)) {
        target = this.conversations[k];
        break;
      }
    }

    if (!target) {
      const newKey = this.normalizeKey(sender);
      target = {
        id: newKey,
        name: sender,
        phone: sender,
        messages: [],
        lastTime: Date.now(),
        unread: 0
      };
      this.conversations[newKey] = target;
    }

    target.messages.push({
      text: body,
      direction: "in",
      time: Date.now()
    });
    target.lastTime = Date.now();
    target.unread = (target.unread || 0) + 1;
    this.saveConversations();

    if (this.currentChat && this.currentChat.id === target.id) {
      this.renderMessages();
    } else {
      this.renderConversationsList();
    }

    Desktop.showRetroNotification("WhatsApp: " + sender, body, "info");
  },

  openComposeTab() {
    const tabCompose = document.getElementById("wa-tab-compose");
    if (tabCompose) tabCompose.click();
  },

  populateComposeDropdown() {
    const sel = document.getElementById("wa-compose-contact-select");
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Choose from Address Book --</option>';
    const contacts = (window.AppContacts && window.AppContacts.contacts) ? window.AppContacts.contacts : [];
    contacts.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.number;
      opt.textContent = `${c.name} (${c.number})`;
      sel.appendChild(opt);
    });

    sel.onchange = (e) => {
      if (e.target.value) {
        document.getElementById("wa-compose-phone-input").value = e.target.value;
      }
    };
  },

  sendDirectCompose() {
    const phoneInput = document.getElementById("wa-compose-phone-input");
    const msgInput = document.getElementById("wa-compose-msg-input");
    const errorEl = document.getElementById("wa-compose-error");

    const phone = phoneInput ? phoneInput.value.trim() : "";
    const msg = msgInput ? msgInput.value.trim() : "";

    if (!phone) {
      SoundManager.playChord();
      if (errorEl) errorEl.textContent = "Please enter a phone number.";
      return;
    }
    if (!msg) {
      SoundManager.playChord();
      if (errorEl) errorEl.textContent = "Please enter a message.";
      return;
    }

    if (errorEl) errorEl.textContent = "";

    // Open as active conversation and dispatch
    this.openConversation(phone, phone);
    const threadInput = document.getElementById("wa-thread-input");
    if (threadInput) threadInput.value = msg;
    this.sendMessage();

    // Switch tab back to chats
    const tabChats = document.getElementById("wa-tab-chats");
    if (tabChats) tabChats.click();
  },

  checkNotificationSyncStatus() {
    if (window.AndroidBridge && window.AndroidBridge.isNotificationServiceEnabled) {
      const enabled = window.AndroidBridge.isNotificationServiceEnabled();
      if (!enabled) {
        window.AndroidBridge.openNotificationListenerSettings();
      } else {
        Desktop.showRetroNotification("Sync Active", "WhatsApp background sync is enabled.", "info");
      }
    }
  },

  openFullWeb() {
    SoundManager.playClick();
    if (window.AndroidBridge && window.AndroidBridge.openRetroBrowser) {
      window.AndroidBridge.openRetroBrowser("https://web.whatsapp.com", "MSN Messenger - WhatsApp Web");
    } else {
      window.open("https://web.whatsapp.com", "_blank");
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
};

window.AppWhatsApp = AppWhatsApp;
document.addEventListener("DOMContentLoaded", () => AppWhatsApp.init());
