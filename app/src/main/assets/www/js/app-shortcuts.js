/**
 * IdiotPhone 98 - Desktop Contact Pins & Custom Shortcuts (Shortcuts 98)
 */
const AppShortcuts = {
    KEY_SHORTCUTS: 'idiotphone_desktop_shortcuts',
    shortcuts: [],

    init() {
        this.loadShortcuts();
        this.renderDesktopPins();
    },

    loadShortcuts() {
        try {
            const data = localStorage.getItem(this.KEY_SHORTCUTS);
            this.shortcuts = data ? JSON.parse(data) : [
                { id: 'sc_ice', name: 'Emergency', number: '112', type: 'sos', icon: 'img/sos.png' }
            ];
        } catch (e) {
            this.shortcuts = [];
        }
    },

    saveShortcuts() {
        localStorage.setItem(this.KEY_SHORTCUTS, JSON.stringify(this.shortcuts));
    },

    pinContact(name, number) {
        if (!number) return;
        const existing = this.shortcuts.find(s => s.number === number);
        if (existing) {
            if (window.Desktop) Desktop.showNotification('Shortcut', `${name} is already pinned on Desktop.`, 'info');
            return;
        }

        this.shortcuts.push({
            id: 'sc_' + Date.now(),
            name: name || number,
            number: number,
            type: 'contact',
            icon: 'img/shortcut.png'
        });

        this.saveShortcuts();
        this.renderDesktopPins();
        if (window.SoundManager) SoundManager.play('click');
        if (window.Desktop) Desktop.showNotification('Desktop Pin', `Pinned ${name} to Windows 98 Desktop!`, 'info');
    },

    removeShortcut(id) {
        this.shortcuts = this.shortcuts.filter(s => s.id !== id);
        this.saveShortcuts();
        this.renderDesktopPins();
        if (window.SoundManager) SoundManager.play('click');
    },

    openShortcutAction(id) {
        const sc = this.shortcuts.find(s => s.id === id);
        if (!sc) return;

        const choice = prompt(
            `Shortcut: ${sc.name} (${sc.number})\n\nEnter action:\n1: Call\n2: Send SMS\n3: WhatsApp\n4: Unpin from Desktop`,
            '1'
        );

        if (choice === '1') {
            if (window.AndroidBridge && window.AndroidBridge.makePhoneCall) {
                window.AndroidBridge.makePhoneCall(sc.number);
            }
        } else if (choice === '2') {
            if (window.Desktop) Desktop.openWindow('win-sms');
            if (window.AppSMS && AppSMS.openCompose) AppSMS.openCompose(sc.number);
        } else if (choice === '3') {
            if (window.Desktop) Desktop.openWindow('win-whatsapp');
            if (window.AppWhatsApp && AppWhatsApp.selectContact) AppWhatsApp.selectContact(sc.name, sc.number);
        } else if (choice === '4') {
            this.removeShortcut(id);
        }
    },

    renderDesktopPins() {
        const container = document.getElementById('desktop-shortcuts-container');
        if (!container) return;

        container.innerHTML = this.shortcuts.map(sc => `
            <div class="desktop-icon" onclick="AppShortcuts.openShortcutAction('${sc.id}')">
                <img src="${sc.icon || 'img/shortcut.png'}" alt="${sc.name}">
                <div class="icon-label">${sc.name}</div>
            </div>
        `).join('');
    }
};

window.AppShortcuts = AppShortcuts;
