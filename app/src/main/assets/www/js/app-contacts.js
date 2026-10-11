// app-contacts.js - Windows 98 Address Book for IdiotPhone

const AppContacts = {
  contacts: [],

  init() {
    this.initSearch();
    this.loadContacts();
  },

  loadContacts() {
    const listContainer = document.getElementById("contacts-list");
    listContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Loading Address Book...</div>';

    if (window.AndroidBridge) {
      try {
        const json = window.AndroidBridge.getContactsJson();
        this.contacts = JSON.parse(json);
      } catch (e) {
        console.error("Error loading contacts", e);
      }
    }

    this.renderContacts(this.contacts);
  },

  initSearch() {
    const searchInput = document.getElementById("contacts-search-input");
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

    if (countEl) countEl.textContent = `${items.length} Contact${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
      listContainer.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">No contacts found. Click "New Contact" to add one.</div>';
      return;
    }

    listContainer.innerHTML = "";
    items.forEach(c => {
      const item = document.createElement("div");
      item.className = "retro-list-item";

      item.innerHTML = `
        <div style="flex: 1; overflow: hidden; padding-right: 6px;">
          <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</div>
          <div style="color: #444; font-size: 10px;">${c.number}</div>
        </div>
        <div style="display: flex; gap: 4px; flex-shrink: 0;">
          <button class="action-btn-call" style="min-width: 36px; height: 22px; font-size: 10px;" title="Call">📞</button>
          <button class="action-btn-sms" style="min-width: 36px; height: 22px; font-size: 10px;" title="SMS">💬</button>
          <button class="action-btn-wa" style="min-width: 36px; height: 22px; font-size: 10px; color: #008000;" title="WhatsApp">🟢</button>
          <button class="action-btn-pin" style="min-width: 28px; height: 22px; font-size: 10px;" title="Pin to Desktop">📌</button>
        </div>
      `;

      // Call button
      item.querySelector(".action-btn-call").addEventListener("click", (e) => {
        e.stopPropagation();
        Desktop.openWindow("win-phone");
        AppPhone.setNumber(c.number);
        AppPhone.makeCall();
      });

      // SMS button
      item.querySelector(".action-btn-sms").addEventListener("click", (e) => {
        e.stopPropagation();
        Desktop.openWindow("win-sms");
        AppSMS.openCompose(c.number);
      });

      // WhatsApp button
      item.querySelector(".action-btn-wa").addEventListener("click", (e) => {
        e.stopPropagation();
        Desktop.openWindow("win-whatsapp");
        AppWhatsApp.openQuickChat(c.number);
      });

      // Pin button
      item.querySelector(".action-btn-pin").addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.AppShortcuts) {
          AppShortcuts.pinContact(c.name, c.number);
        }
      });

      listContainer.appendChild(item);
    });
  },

  showAddModal() {
    SoundManager.playClick();
    const modal = document.getElementById("dlg-add-contact");
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
      errorEl.textContent = "Please enter both name and phone number.";
      return;
    }

    let success = false;
    if (window.AndroidBridge) {
      success = window.AndroidBridge.addContact(name, phone);
    } else {
      this.contacts.push({ id: Date.now().toString(), name, number: phone });
      success = true;
    }

    if (success) {
      SoundManager.playClick();
      document.getElementById("dlg-add-contact").style.display = "none";
      this.loadContacts();
      Desktop.showRetroNotification("Contact Added", `${name} has been added to your Address Book.`, "info");
    } else {
      SoundManager.playChord();
      errorEl.textContent = "Failed to save contact. Check permissions.";
    }
  }
};

window.AppContacts = AppContacts;
document.addEventListener("DOMContentLoaded", () => AppContacts.init());
