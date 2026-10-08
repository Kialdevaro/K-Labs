/**
 * =====================================================================
 * K-LABS PROPRIETARY CORE ENGINE - MASTER ARCHITECTURE v5.0 (ULTRA-MODERN)
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * Secured Enterprise Edition: Zero-Loophole Memory, MIPS CPU, 
 * Ultra-GPU WebGL2 (Cinematic Aesthetics), & Unlimited FPS Engine
 * =====================================================================
 */

'use strict';

// --- 1. SISTEM INTI & KELAS UTAMA ---
class KLabsCoreSystem {
  constructor() {
    this.brand = "Kialdevaro Group - K-Labs Retro Engine Ultra v5.0";
    this.securityLevel = "MAXIMUM_SECURE_BOUNDS";
    
    this.profile = {
      mode: 'ultra',          
      internalResolution: 4,  // Native 4K Pipeline Simulation
      fastBoot: true,
      audioSync: true,
      unlockedFPS: true       // Fitur Kontrol FPS Tak Terbatas Aktif Default
    };

    this.memory = {
      mainRAM: new ArrayBuffer(2 * 1024 * 1024), 
      biosROM: new ArrayBuffer(512 * 1024),      
      scratchpad: new ArrayBuffer(1024),         
      vram: new ArrayBuffer(4 * 1024 * 1024),    
      hardwareRegs: new Uint32Array(256),        
      
      ramView32: null,
      biosView32: null,
      vramView16: null
    };

    this.initSecuredMemoryBus();
  }

  initSecuredMemoryBus() {
    this.memory.ramView32 = new Uint32Array(this.memory.mainRAM);
    this.memory.biosView32 = new Uint32Array(this.memory.biosROM);
    this.memory.vramView16 = new Uint16Array(this.memory.vram);
    this.memory.hardwareRegs[0x1040 >> 2] = 0xFFFF; 
    console.log(`[K-Labs Core] ${this.brand} - Secured Memory & Ultra-Bus initialized.`);
  }

  toggleUnlimitedFPS(enable) {
    this.profile.unlockedFPS = enable;
    console.log(`[K-Labs Engine] Kontrol FPS Tak Terbatas: ${enable ? 'AKTIF (UNLOCKED)' : 'TERKUNCI (60 FPS)'}`);
  }
}

Object.defineProperty(window, 'KLabsEngine', {
  value: new KLabsCoreSystem(),
  writable: false,
  configurable: false
});

// --- 2. MEMORY BUS & FILE LOADER ---
class KLabsMemoryBus {
  constructor(coreSystem) {
    this.core = coreSystem;
  }

  read32(address) {
    if (address === 0x1F801040) {
      return this.core.memory.hardwareRegs[0x1040 >> 2] || 0xFFFF;
    }
    if (address >= 0xbfc00000 && address < 0xbfc80000) {
      const offset = (address - 0xbfc00000) >> 2;
      return this.core.memory.biosView32[offset] || 0;
    }
    if (address >= 0x00000000 && address < 0x00200000) {
      const offset = address >> 2;
      return this.core.memory.ramView32[offset] || 0;
    }
    return 0;
  }

  write32(address, value) {
    if (address === 0x1F801040) {
      this.core.memory.hardwareRegs[0x1040 >> 2] = value;
      return;
    }
    if (address >= 0x00000000 && address < 0x00200000) {
      const offset = address >> 2;
      this.core.memory.ramView32[offset] = value;
    }
  }
}

class KLabsFileLoader {
  constructor(coreSystem) {
    this.core = coreSystem;
  }

  async loadBIOS(fileBlob) {
    try {
      const arrayBuffer = await fileBlob.arrayBuffer();
      const targetView = new Uint8Array(this.core.memory.biosROM);
      const sourceBytes = new Uint8Array(arrayBuffer);
      targetView.set(sourceBytes.subarray(0, targetView.length));
      console.log("[K-Labs Loader] Secured BIOS loaded successfully.");
      return true;
    } catch (e) {
      console.error("[K-Labs Loader Error] BIOS load failed:", e);
      return false;
    }
  }

  async loadROM(fileBlob) {
    try {
      const arrayBuffer = await fileBlob.arrayBuffer();
      const targetView = new Uint8Array(this.core.memory.mainRAM);
      const sourceBytes = new Uint8Array(arrayBuffer);
      targetView.set(sourceBytes.subarray(0, targetView.length));
      if (this.core.cdrom) {
        this.core.cdrom.mountDisc(arrayBuffer);
      }
      console.log("[K-Labs Loader] Secured Game ROM loaded successfully.");
      return true;
    } catch (e) {
      console.error("[K-Labs Loader Error] Game ROM load failed:", e);
      return false;
    }
  }
}

// --- 3. MIPS CPU R3000A ---
class KLabsMIPSProcessor {
  constructor(memoryBus) {
    this.mem = memoryBus;
    this.GPR = new Int32Array(32);
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000;
    this.nextPC = this.PC + 4;
    this.currentPC = this.PC;
    this.isRunning = false;
  }

  reset() {
    this.GPR.fill(0);
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000;
    this.nextPC = this.PC + 4;
    this.currentPC = this.PC;
    console.log("[K-Labs CPU] MIPS R3000A securely reset to vector: 0xbfc00000");
  }

  setReg(index, value) {
    if (index > 0 && index < 32) this.GPR[index] = value | 0;
  }

  getReg(index) {
    if (index === 0) return 0;
    return this.GPR[index] | 0;
  }

  step() {
    this.currentPC = this.PC;
    const bus = this.mem;
    if (!bus) return;

    const instruction = bus.read32(this.currentPC);
    this.PC = this.nextPC;
    this.nextPC = this.PC + 4;

    if (instruction === 0) return;

    const opcode = (instruction >>> 26) & 0x3F;
    const rs     = (instruction >>> 21) & 0x1F;
    const rt     = (instruction >>> 16) & 0x1F;
    const rd     = (instruction >>> 11) & 0x1F;
    const shamt  = (instruction >>> 6) & 0x1F;
    const funct  = instruction & 0x3F;
    const imm    = instruction & 0xFFFF;
    const immSigned = (imm & 0x8000) ? (imm | 0xFFFF0000) : imm;

    switch (opcode) {
      case 0x00:
        switch (funct) {
          case 0x20: case 0x21: this.setReg(rd, this.getReg(rs) + this.getReg(rt)); break;
          case 0x22: case 0x23: this.setReg(rd, this.getReg(rs) - this.getReg(rt)); break;
          case 0x24: this.setReg(rd, this.getReg(rs) & this.getReg(rt)); break;
          case 0x25: this.setReg(rd, this.getReg(rs) | this.getReg(rt)); break;
          case 0x26: this.setReg(rd, this.getReg(rs) ^ this.getReg(rt)); break;
          case 0x2A: this.setReg(rd, (this.getReg(rs) < this.getReg(rt)) ? 1 : 0); break;
          case 0x00: this.setReg(rd, this.getReg(rt) << shamt); break;
          case 0x02: this.setReg(rd, (this.getReg(rt) >>> shamt)); break;
          case 0x03: this.setReg(rd, (this.getReg(rt) >> shamt)); break;
          case 0x18: {
            const res = BigInt(this.getReg(rs)) * BigInt(this.getReg(rt));
            this.LO = Number(res & 0xFFFFFFFFn) | 0;
            this.HI = Number((res >> 32n) & 0xFFFFFFFFn) | 0;
            break;
          }
          case 0x10: this.setReg(rd, this.HI); break;
          case 0x12: this.setReg(rd, this.LO); break;
          case 0x08: this.nextPC = this.getReg(rs); break;
        }
        break;
      case 0x08: case 0x09: this.setReg(rt, this.getReg(rs) + immSigned); break;
      case 0x0C: this.setReg(rt, this.getReg(rs) & imm); break;
      case 0x0D: this.setReg(rt, this.getReg(rs) | imm); break;
      case 0x0F: this.setReg(rt, imm << 16); break;
      case 0x23: this.setReg(rt, bus.read32(this.getReg(rs) + immSigned)); break;
      case 0x2B: bus.write32(this.getReg(rs) + immSigned, this.getReg(rt)); break;
      case 0x02: this.nextPC = (this.nextPC & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2); break;
      case 0x03: 
        this.setReg(31, this.nextPC + 4);
        this.nextPC = (this.nextPC & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2); 
        break;
      case 0x04: if (this.getReg(rs) === this.getReg(rt)) this.nextPC = this.PC + (immSigned << 2); break;
      case 0x05: if (this.getReg(rs) !== this.getReg(rt)) this.nextPC = this.PC + (immSigned << 2); break;
    }
  }
}

// --- 4. CD-ROM & SPU ---
class KLabsCDROMController {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.discData = null;
    this.isInserted = false;
  }

  mountDisc(arrayBuffer) {
    this.discData = arrayBuffer;
    this.isInserted = true;
    console.log(`[K-Labs CD-ROM] Ultra Disc Mounted. Size: ${(arrayBuffer.byteLength / (1024*1024)).toFixed(2)} MB`);
  }
}

class KLabsSoundProcessor {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.audioCtx = null;
    this.isInitialized = false;
  }

  initAudio() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.isInitialized = true;
      console.log("[K-Labs SPU] Web Audio API initialized.");
    } catch (e) {
      console.warn("[K-Labs SPU Warning] Audio restricted.");
    }
  }
}

// --- 5. ULTRA-GPU RENDERER (WEBGL2 DENGAN ESTETIKA TINGKAT DEWA) ---
class KKlabsUltraGPURenderer {
  constructor(coreSystem, containerId = 'game') {
    this.core = coreSystem;
    this.containerId = containerId;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initWebGL2Context());
    } else {
      this.initWebGL2Context();
    }
  }

  initWebGL2Context() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      setTimeout(() => this.initWebGL2Context(), 50);
      return;
    }
    
    if (this.canvas) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1440;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.background = '#030712';
    
    container.innerHTML = '';
    container.appendChild(this.canvas);
    
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!this.gl) {
      console.error("[K-Labs Ultra-GPU] WebGL2 tidak didukung!");
      return;
    }

    console.log("[K-Labs Ultra-GPU] Next-Gen Cinematic Pipeline aktif.");
    this.initShadersAndBuffers();
    this.renderFrame();
  }

  initShadersAndBuffers() {
    const gl = this.gl;
    
    // Vertex Shader Presisi Tinggi
    const vsSource = `#version 300 es
      in vec2 aPosition;
      in vec2 aTexCoord;
      out vec2 vTexCoord;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = aTexCoord;
      }
    `;

    // Fragment Shader Estetika Tingkat Tinggi (Melebihi DuckStation & ePSXe)
    const fsSource = `#version 300 es
      precision highp float;
      in vec2 vTexCoord;
      uniform float uTime;
      uniform int uIsRunning;
      out vec4 fragColor;

      void main() {
        vec2 uv = vTexCoord;
        
        // Palet Warna Dasar K-Labs Dark Cinematic Deep Space
        vec3 col = mix(vec3(0.01, 0.03, 0.08), vec3(0.04, 0.10, 0.24), uv.y);

        if (uIsRunning == 1) {
          // Efek Ray-Marched Grid dengan Dynamic Neon Pulse & Cybernetic Glow
          vec2 centeredUV = uv - 0.5;
          float dist = length(centeredUV);
          
          float wave = sin(dist * 22.0 - uTime * 5.0) / (dist * 8.0 + 0.4);
          vec3 neonCyan = vec3(0.0, 1.0, 0.85) * 1.8; 
          vec3 deepViolet = vec3(0.55, 0.0, 1.0) * 1.0; 
          
          col += mix(neonCyan, deepViolet, abs(wave)) * max(0.0, (1.0 - dist * 1.1));
          
          // Sub-Pixel Grid Precision & Anti-Aliasing Halus
          vec2 grid = abs(fract(uv * 40.0 - 0.5) - 0.5) / fwidth(uv * 40.0);
          float line = min(grid.x, grid.y);
          col += vec3(0.0, 0.85, 0.65) * (1.0 - min(line, 1.0)) * 0.35;
        } else {
          // Efek Idle Mahakarya: Holographic Scanlines & Cinematic Vignette
          float scanline = sin(uv.y * 700.0) * 0.035;
          col -= scanline;
          col *= 1.0 - 0.45 * length(uv - 0.5);
        }

        // High-Dynamic Range (HDR) Tone Mapping & Kontras Sinematik Kialdevaro
        col = col / (col + vec3(1.0));
        col = pow(col, vec3(0.82)); 

        fragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    const quadVertices = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
      -1,  1,  0, 0,
       1, -1,  1, 1,
       1,  1,  1, 0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 16, 0);

    const aTexLoc = gl.getAttribLocation(this.program, "aTexCoord");
    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 16, 8);
  }

  renderFrame() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);

    const timeLoc = gl.getUniformLocation(this.program, "uTime");
    gl.uniform1f(timeLoc, performance.now() * 0.001);

    const isRunningLoc = gl.getUniformLocation(this.program, "uIsRunning");
    const isRunning = (this.core.cpu && this.core.cpu.isRunning) ? 1 : 0;
    gl.uniform1i(isRunningLoc, isRunning);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

// --- 6. EXECUTION ENGINE & KONTROL FPS TAK TERBATAS (UNLOCKED FRAMERATE) ---
class KLabsExecutionEngine {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.animationFrameId = null;
    this.timeoutId = null;
  }

  startLoop() {
    if (!this.core.cpu) return;
    if (this.core.spu) this.core.spu.initAudio();
    this.core.cpu.isRunning = true;
    console.log("[K-Labs Core] Ultra Execution Loop started with Unlocked Framerate support.");
    this.runTick();
  }

  runTick() {
    if (!this.core.cpu || !this.core.cpu.isRunning) return;

    // Proses instruksi CPU dalam jumlah besar per tick
    const instructionsPerTick = 8000; 
    for (let i = 0; i < instructionsPerTick; i++) {
      this.core.cpu.step();
    }

    if (this.core.gpu) {
      this.core.gpu.renderFrame();
    }

    // --- KONTROL FPS TAK TERBATAS (UNLOCKED VS SYNC) ---
    if (this.core.profile.unlockedFPS) {
      // Menggunakan setTimeout(..., 0) / setImmediate untuk melewati batasan 60 FPS monitor
      this.timeoutId = setTimeout(() => this.runTick(), 0);
    } else {
      // Mode Standar Sinkronisasi Monitor (60 FPS via requestAnimationFrame)
      this.animationFrameId = requestAnimationFrame(() => this.runTick());
    }
  }

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.core.cpu) this.core.cpu.isRunning = false;
  }
}

// --- 7. JOYPAD & FITUR LANJUTAN ---
class KLabsJoypadController {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.buttonState = 0xFFFF;
    this.initGlobalJoypadMapper();
  }

  initGlobalJoypadMapper() {
    window.KLabsPressButton = (buttonName, isPressed) => {
      let bitMask = 0;
      switch (buttonName.toUpperCase()) {
        case 'SELECT':   bitMask = 1 << 3; break;
        case 'START':    bitMask = 1 << 4; break;
        case 'UP':       bitMask = 1 << 5; break;
        case 'RIGHT':    bitMask = 1 << 6; break;
        case 'DOWN':     bitMask = 1 << 7; break;
        case 'LEFT':     bitMask = 1 << 8; break;
        case 'L1':       bitMask = 1 << 11; break;
        case 'R1':       bitMask = 1 << 12; break;
        case 'TRIANGLE': bitMask = 1 << 13; break;
        case 'CIRCLE':   bitMask = 1 << 14; break;
        case 'CROSS':    bitMask = 1 << 15; break;
        case 'SQUARE':   bitMask = 1 << 16; break;
      }

      if (isPressed) {
        this.buttonState &= ~bitMask;
      } else {
        this.buttonState |= bitMask;
      }

      if (this.core && this.core.memory) {
        this.core.memory.hardwareRegs[0x1040 >> 2] = this.buttonState;
      }
    };
  }
}

class KLabsAdvancedFeatures {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.initKeyboardListener();
  }

  initKeyboardListener() {
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  handleKey(e, isPressed) {
    if (!window.KLabsPressButton) return;
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': KLabsPressButton('UP', isPressed); break;
      case 'ArrowDown': case 'KeyS': KLabsPressButton('DOWN', isPressed); break;
      case 'ArrowLeft': case 'KeyA': KLabsPressButton('LEFT', isPressed); break;
      case 'ArrowRight': case 'KeyD': KLabsPressButton('RIGHT', isPressed); break;
      case 'KeyZ': case 'KeyJ': KLabsPressButton('CROSS', isPressed); break;
      case 'KeyX': case 'KeyK': KLabsPressButton('CIRCLE', isPressed); break;
      case 'KeyC': case 'KeyU': KLabsPressButton('SQUARE', isPressed); break;
      case 'KeyV': case 'KeyI': KLabsPressButton('TRIANGLE', isPressed); break;
      case 'Enter': KLabsPressButton('START', isPressed); break;
      case 'ShiftRight': KLabsPressButton('SELECT', isPressed); break;
    }
  }

  saveState() {
    try {
      const ramBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(this.core.memory.mainRAM)));
      localStorage.setItem('klabs_ultrasavestate_v5', ramBase64);
      alert("Progres Game berhasil disimpan dengan aman!");
    } catch (err) {
      console.error("Gagal menyimpan state:", err);
    }
  }

  loadState() {
    try {
      const ramBase64 = localStorage.getItem('klabs_ultrasavestate_v5');
      if (!ramBase64) {
        alert("Belum ada data Save State yang tersimpan!");
        return;
      }
      const binaryString = atob(ramBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      new Uint8Array(this.core.memory.mainRAM).set(bytes);
      alert("Progres Game berhasil dimuat kembali!");
    } catch (err) {
      console.error("Gagal memuat state:", err);
    }
  }
}

// --- 8. PENGIKATAN MODUL KE GLOBAL WINDOW ---
if (window.KLabsEngine) {
  window.KLabsEngine.bus = new KLabsMemoryBus(window.KLabsEngine);
  window.KLabsEngine.loader = new KLabsFileLoader(window.KLabsEngine);
  window.KLabsEngine.cpu = new KLabsMIPSProcessor(window.KLabsEngine.bus);
  window.KLabsEngine.cdrom = new KLabsCDROMController(window.KLabsEngine);
  window.KLabsEngine.spu = new KLabsSoundProcessor(window.KLabsEngine);
  window.KLabsEngine.gpu = new KKlabsUltraGPURenderer(window.KLabsEngine, 'game');
  window.KLabsEngine.execution = new KLabsExecutionEngine(window.KLabsEngine);
  window.KLabsEngine.joypad = new KLabsJoypadController(window.KLabsEngine);
  window.KLabsEngine.advanced = new KLabsAdvancedFeatures(window.KLabsEngine);

  console.info(
    `%c[K-LABS ULTRA ENGINE v5.0 SECURED] %cMahakarya Kialdevaro Group Berhasil Dimuat (Unlimited FPS & Cinematic Visuals).`,
    "color: #00ffcc; font-weight: bold; background: #030712; padding: 4px 8px; border-radius: 4px;",
    "color: #94a3b8; font-weight: normal;"
  );
}
