// engine-core.js (Worker Thread - WebGL2 & Frame Loop)
let glContext = null;

self.onmessage = async (e) => {
    const { type } = e.data;
    
    if (type === 'INIT_ENGINE') {
        const { canvas } = e.data;
        glContext = canvas.getContext('webgl2', {
            alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false
        });
        
        if (!glContext) return;

        let frame = 0;
        function renderLoop() {
            frame++;
            // Simulasi perenderan grafis retro berselera ACES sinematik
            const r = Math.sin(frame * 0.03) * 0.1 + 0.05;
            const g = Math.cos(frame * 0.02) * 0.1 + 0.08;
            const b = 0.15;

            glContext.clearColor(r, g, b, 1.0);
            glContext.clear(glContext.COLOR_BUFFER_BIT);

            self.requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }
    
    if (type === 'INPUT_UPDATE') {
        // Kontrol input diterima secara instan di latar belakang worker
    }
};
