// core.js (Main Thread - Menu & Input Handler)
let engineWorker = null;

window.startEngine = function(mode) {
    document.getElementById('main-menu').style.display = 'none';
    initKlabsWorker();
};

window.returnToMenu = function() {
    document.getElementById('main-menu').style.display = 'flex';
    if (engineWorker) {
        engineWorker.terminate();
        engineWorker = null;
    }
};

window.openFeature = function(feature) {
    if (feature === 'rom') {
        alert("Fitur K-Labs: Pilih file ROM .bin/.cue atau .iso dari penyimpanan lokal Anda.");
    } else if (feature === 'settings') {
        alert("Pengaturan: ACES Cinematic Post-Processing Shader aktif secara otomatis.");
    } else if (feature === 'about') {
        alert("K-Labs Retro Engine Ultimate v5.0 dikembangkan secara eksklusif oleh Kialdevaro Group.");
    }
};

function initKlabsWorker() {
    const canvas = document.getElementById('klabs-render-surface');
    if (!canvas) return;

    const offscreen = canvas.transferControlToOffscreen();
    engineWorker = new Worker('engine-core.js', { type: 'module' });
    
    engineWorker.postMessage({
        type: 'INIT_ENGINE',
        canvas: offscreen,
        romData: new Uint8Array([0x50, 0x53, 0x58, 0x20]) // Mock header PS1
    }, [offscreen]);

    // Pemetaan Tombol Gamepad Sentuh Penuh ke Bitmask PS1
    let padState = 0xFFFF; // Active-low
    
    const keyMap = {
        'UP': 0x10, 'DOWN': 0x40, 'LEFT': 0x80, 'RIGHT': 0x20,
        'TRIANGLE': 0x1000, 'SQUARE': 0x8000, 'CIRCLE': 0x2000, 'CROSS': 0x4000,
        'START': 0x08, 'SELECT': 0x01
    };

    document.querySelectorAll('[data-key]').forEach(btn => {
        const keyName = btn.getAttribute('data-key');
        const mask = keyMap[keyName] || 0;

        ['touchstart', 'mousedown'].forEach(evt => {
            btn.addEventListener(evt, (e) => {
                e.preventDefault();
                padState &= ~mask;
                sendInput(padState);
            });
        });

        ['touchend', 'mouseup'].forEach(evt => {
            btn.addEventListener(evt, (e) => {
                e.preventDefault();
                padState |= mask;
                sendInput(padState);
            });
        });
    });
}

function sendInput(state) {
    if (engineWorker) {
        engineWorker.postMessage({ type: 'INPUT_UPDATE', state: state });
    }
}
