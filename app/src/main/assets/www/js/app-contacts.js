// app-contacts.js - Windows 98 Address Book for IdiotPhone

const AppContacts = {
  contacts: [],

  init() {
    this.initSearch();
    this.loadContacts();
  },

  loadContacts() {
    const listContainer = document.getElementById("contacts-list");
    const countEl = document.getElementById("contacts-count");
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #555;">Loading Address Book...</div>';

    // Check permission state in Android
    if (window.AndroidBridge && window.AndroidBridge.hasContactsPermission) {
      const hasPerm = window.AndroidBridge.hasContactsPermission();
      if (!hasPerm) {
        listContainer.innerHTML = `
          <div style="padding: 20px 14px; text-align: center;">
            <img src="img/msg_warning.png" style="width: 32px; height: 32px; margin-bottom: 8px;"><br>
            <b style="font-size: 12px; color: #b00000;">Contacts Permission Required</b>
            <p style="font-size: 11px; color: #333; margin: 8px 0 14px 0; line-height: 15px;">
              IdiotPhone requires access to your contacts to display your Address Book and WhatsApp chats.
            </p>
            <button onclick="AppContacts.requestPermission()" style="font-weight: bold; padding: 6px 14px; font-size: 11px; color: #000080;">
              🔑 Grant Contacts Access
            </button>
          </div>
        `;
        if (countEl) countEl.textContent = "Permission needed";
        return;
      }
    }

    if (window.AndroidBridge && window.AndroidBridge.getContactsJson) {
      try {
        const json = window.AndroidBridge.getContactsJson();
        this.contacts = JSON.parse(json);
      } catch (e) {
        console.error("Error loading contacts", e);
        this.contacts = [];
      }
    } else {
      // Sample contacts in browser/preview mode
      const saved = localStorage.getItem("idiotphone_contacts_demo");
      if (saved) {
        this.contacts = JSON.parse(saved);
      } else {
        this.contacts = [
          { id: "1", name: "Mom", number: "+905551234567" },
          { id: "2", name: "Dad", number: "+905552345678" },
          { id: "3", name: "Work Colleague", number: "+905553456789" },
          { id: "4", name: "Emergency ICE", number: "112" }
        ];
      }
    }

    this.renderContacts(this.contacts);

    // Also trigger WhatsApp contact refresh if available
    if (window.AppWhatsApp && window.AppWhatsApp.onContactsLoaded) {
      window.AppWhatsApp.onContactsLoaded(this.contacts);
    }
  },

  requestPermission() {
    SoundManager.playClick();
    if (window.AndroidBridge && window.AndroidBridge.requestContactsPermission) {
      window.AndroidBridge.requestContactsPermission();
    }
  },

  initSearch() {
    const searchInput = document.getElementById("contacts-search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      const cleanDigits = query.replace(/\D/g, "");
      const filtered = this.contacts.filter(c => {
        const nameMatch = c.name && c.name.toLowerCase().includes(query);
        const rawNumMatch = c.number && c.number.toLowerCase().includes(query);
        const cleanNumMatch = cleanDigits.length > 0 && c.number && c.number.replace(/\D/g, "").includes(cleanDigits);
        return nameMatch || rawNumMatch || cleanNumMatch;
      });
      this.renderContacts(filtered);
    });
  },

  renderContacts(items) {
    const listContainer = document.getElementById("contacts-list");
    const countEl = document.getElementById("contacts-count");
    if (!listContainer) return;

    if (countEl) countEl.textContent = `${items.length} Contact${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 24px 14px; color: #555; text-align: center;">
          <img src="img/contacts.png" style="width: 32px; height: 32px; margin-bottom: 6px; opacity: 0.7;"><br>
          <b>No contacts found</b>
          <p style="font-size: 11px; margin: 6px 0 12px 0;">No phone numbers stored yet or sync is pending.</p>
          <div style="display:flex; justify-content:center; gap:6px;">
            <button onclick="AppContacts.showAddModal()" style="font-weight:bold;">+ New Contact</button>
            <button onclick="AppContacts.loadContacts()">↻ Refresh</button>
          </div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = "";
    items.forEach(c => {
      const item = document.createElement("div");
      item.className = "retro-list-item";

      item.innerHTML = `
        <div style="flex: 1; overflow: hidden; padding-right: 6px;">
          <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px;">${this.escapeHtml(c.name)}</div>
          <div style="color: #444; font-size: 10px; margin-top: 1px;">${this.escapeHtml(c.number)}</div>
        </div>
        <div style="display: flex; gap: 4px; flex-shrink: 0; align-items: center;">
          <button class="action-btn-call" style="min-width: 34px; height: 24px; font-size: 11px;" title="Call">📞</button>
          <button class="action-btn-sms" style="min-width: 34px; height: 24px; font-size: 11px;" title="SMS">💬</button>
          <button class="action-btn-wa" style="min-width: 34px; height: 24px; font-size: 11px; color: #008000;" title="WhatsApp">🟢</button>
          <button class="action-btn-pin" style="min-width: 26px; height: 24px; font-size: 11px;" title="Pin to Desktop">📌</button>
        </div>
      `;

      // Call button
      item.querySelector(".action-btn-call").addEventListener("click", (e) => {
        e.stopPropagation();
        Desktop.openWindow("win-phone");
        if (window.AppPhone) {
          AppPhone.setNumber(c.number);
          AppPhone.makeCall();
        }
      });

      // SMS button
      item.querySelector(".action-btn-sms").addEventListener("click", (e) => {
        e.stopPropagation();
        Desktop.openWindow("win-sms");
        if (window.AppSMS) {
          AppSMS.openCompose(c.number);
        }
      });

      // WhatsApp button
      item.querySelector(".action-btn-wa").addEventListener("click", (e) => {
        e.stopPropagation();
        Desktop.openWindow("win-whatsapp");
        if (window.AppWhatsApp) {
          AppWhatsApp.openConversation(c.name, c.number);
        }
      });

      // Pin button
      item.querySelector(".action-btn-pin").addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.AppShortcuts) {
          AppShortcuts.pinContact(c.name, c.number);
        }
      });

      // Tap whole item to open options / WhatsApp
      item.addEventListener("click", () => {
        Desktop.openWindow("win-whatsapp");
        if (window.AppWhatsApp) {
          AppWhatsApp.openConversation(c.name, c.number);
        }
      });

      listContainer.appendChild(item);
    });
  },

  showAddModal() {
    SoundManager.playClick();
    const modal = document.getElementById("dlg-add-contact");
    if (!modal) return;
    document.getElementById("add-contact-name").value = "";
    document.getElementById("add-contact-phone").value = "";
    document.getElementById("add-contact-error").textContent = "";
    modal.style.display = "flex";
    Desktop.bringToFront(modal);
  },

  saveNewContact() {
    const name = document.getElementById("add-contact-name").value.trim();
    const phone = document.getElementById("add-contact-phone").value.trim();
    const errorEl = document.getElementById("add-contact-error");

    if (!name || !phone) {
      SoundManager.playChord();
      if (errorEl) errorEl.textContent = "Please enter both name and phone number.";
      return;
    }

    let success = false;
    if (window.AndroidBridge && window.AndroidBridge.addContact) {
      success = window.AndroidBridge.addContact(name, phone);
    } else {
      this.contacts.push({ id: Date.now().toString(), name, number: phone });
      localStorage.setItem("idiotphone_contacts_demo", JSON.stringify(this.contacts));
      success = true;
    }

    if (success) {
      SoundManager.playClick();
      const modal = document.getElementById("dlg-add-contact");
      if (modal) modal.style.display = "none";
      this.loadContacts();
      Desktop.showRetroNotification("Contact Added", `${name} saved to Address Book.`, "info");
    } else {
      SoundManager.playChord();
      if (errorEl) errorEl.textContent = "Failed to save contact. Check permissions.";
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
};

window.AppContacts = AppContacts;
document.addEventListener("DOMContentLoaded", () => AppContacts.init());
