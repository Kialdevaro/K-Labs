// engine-core.js (Worker Thread)
import initWasm from './klabs_engine.js'; // Emscripten generated glue

let emuCore = null;
let glContext = null;

self.onmessage = async (e) => {
    const { type } = e.data;
    
    if (type === 'INIT_ENGINE') {
        const { canvas, romData } = e.data;
        
        // Initialize WebGL2 on OffscreenCanvas
        glContext = canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            depth: false,
            preserveDrawingBuffer: false
        });
        
        // Boot WASM Core without exporting memory
        emuCore = await initWasm({
            canvas: canvas,
            INITIAL_MEMORY: 16777216, // 16MB Total WASM Heap
            ENVIRONMENT: 'WORKER',
            locateFile: () => 'klabs_engine.wasm'
        });
        
        // Load encrypted ROM directly into WASM Heap via C++ API
        const ptr = emuCore._malloc(romData.byteLength);
        emuCore.HEAPU8.set(new Uint8Array(romData), ptr);
        emuCore._engine_load_rom(ptr, romData.byteLength);
        emuCore._free(ptr);
        
        // Enter execution loop tied to requestAnimationFrame within the Worker
        function frameLoop() {
            emuCore._engine_execute_frame(); // Executes 1/60th of a second of cycles (~564,480 cycles)
            self.requestAnimationFrame(frameLoop);
        }
        frameLoop();
    }
    
    if (type === 'INPUT_UPDATE') {
        if(emuCore) {
            // Write directly to JOY_STAT hardware register proxy
            emuCore._engine_update_input(0, e.data.state);
        }
    }
};
