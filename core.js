// core.js (Main Thread - Safe Initialization)
(() => {
    'use strict';
    
    const canvas = document.getElementById('klabs-render-surface');
    if (!canvas) return;

    console.log("K-Labs Retro Engine Ultimate: Initializing main surface...");

    // Simulasi data ROM aman untuk pengujian awal tampilan
    function getSafeRomMock() {
        return new Uint8Array([0x50, 0x53, 0x58, 0x20]); // Header tiruan PSX
    }

    try {
        const offscreen = canvas.transferControlToOffscreen();
        const engineWorker = new Worker('engine-core.js', { type: 'module' });
        
        engineWorker.postMessage({
            type: 'INIT_ENGINE',
            canvas: offscreen,
            romData: getSafeRomMock()
        }, [offscreen]);

        let padState = 0xFFFF;
        window.addEventListener('keydown', (e) => {
            engineWorker.postMessage({ type: 'INPUT_UPDATE', state: padState });
        });
    } catch (err) {
        console.error("K-Labs Initialization Warning:", err);
    }
})();
