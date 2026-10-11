/**
 * IdiotPhone 98 - DirectX Diagnostic Tool (dxdiag 98)
 */
const AppDxDiag = {
    currentTab: 'system',

    init() {
        this.loadDiagnostics();
    },

    setTab(tabId) {
        this.currentTab = tabId;
        const tabs = ['system', 'display', 'sound', 'network'];
        tabs.forEach(t => {
            const pane = document.getElementById(`dxdiag-pane-${t}`);
            const btn = document.getElementById(`dxdiag-tab-btn-${t}`);
            if (pane) pane.style.display = (t === tabId) ? 'block' : 'none';
            if (btn) {
                if (t === tabId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
        if (window.SoundManager) SoundManager.play('click');
    },

    loadDiagnostics() {
        let diag = {
            model: 'Redmi Device',
            manufacturer: 'Xiaomi',
            androidVersion: 'Android 13 / HyperOS',
            cpuAbi: 'arm64-v8a',
            uptimeHours: 12.4,
            totalMemMb: 4096,
            availMemMb: 2150,
            carrier: 'Cellular Carrier',
            totalStorageMb: 64000,
            freeStorageMb: 32000
        };

        if (window.AndroidBridge && window.AndroidBridge.getSystemDiagnosticsJson) {
            try {
                const nativeDiag = JSON.parse(window.AndroidBridge.getSystemDiagnosticsJson());
                diag = Object.assign(diag, nativeDiag);
            } catch (e) {
                console.error(e);
            }
        }

        // Populate System Tab
        const elDate = document.getElementById('dx-date');
        const elModel = document.getElementById('dx-model');
        const elOS = document.getElementById('dx-os');
        const elMem = document.getElementById('dx-mem');
        const elUptime = document.getElementById('dx-uptime');

        if (elDate) elDate.textContent = new Date().toLocaleString();
        if (elModel) elModel.textContent = `${diag.manufacturer} ${diag.model} (${diag.cpuAbi})`;
        if (elOS) elOS.textContent = `Android ${diag.androidVersion} (API ${diag.sdkInt || 33})`;
        if (elMem) elMem.textContent = `${diag.availMemMb} MB free of ${diag.totalMemMb} MB Total RAM`;
        if (elUptime) elUptime.textContent = `${diag.uptimeHours} hours`;

        // Populate Display Tab
        const elRes = document.getElementById('dx-res');
        const elDpr = document.getElementById('dx-dpr');
        if (elRes) elRes.textContent = `${window.screen.width} x ${window.screen.height} (Viewport: ${window.innerWidth} x ${window.innerHeight})`;
        if (elDpr) elDpr.textContent = `${window.devicePixelRatio}x (AMOLED High Density)`;

        // Populate Network Tab
        const elCarrier = document.getElementById('dx-carrier');
        const elStorage = document.getElementById('dx-storage');
        if (elCarrier) elCarrier.textContent = diag.carrier || 'SIM Ready';
        if (elStorage) elStorage.textContent = `${diag.freeStorageMb} MB free / ${diag.totalStorageMb} MB Total Flash`;
    },

    saveAllInfo() {
        if (window.SoundManager) SoundManager.play('click');
        alert('Diagnostics report compiled and saved to System Log.');
    }
};

window.AppDxDiag = AppDxDiag;
