/**
 * IdiotPhone 98 - Disk Cleanup Utility (Cleanmgr 98)
 */
const AppCleanmgr = {
    init() {
        this.scanStorage();
    },

    scanStorage() {
        const stats = {
            notes: (localStorage.getItem('idiotphone_notepad_autosave') || '').length,
            memos: (localStorage.getItem('idiotphone_voice_memos') || '').length,
            waLogs: (localStorage.getItem('idiotphone_wa_history') || '').length,
            smsCache: 1024 * 16
        };

        const formatBytes = bytes => {
            if (bytes < 1024) return bytes + ' B';
            return (bytes / 1024).toFixed(1) + ' KB';
        };

        const elNotes = document.getElementById('clean-size-notes');
        const elMemos = document.getElementById('clean-size-memos');
        const elWa = document.getElementById('clean-size-wa');

        if (elNotes) elNotes.textContent = formatBytes(stats.notes);
        if (elMemos) elMemos.textContent = formatBytes(stats.memos);
        if (elWa) elWa.textContent = formatBytes(stats.waLogs);

        // Native storage
        if (window.AndroidBridge && window.AndroidBridge.getSystemDiagnosticsJson) {
            try {
                const diag = JSON.parse(window.AndroidBridge.getSystemDiagnosticsJson());
                const driveEl = document.getElementById('clean-drive-info');
                if (driveEl && diag.totalStorageMb) {
                    driveEl.textContent = `Drive C: (Internal Storage) - ${diag.freeStorageMb} MB free of ${diag.totalStorageMb} MB`;
                }
            } catch (e) {
                console.error(e);
            }
        }
    },

    executeCleanup() {
        const chkNotes = document.getElementById('clean-chk-notes');
        const chkMemos = document.getElementById('clean-chk-memos');
        const chkWa = document.getElementById('clean-chk-wa');
        const progContainer = document.getElementById('clean-progress-container');
        const progBar = document.getElementById('clean-progress-bar');
        const statusText = document.getElementById('clean-status-label');

        let cleanedItems = 0;

        if (progContainer) progContainer.style.display = 'block';
        if (statusText) statusText.textContent = 'Calculating space to free...';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            if (progBar) progBar.style.width = progress + '%';

            if (progress === 40 && statusText) {
                statusText.textContent = 'Purging temporary application cache...';
            } else if (progress === 80 && statusText) {
                statusText.textContent = 'Compacting database and registry...';
            }

            if (progress >= 100) {
                clearInterval(interval);
                if (chkNotes && chkNotes.checked) {
                    localStorage.removeItem('idiotphone_notepad_autosave');
                    cleanedItems++;
                }
                if (chkMemos && chkMemos.checked) {
                    localStorage.removeItem('idiotphone_voice_memos');
                    cleanedItems++;
                }
                if (chkWa && chkWa.checked) {
                    localStorage.removeItem('idiotphone_wa_history');
                    cleanedItems++;
                }

                if (statusText) statusText.textContent = 'Cleanup completed successfully!';
                if (window.SoundManager) SoundManager.play('tada');
                if (window.Desktop) Desktop.showNotification('Disk Cleanup', 'Disk cleanup finished. System optimized.', 'info');
                setTimeout(() => {
                    if (progContainer) progContainer.style.display = 'none';
                    this.scanStorage();
                }, 1500);
            }
        }, 300);
    }
};

window.AppCleanmgr = AppCleanmgr;
