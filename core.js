/**
 * K-Labs Proprietary Core Engine - Unified Foundation & Modules v1.0
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * Sistem Penyetelan Manual Adaptif, Alokasi Memori, CPU, Bus, Loader, Execution Loop, & GPU Renderer
 */

// --- 1. FOUNDATION: Sistem Inti & Alokasi Memori ---
class KLabsCoreSystem {
  constructor() {
    this.profile = {
      mode: 'light',          // 'light' (HP kentang), 'balanced', 'ultra' (PC/Sultan)
      internalResolution: 1,  // 1x Native, 2x HD, 4x Ultra
      fastBoot: true,
      audioSync: true
    };

    this.memory = {
      mainRAM: new ArrayBuffer(2 * 1024 * 1024),
      biosROM: new ArrayBuffer(512 * 1024),
      scratchpad: new ArrayBuffer(1024),
      
      ramView32: null,
      biosView32: null
    };

    this.initMemoryBus();
  }

  initMemoryBus() {
    this.memory.ramView32 = new Uint32Array(this.memory.mainRAM);
    this.memory.biosView32 = new Uint32Array(this.memory.biosROM);
    console.log("[K-Labs Core] Memory Bus initialized: 2MB RAM + 512KB BIOS allocated successfully.");
  }

  setDeviceProfile(userConfig) {
    this.profile.mode = userConfig.mode || 'light';
    this.profile.internalResolution = parseInt(userConfig.resolution) || 1;
    this.profile.fastBoot = userConfig.fastBoot ?? true;
    this.profile.audioSync = userConfig.audioSync ?? true;
    
    console.log(`[K-Labs Core] Profile updated -> Mode: ${this.profile.mode.toUpperCase()}, Resolution: ${this.profile.internalResolution}x`);
  }
}

// Inisialisasi Global Core Engine Utama
window.KLabsEngine = new KLabsCoreSystem();


// --- 2. MODUL 2: Arsitektur CPU MIPS R3000A ---
class KLabsMIPSProcessor {
  constructor(memoryBus) {
    this.mem = memoryBus;
    this.GPR = new Int32Array(32);
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000; // Alamat awal booting BIOS PS1
    this.nextPC = this.PC + 4;
    this.isRunning = false;
  }

  reset() {
    this.GPR.fill(0);
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000;
    this.nextPC = this.PC + 4;
    console.log("[K-Labs CPU] MIPS R3000A reset to initial boot vector: 0xbfc00000");
  }

  step() {
    this.PC = this.nextPC;
    this.nextPC = this.PC + 4;
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.cpu = new KLabsMIPSProcessor(window.KLabsEngine.memory);
  console.log("[K-Labs Core] Module 2 (MIPS CPU) successfully loaded into engine.");
}


// --- 3. MODUL 3 & 4: Memory Mapping & Binary Stream Loader ---
class KLabsMemoryBus {
  constructor(coreSystem) {
    this.core = coreSystem;
  }

  read32(address) {
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
      console.log(`[K-Labs Loader] BIOS successfully loaded (${sourceBytes.length} bytes).`);
      return true;
    } catch (error) {
      console.error("[K-Labs Loader Error] Failed to load BIOS:", error);
      return false;
    }
  }

  async loadROM(fileBlob) {
    try {
      const arrayBuffer = await fileBlob.arrayBuffer();
      const targetView = new Uint8Array(this.core.memory.mainRAM);
      const sourceBytes = new Uint8Array(arrayBuffer);
      targetView.set(sourceBytes.subarray(0, targetView.length));
      console.log(`[K-Labs Loader] Game ROM successfully loaded (${sourceBytes.length} bytes).`);
      return true;
    } catch (error) {
      console.error("[K-Labs Loader Error] Failed to load Game ROM:", error);
      return false;
    }
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.bus = new KLabsMemoryBus(window.KLabsEngine);
  window.KLabsEngine.loader = new KLabsFileLoader(window.KLabsEngine);
  console.log("[K-Labs Core] Module 3 (Memory Bus) & Module 4 (File Loader) successfully initialized.");
}


// --- 4. MODUL 5: CPU Execution Loop & Decoder ---
class KLabsExecutionEngine {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.animationFrameId = null;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastTime = performance.now();
  }

  startLoop() {
    if (!this.core.cpu) return;
    this.core.cpu.isRunning = true;
    console.log("[K-Labs Core] Siklus Eksekusi Utama (Main Loop) dimulai...");
    this.runTick();
  }

  runTick() {
    if (!this.core.cpu || !this.core.cpu.isRunning) return;

    const instructionsPerTick = this.core.profile.mode === 'light' ? 500 : 1500;
    
    for (let i = 0; i < instructionsPerTick; i++) {
      this.executeInstruction();
    }

    // Render frame grafis ke Canvas setiap detak tick
    if (this.core.gpu) {
      this.core.gpu.renderFrame();
    }

    this.animationFrameId = requestAnimationFrame(() => this.runTick());
  }

  executeInstruction() {
    const cpu = this.core.cpu;
    const bus = this.core.bus;
    if (!bus) return;

    const instruction = bus.read32(cpu.PC);
    cpu.PC = cpu.nextPC;
    cpu.nextPC = cpu.PC + 4;
  }

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.core.cpu) {
      this.core.cpu.isRunning = false;
    }
    console.log("[K-Labs Core] Siklus Eksekusi dihentikan.");
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.execution = new KLabsExecutionEngine(window.KLabsEngine);
  console.log("[K-Labs Core] Module 5 (Execution Loop & Decoder) successfully loaded.");
}


// --- 5. MODUL 6: GPU & Canvas Renderer ---
class KLabsGPURenderer {
  constructor(coreSystem, containerId = 'game') {
    this.core = coreSystem;
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    
    this.initCanvas();
  }

  initCanvas() {
    if (!this.container) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.background = '#000000';
    
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    console.log("[K-Labs GPU] Canvas Renderer initialized successfully (640x480 Target).");
  }

  renderFrame() {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#00ffcc';
    this.ctx.font = 'bold 16px "Segoe UI", monospace';
    this.ctx.textAlign = 'center';
    
    if (this.core.cpu && this.core.cpu.isRunning) {
      this.ctx.fillText("K-LABS RETRO ENGINE - RUNNING", this.canvas.width / 2, 210);
      
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '13px "Segoe UI", monospace';
      this.ctx.fillText(`PC: 0x${this.core.cpu.PC.toString(16).toUpperCase()}`, this.canvas.width / 2, 245);
      this.ctx.fillText(`Mode: ${this.core.profile.mode.toUpperCase()} | Resolution: ${this.core.profile.internalResolution}x`, this.canvas.width / 2, 270);
    } else {
      this.ctx.fillText("K-LABS SYSTEM ACTIVE", this.canvas.width / 2, 210);
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '13px "Segoe UI", monospace';
      this.ctx.fillText("Menunggu eksekusi game...", this.canvas.width / 2, 245);
    }
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.gpu = new KLabsGPURenderer(window.KLabsEngine, 'game');
  console.log("[K-Labs Core] Module 6 (GPU Renderer) successfully loaded.");
}
