// app-sms.js - Windows 98 SMS Messaging & Inbox for IdiotPhone

const AppSMS = {
  messages: [],
  threads: new Map(),

  init() {
    this.initTabs();
    this.loadInbox();
  },

  initTabs() {
    const tabInbox = document.getElementById("sms-tab-inbox");
    const tabCompose = document.getElementById("sms-tab-compose");
    const viewInbox = document.getElementById("sms-view-inbox");
    const viewCompose = document.getElementById("sms-view-compose");

    tabInbox.addEventListener("click", () => {
      tabInbox.classList.add("active");
      tabCompose.classList.remove("active");
      viewInbox.style.display = "block";
      viewCompose.style.display = "none";
      this.loadInbox();
    });

    tabCompose.addEventListener("click", () => {
      tabCompose.classList.add("active");
      tabInbox.classList.remove("active");
      viewInbox.style.display = "none";
      viewCompose.style.display = "block";
    });
  },

  loadInbox() {
    const listContainer = document.getElementById("sms-list");
    listContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Loading messages...</div>';

    if (window.AndroidBridge) {
      try {
        const json = window.AndroidBridge.getSmsInboxJson();
        this.messages = JSON.parse(json);
      } catch (e) {
        console.error("Error reading SMS", e);
      }
    }

    if (this.messages.length === 0) {
      listContainer.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">Inbox is empty. Click "New Message" to send an SMS.</div>';
      return;
    }

    // Group into threads by address
    this.threads.clear();
    this.messages.forEach(m => {
      if (!this.threads.has(m.address)) {
        this.threads.set(m.address, []);
      }
      this.threads.get(m.address).push(m);
    });

    listContainer.innerHTML = "";
    this.threads.forEach((msgs, addr) => {
      const latest = msgs[0];
      const item = document.createElement("div");
      item.className = "retro-list-item";

      const dateStr = new Date(latest.date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

      item.innerHTML = `
        <div style="flex: 1; overflow: hidden; padding-right: 6px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">${addr}</span>
            <span style="color: #666; font-size: 10px;">${dateStr}</span>
          </div>
          <div style="color: #333; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
            ${latest.body}
          </div>
        </div>
      `;

      item.addEventListener("click", () => {
        this.openThread(addr, msgs);
      });

      listContainer.appendChild(item);
    });
  },

  openThread(address, msgs) {
    SoundManager.playClick();
    const threadDlg = document.getElementById("dlg-sms-thread");
    const threadTitle = document.getElementById("sms-thread-address");
    const threadBody = document.getElementById("sms-thread-messages");
    const replyInput = document.getElementById("sms-thread-reply-input");

    threadTitle.textContent = `Conversation with ${address}`;
    replyInput.value = "";
    threadDlg.dataset.currentAddress = address;

    // Render message bubbles/table
    threadBody.innerHTML = "";
    // Show newest at bottom
    const reversed = [...msgs].reverse();
    reversed.forEach(m => {
      const msgDiv = document.createElement("div");
      const isSent = (m.type === 2);
      msgDiv.style.margin = "4px 0";
      msgDiv.style.textAlign = isSent ? "right" : "left";

      const bubble = document.createElement("div");
      bubble.style.display = "inline-block";
      bubble.style.maxWidth = "80%";
      bubble.style.padding = "6px 8px";
      bubble.style.fontSize = "11px";
      bubble.style.boxShadow = isSent ? "inset -1px -1px #fff, inset 1px 1px #808080" : "inset 1px 1px #fff, inset -1px -1px #808080";
      bubble.style.background = isSent ? "#e0ffe0" : "#ffffff";
      bubble.style.border = "1px solid #808080";
      bubble.style.textAlign = "left";

      const timeStr = new Date(m.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      bubble.innerHTML = `<div>${m.body}</div><div style="font-size: 9px; color: #777; text-align: right; margin-top: 2px;">${timeStr}</div>`;

      msgDiv.appendChild(bubble);
      threadBody.appendChild(msgDiv);
    });

    threadDlg.style.display = "flex";
    Desktop.bringToFront(threadDlg);
    threadBody.scrollTop = threadBody.scrollHeight;
  },

  sendThreadReply() {
    const threadDlg = document.getElementById("dlg-sms-thread");
    const address = threadDlg.dataset.currentAddress;
    const replyInput = document.getElementById("sms-thread-reply-input");
    const text = replyInput.value.trim();

    if (!text || !address) return;

    let success = false;
    if (window.AndroidBridge) {
      success = window.AndroidBridge.sendSms(address, text);
    } else {
      success = true;
    }

    if (success) {
      SoundManager.playClick();
      replyInput.value = "";
      // Add local message
      if (!this.threads.has(address)) this.threads.set(address, []);
      const newMsg = { id: Date.now().toString(), address, body: text, date: Date.now(), type: 2, read: 1 };
      this.threads.get(address).unshift(newMsg);
      this.openThread(address, this.threads.get(address));
    } else {
      SoundManager.playChord();
      alert("Failed to send SMS. Check phone connection & permissions.");
    }
  },

  openCompose(prefillAddress = "") {
    document.getElementById("sms-tab-compose").click();
    document.getElementById("sms-compose-to").value = prefillAddress;
    document.getElementById("sms-compose-body").value = "";
    document.getElementById("sms-compose-error").textContent = "";
    document.getElementById("sms-compose-body").focus();
  },

  sendComposeMessage() {
    const to = document.getElementById("sms-compose-to").value.trim();
    const body = document.getElementById("sms-compose-body").value.trim();
    const errorEl = document.getElementById("sms-compose-error");

    if (!to || !body) {
      SoundManager.playChord();
      errorEl.textContent = "Please specify a recipient and message.";
      return;
    }

    let success = false;
    if (window.AndroidBridge) {
      success = window.AndroidBridge.sendSms(to, body);
    } else {
      success = true;
    }

    if (success) {
      SoundManager.playClick();
      Desktop.showRetroNotification("Message Sent", `SMS delivered to ${to}`, "info");
      document.getElementById("sms-tab-inbox").click();
    } else {
      SoundManager.playChord();
      errorEl.textContent = "Could not send SMS. Check permissions.";
    }
  }
};

window.AppSMS = AppSMS;
document.addEventListener("DOMContentLoaded", () => AppSMS.init());
