// index.js (Main Thread)
(() => {
    'use strict';
    
    const canvas = document.getElementById('klabs-render-surface');
    // Transfer control to worker - removing context from the main thread
    const offscreen = canvas.transferControlToOffscreen();
    
    // Instantiate Worker (Cannot be inspected easily via standard DOM console)
    const engineWorker = new Worker('engine-core.js', { type: 'module' });
    
    engineWorker.postMessage({
        type: 'INIT_ENGINE',
        canvas: offscreen,
        romData: getEncryptedRomData() // Implement AES-GCM decryption in WASM
    }, [offscreen]);

    // Secure Controller Bus - Send bitmasked input states
    // Pad 1: 0x1040 bitmask adherence handled in WASM
    let padState = 0xFFFF; // Active-low (1 = released, 0 = pressed)
    
    window.addEventListener('keydown', (e) => {
        // Map keys to PS1 bitmask (e.g., bit 14 = Square, bit 12 = Triangle)
        padState &= ~getMaskForEvent(e.code); 
        engineWorker.postMessage({ type: 'INPUT_UPDATE', state: padState });
    });
    
    window.addEventListener('keyup', (e) => {
        padState |= getMaskForEvent(e.code);
        engineWorker.postMessage({ type: 'INPUT_UPDATE', state: padState });
    });
})();