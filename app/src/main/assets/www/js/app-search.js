// app-search.js - Universal Find & Search 98 for IdiotPhone
// Features: Searches across apps, contacts, SMS messages, memos, and notes with one-click opening.

const AppSearch = {
  appsList: [
    { name: 'Phone Dialer 98', windowId: 'win-phone', type: 'Application', icon: 'img/phone.png' },
    { name: 'Address Book (Contacts)', windowId: 'win-contacts', type: 'Application', icon: 'img/contacts.png' },
    { name: 'SMS Inbox', windowId: 'win-sms', type: 'Application', icon: 'img/sms.png' },
    { name: 'WhatsApp Messenger', windowId: 'win-whatsapp', type: 'Application', icon: 'img/whatsapp.png' },
    { name: 'Outlook Express (Gmail)', windowId: 'win-gmail', type: 'Application', icon: 'img/gmail.png' },
    { name: 'Microsoft Maps', windowId: 'win-maps', type: 'Application', icon: 'img/maps.png' },
    { name: 'Calculator', windowId: 'win-calc', type: 'Application', icon: 'img/calc.png' },
    { name: 'Notepad', windowId: 'win-notepad', type: 'Application', icon: 'img/notepad.png' },
    { name: 'Voice Memos (Sound Recorder)', windowId: 'win-recorder', type: 'Application', icon: 'img/recorder.png' },
    { name: 'Windows Media Player 98', windowId: 'win-mediaplayer', type: 'Application', icon: 'img/media_player.png' },
    { name: 'Unit & Currency Converter 98', windowId: 'win-converter', type: 'Application', icon: 'img/converter.png' },
    { name: 'Desktop Sticky Notes', windowId: 'win-stickynote', type: 'Application', icon: 'img/stickynote.png' },
    { name: 'Habits & Routine 98', windowId: 'win-habits', type: 'Application', icon: 'img/habits.png' },
    { name: 'Flashlight 98', windowId: 'win-torch', type: 'Application', icon: 'img/torch.png' },
    { name: 'Alarm & Timer', windowId: 'win-alarm', type: 'Application', icon: 'img/alarm.png' },
    { name: 'Minesweeper', windowId: 'win-minesweeper', type: 'Application', icon: 'img/minesweeper.png' },
    { name: 'Focus Mode', windowId: 'win-focus', type: 'Application', icon: 'img/focus.png' },
    { name: 'Volume Mixer', windowId: 'win-volume', type: 'Application', icon: 'img/volume_mixer.png' },
    { name: 'Disk Cleanup', windowId: 'win-cleanmgr', type: 'Application', icon: 'img/cleanmgr.png' },
    { name: 'DirectX Diagnostics', windowId: 'win-dxdiag', type: 'Application', icon: 'img/dxdiag.png' },
    { name: 'Emergency SOS', windowId: 'win-emergency', type: 'Application', icon: 'img/sos.png' },
    { name: 'Control Panel', windowId: 'win-controlpanel', type: 'Application', icon: 'img/settings.png' }
  ],

  init() {
    this.bindEvents();
    this.search('');
  },

  bindEvents() {
    const input = document.getElementById('search-query-input');
    if (input) {
      input.addEventListener('input', () => this.search(input.value));
    }
  },

  search(query) {
    const q = (query || '').trim().toLowerCase();
    const resultsContainer = document.getElementById('search-results-list');
    const statusText = document.getElementById('search-status-bar');
    if (!resultsContainer) return;

    let matches = [];

    // 1. Search in Applications
    this.appsList.forEach(app => {
      if (!q || app.name.toLowerCase().includes(q) || app.type.toLowerCase().includes(q)) {
        matches.push({
          title: app.name,
          category: 'Programs',
          icon: app.icon,
          action: () => Desktop.openWindow(app.windowId)
        });
      }
    });

    // 2. Search in Contacts
    if (window.AppContacts && AppContacts.contacts) {
      AppContacts.contacts.forEach(c => {
        if (q && (c.name.toLowerCase().includes(q) || (c.number && c.number.includes(q)))) {
          matches.push({
            title: `${c.name} (${c.number || ''})`,
            category: 'Address Book',
            icon: 'img/contacts.png',
            action: () => {
              Desktop.openWindow('win-phone');
              if (window.AppPhone) AppPhone.setNumber(c.number);
            }
          });
        }
      });
    }

    // 3. Search in Notepad Notes
    const savedNote = localStorage.getItem('idiotphone_notepad_text') || '';
    if (q && savedNote.toLowerCase().includes(q)) {
      matches.push({
        title: `Notepad Doc: "${savedNote.substring(0, 30)}..."`,
        category: 'Documents',
        icon: 'img/notepad.png',
        action: () => Desktop.openWindow('win-notepad')
      });
    }

    // 4. Search in Sticky Note
    const stickyNote = localStorage.getItem('idiotphone_stickynote_content') || '';
    if (q && stickyNote.toLowerCase().includes(q)) {
      matches.push({
        title: `Sticky Note: "${stickyNote.substring(0, 30)}..."`,
        category: 'Memos',
        icon: 'img/stickynote.png',
        action: () => Desktop.openWindow('win-stickynote')
      });
    }

    if (statusText) {
      statusText.textContent = `${matches.length} object(s) found.`;
    }

    if (matches.length === 0) {
      resultsContainer.innerHTML = '<div style="padding:12px; color:#666; text-align:center;">No matching items found.</div>';
      return;
    }

    resultsContainer.innerHTML = matches.map((m, idx) => `
      <div class="retro-list-item" style="display:flex; align-items:center; gap:8px; padding:5px 8px; cursor:pointer;" onclick="AppSearch.triggerAction(${idx})">
        <img src="${m.icon}" style="width:20px; height:20px;">
        <div style="flex:1;">
          <div style="font-weight:bold; font-size:11px;">${m.title}</div>
          <div style="font-size:10px; color:#666;">In folder: ${m.category}</div>
        </div>
        <button style="height:22px; padding:0 8px; font-size:10px;">Open</button>
      </div>
    `).join('');

    this.currentMatches = matches;
  },

  triggerAction(idx) {
    if (this.currentMatches && this.currentMatches[idx]) {
      this.currentMatches[idx].action();
    }
  }
};

window.AppSearch = AppSearch;
