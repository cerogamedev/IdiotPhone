/**
 * IdiotPhone 98 - Emergency SOS & ICE (In Case of Emergency) Dialing
 */
const AppEmergency = {
    KEY_ICE_CONTACT: 'idiotphone_ice_contact',
    KEY_ICE_NAME: 'idiotphone_ice_name',

    init() {
        this.renderIceInfo();
    },

    getIceContact() {
        return {
            name: localStorage.getItem(this.KEY_ICE_NAME) || 'Family / Guardian',
            number: localStorage.getItem(this.KEY_ICE_CONTACT) || ''
        };
    },

    setIceContact(name, number) {
        localStorage.setItem(this.KEY_ICE_NAME, name);
        localStorage.setItem(this.KEY_ICE_CONTACT, number);
        this.renderIceInfo();
        if (window.Desktop) Desktop.showNotification('Emergency SOS', 'ICE Emergency Contact saved successfully!', 'info');
    },

    dialEmergency(number) {
        if (window.SoundManager) {
            SoundManager.play('chord');
            SoundManager.vibrate(80);
        }
        if (window.AndroidBridge && window.AndroidBridge.makePhoneCall) {
            window.AndroidBridge.makePhoneCall(number);
        } else {
            alert('Calling emergency number: ' + number);
        }
    },

    sendSosGpsMessage() {
        const ice = this.getIceContact();
        if (!ice.number) {
            alert('Please configure your ICE (In Case of Emergency) contact number first!');
            return;
        }

        if (!confirm(`Send urgent SOS location SMS to ${ice.name} (${ice.number})?`)) {
            return;
        }

        let locStr = 'Unknown Location';
        if (window.AndroidBridge && window.AndroidBridge.getCurrentLocationJson) {
            try {
                const locData = JSON.parse(window.AndroidBridge.getCurrentLocationJson());
                if (locData && locData.lat) {
                    locStr = `https://maps.google.com/?q=${locData.lat},${locData.lon}`;
                }
            } catch (e) {
                console.error(e);
            }
        }

        const sosMessage = `[EMERGENCY SOS] I need assistance! My current GPS location is: ${locStr}`;

        if (window.AndroidBridge && window.AndroidBridge.sendSms) {
            const success = window.AndroidBridge.sendSms(ice.number, sosMessage);
            if (success) {
                if (window.Desktop) Desktop.showNotification('SOS Sent', `Location broadcasted to ${ice.name}.`, 'warning');
                if (window.SoundManager) SoundManager.play('tada');
            } else {
                alert('Failed to send SOS SMS. Please check cellular signal or permissions.');
            }
        }
    },

    promptSetIce() {
        const current = this.getIceContact();
        const newName = prompt('Enter ICE Contact Name:', current.name);
        if (newName === null) return;
        const newNumber = prompt('Enter ICE Phone Number:', current.number);
        if (newNumber === null) return;
        this.setIceContact(newName.trim(), newNumber.trim());
    },

    renderIceInfo() {
        const elName = document.getElementById('ice-contact-name-display');
        const elNum = document.getElementById('ice-contact-num-display');
        const ice = this.getIceContact();
        if (elName) elName.textContent = ice.name;
        if (elNum) elNum.textContent = ice.number || '(Not Configured - Tap Setup)';
    }
};

window.AppEmergency = AppEmergency;
