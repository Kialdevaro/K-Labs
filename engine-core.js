// engine-core.js (Worker Thread - Cinematic Demo Mode)
let glContext = null;

self.onmessage = async (e) => {
    const { type } = e.data;
    
    if (type === 'INIT_ENGINE') {
        const { canvas } = e.data;
        
        // Initialize WebGL2 on OffscreenCanvas
        glContext = canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            depth: false,
            preserveDrawingBuffer: false
        });
        
        if (!glContext) {
            console.error("WebGL2 tidak didukung pada OffscreenCanvas.");
            return;
        }

        // Loop perenderan visual dinamis ACES Cinematic Style untuk pengujian awal
        let step = 0;
        function renderLoop() {
            step += 0.02;
            
            // Simulasi perubahan warna latar belakang sinematik ala K-Labs
            const red = Math.sin(step) * 0.1 + 0.05;
            const green = Math.cos(step * 0.8) * 0.15 + 0.05;
            const blue = 0.2 + Math.sin(step * 0.5) * 0.1;

            glContext.clearColor(red, green, blue, 1.0);
            glContext.clear(glContext.COLOR_BUFFER_BIT);

            self.requestAnimationFrame(renderLoop);
        }
        
        renderLoop();
    }
    
    if (type === 'INPUT_UPDATE') {
        // Logika penerimaan input tombol dari Main Thread
        console.log("Input diterima di Worker:", e.data.state);
    }
};
