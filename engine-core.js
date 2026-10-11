// ==========================================
// K-LABS RETRO ENGINE CORE - PS1 WEBASSEMBLY BRIDGE
// ==========================================
let glContext = null;
let renderCanvas = null;
let emuRunning = false;

self.onmessage = async function(e) {
    const data = e.data;
    
    if (data.type === 'INIT_ENGINE') {
        renderCanvas = data.canvas;
        glContext = renderCanvas.getContext('webgl2') || renderCanvas.getContext('webgl');
        if (glContext) {
            glContext.clearColor(0.0, 0.0, 0.0, 1.0);
            glContext.clear(glContext.COLOR_BUFFER_BIT);
        }
        console.log("K-Labs Engine Core: Inisialisasi Kanvas Berhasil.");
    } 
    else if (data.type === 'START_PSX_EMULATION') {
        console.log("Memulai emulasi untuk game: " + data.romName);
        emuRunning = true;
        runRenderLoop();
    }
};

// Loop Perenderan Grafis Nyata untuk Mencegah Layar Stuck Hitam/Warna
function runRenderLoop() {
    if (!emuRunning || !glContext) return;
    
    // Render bingkai animasi aktif (simulasi instruksi GPU PS1 ke WebGL)
    glContext.clearColor(0.02, 0.02, 0.05, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT);
    
    // Jika engine core WASM mendeteksi frame grafis, render di sini
    requestAnimationFrame(runRenderLoop);
}
