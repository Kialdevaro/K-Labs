// K-Labs Retro Engine - Core WebWorker
let glContext = null;
let renderCanvas = null;

self.onmessage = function(e) {
    const msg = e.data;
    if (msg.type === 'INIT_ENGINE') {
        renderCanvas = msg.canvas;
        glContext = renderCanvas.getContext('webgl2') || renderCanvas.getContext('webgl');
        if (glContext) {
            glContext.clearColor(0.0, 0.0, 0.0, 1.0);
            glContext.clear(glContext.COLOR_BUFFER_BIT);
        }
    } else if (msg.type === 'START_PSX_EMULATION') {
        console.log("Memulai engine untuk: " + msg.romName);
        startRenderLoop();
    }
};

function startRenderLoop() {
    if (!glContext) return;
    // Render loop aktif agar kanvas merespons game
    glContext.clearColor(0.05, 0.05, 0.1, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT);
    requestAnimationFrame(startRenderLoop);
}
