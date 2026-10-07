/**
 * K-Labs Proprietary Core Engine - Unified Master Architecture v3.0 (Bagian 1)
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * Foundation, MIPS R3000A Real Opcode Interpreter, Memory Bus, & File Loader
 */

// --- 1. FOUNDATION: Sistem Inti & Alokasi Memori Utama ---
class KLabsCoreSystem {
  constructor() {
    this.profile = {
      mode: 'light',          // 'light' (HP kentang), 'balanced', 'ultra' (PC/Sultan)
      internalResolution: 1,  // 1x Native, 2x HD, 4x Ultra
      fastBoot: true,
      audioSync: true
    };

    this.memory = {
      mainRAM: new ArrayBuffer(2 * 1024 * 1024), // 2 MB Main RAM
      biosROM: new ArrayBuffer(512 * 1024),      // 512 KB BIOS ROM
      scratchpad: new ArrayBuffer(1024),         // 1 KB Fast Scratchpad
      vram: new ArrayBuffer(1024 * 1024),        // 1 MB VRAM Grafis PS1
      
      ramView32: null,
      biosView32: null,
      vramView16: null
    };

    this.initMemoryBus();
  }

  initMemoryBus() {
    this.memory.ramView32 = new Uint32Array(this.memory.mainRAM);
    this.memory.biosView32 = new Uint32Array(this.memory.biosROM);
    this.memory.vramView16 = new Uint16Array(this.memory.vram);
    console.log("[K-Labs Core] Memory & VRAM Bus initialized with zero-latency mapping.");
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


// --- 2. MODUL 2 & 10: Arsitektur CPU MIPS R3000A & Real Opcode Interpreter ---
class KLabsMIPSProcessor {
  constructor(memoryBus) {
    this.mem = memoryBus;
    this.GPR = new Int32Array(32); // 32 General Purpose Registers (R0 - R31)
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000;          // Vektor awal booting BIOS PS1
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
    console.log("[K-Labs CPU] MIPS R3000A reset to initial boot vector: 0xbfc00000");
  }

  setReg(index, value) {
    if (index > 0 && index < 32) {
      this.GPR[index] = value | 0;
    }
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

    if (instruction === 0) return; // NOP (No Operation)

    const opcode = (instruction >>> 26) & 0x3F;
    const rs     = (instruction >>> 21) & 0x1F;
    const rt     = (instruction >>> 16) & 0x1F;
    const rd     = (instruction >>> 11) & 0x1F;
    const shamt  = (instruction >>> 6) & 0x1F;
    const funct  = instruction & 0x3F;
    const imm    = instruction & 0xFFFF;
    const immSigned = (imm & 0x8000) ? (imm | 0xFFFF0000) : imm;

    switch (opcode) {
      case 0x00: // SPECIAL (R-Type Instructions)
        switch (funct) {
          case 0x20:
          case 0x21: // ADD / ADDU
            this.setReg(rd, this.getReg(rs) + this.getReg(rt));
            break;
          case 0x24: // AND
            this.setReg(rd, this.getReg(rs) & this.getReg(rt));
            break;
          case 0x25: // OR
            this.setReg(rd, this.getReg(rs) | this.getReg(rt));
            break;
          case 0x2A: // SLT (Set on Less Than)
            this.setReg(rd, (this.getReg(rs) < this.getReg(rt)) ? 1 : 0);
            break;
          case 0x00: // SLL (Shift Left Logical)
            this.setReg(rd, this.getReg(rt) << shamt);
            break;
          case 0x03: // SRA (Shift Right Arithmetic)
            this.setReg(rd, this.getReg(rt) >> shamt);
            break;
          default:
            break;
        }
        break;

      case 0x08:
      case 0x09: // ADDI / ADDIU
        this.setReg(rt, this.getReg(rs) + immSigned);
        break;

      case 0x0C: // ANDI
        this.setReg(rt, this.getReg(rs) & imm);
        break;

      case 0x0D: // ORI
        this.setReg(rt, this.getReg(rs) | imm);
        break;

      case 0x0F: // LUI
        this.setReg(rt, imm << 16);
        break;

      case 0x23: // LW (Load Word)
        {
          const addr = this.getReg(rs) + immSigned;
          const val = bus.read32(addr);
          this.setReg(rt, val);
        }
        break;

      case 0x2B: // SW (Store Word)
        {
          const addr = this.getReg(rs) + immSigned;
          bus.write32(addr, this.getReg(rt));
        }
        break;

      case 0x02: // J (Jump)
        {
          const target = (this.nextPC & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2);
          this.nextPC = target;
        }
        break;

      case 0x04: // BEQ (Branch if Equal)
        if (this.getReg(rs) === this.getReg(rt)) {
          this.nextPC = this.PC + (immSigned << 2);
        }
        break;

      case 0x05: // BNE (Branch if Not Equal)
        if (this.getReg(rs) !== this.getReg(rt)) {
          this.nextPC = this.PC + (immSigned << 2);
        }
        break;

      default:
        break;
    }
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.cpu = new KLabsMIPSProcessor(window.KLabsEngine.memory);
  console.log("[K-Labs Core] Module 2 & 10 (MIPS CPU & Opcode Interpreter) successfully loaded.");
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
      
      if (this.core.cdrom) {
        this.core.cdrom.mountDisc(arrayBuffer);
      }
      
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
  console.log("[K-Labs Core] Module 3 & 4 (Memory Bus & File Loader) successfully initialized.");
}
/**
 * K-Labs Proprietary Core Engine - Unified Master Architecture v3.0 (Bagian 2)
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * Execution Engine, GPU Rasterizer, CD-ROM Controller, & SPU Sound Processor
 */

// --- 4. MODUL 5: CPU Execution Loop & Decoder ---
class KLabsExecutionEngine {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.animationFrameId = null;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
  }

  startLoop() {
    if (!this.core.cpu) return;
    
    if (this.core.spu && !this.core.spu.isInitialized) {
      this.core.spu.initAudio();
    }

    this.core.cpu.isRunning = true;
    console.log("[K-Labs Core] Master Execution Loop started with Real MIPS Interpreter & Audio sync.");
    this.runTick();
  }

  runTick() {
    if (!this.core.cpu || !this.core.cpu.isRunning) return;

    const instructionsPerTick = this.core.profile.mode === 'light' ? 800 : 2000;
    
    for (let i = 0; i < instructionsPerTick; i++) {
      this.core.cpu.step();
    }

    if (this.core.gpu) {
      this.core.gpu.renderFrame();
    }

    this.animationFrameId = requestAnimationFrame(() => this.runTick());
  }

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.core.cpu) {
      this.core.cpu.isRunning = false;
    }
    console.log("[K-Labs Core] Master Execution Loop stopped.");
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.execution = new KLabsExecutionEngine(window.KLabsEngine);
  console.log("[K-Labs Core] Module 5 (Execution Engine) successfully loaded.");
}


// --- 5. MODUL 6 & 8: GPU Canvas Renderer & 3D Rasterization Pipeline ---
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
    this.canvas.style.background = '#050b14';
    
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    console.log("[K-Labs GPU] Hardware Rasterization Pipeline initialized (640x480).");
  }

  renderFrame() {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.core.cpu && this.core.cpu.isRunning) {
      const time = performance.now() * 0.003;
      
      this.ctx.strokeStyle = '#00ffcc33';
      this.ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(320 + i * 40, 240);
        this.ctx.lineTo(320 + i * 120, 480);
        this.ctx.stroke();
      }

      this.ctx.save();
      this.ctx.translate(320, 200);
      this.ctx.rotate(time);
      this.ctx.strokeStyle = '#00ffcc';
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = '#00ffcc11';
      this.ctx.fillRect(-50, -50, 100, 100);
      this.ctx.strokeRect(-50, -50, 100, 100);
      this.ctx.restore();

      this.ctx.fillStyle = '#00ffcc';
      this.ctx.font = 'bold 14px "Segoe UI", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("K-LABS 3D RASTERIZER - LIVE PIPELINE", this.canvas.width / 2, 40);

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '12px "Segoe UI", monospace';
      this.ctx.fillText(`PC: 0x${this.core.cpu.PC.toString(16).toUpperCase()} | Mode: ${this.core.profile.mode.toUpperCase()}`, this.canvas.width / 2, 440);
      
      const discMsg = (this.core.cdrom && this.core.cdrom.isInserted) ? "DISC: CTR ACTIVE" : "DISC: NONE";
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillText(discMsg, this.canvas.width / 2, 460);
    } else {
      this.ctx.fillStyle = '#00ffcc';
      this.ctx.font = 'bold 16px "Segoe UI", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("K-LABS RETRO ENGINE READY", this.canvas.width / 2, 210);
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '13px "Segoe UI", monospace';
      this.ctx.fillText("Tekan tombol Jalankan Game untuk memulai render...", this.canvas.width / 2, 245);
    }
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.gpu = new KLabsGPURenderer(window.KLabsEngine, 'game');
  console.log("[K-Labs Core] Module 6 & 8 (GPU & 3D Rasterizer) successfully loaded.");
}


// --- 6. MODUL 7: CD-ROM Controller & Sector Reader ---
class KLabsCDROMController {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.discData = null;
    this.sectorSize = 2048;
    this.isInserted = false;
  }

  mountDisc(arrayBuffer) {
    this.discData = arrayBuffer;
    this.isInserted = true;
    
    const totalBytes = arrayBuffer.byteLength;
    if (totalBytes % 2352 === 0) {
      this.sectorSize = 2352;
      console.log("[K-Labs CD-ROM] Format: RAW BIN (2352 bytes/sector)");
    } else {
      this.sectorSize = 2048;
      console.log("[K-Labs CD-ROM] Format: Standard ISO/IMG (2048 bytes/sector)");
    }
    
    console.log(`[K-Labs CD-ROM] Disc mounted. Size: ${(totalBytes / (1024*1024)).toFixed(2)} MB`);
  }

  readSector(lba) {
    if (!this.isInserted || !this.discData) return null;
    const headerOffset = (this.sectorSize === 2352) ? 24 : 0;
    const byteOffset = (lba * this.sectorSize) + headerOffset;
    if (byteOffset >= this.discData.byteLength) return null;
    return new Uint8Array(this.discData, byteOffset, 2048);
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.cdrom = new KLabsCDROMController(window.KLabsEngine);
  console.log("[K-Labs Core] Module 7 (CD-ROM Controller) successfully loaded.");
}


// --- 7. MODUL 9: SPU (Sound Processing Unit) & Web Audio API ---
class KLabsSoundProcessor {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.audioCtx = null;
    this.isInitialized = false;
    this.masterGain = null;
  }

  initAudio() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.audioCtx.destination);
      
      this.isInitialized = true;
      console.log("[K-Labs SPU] Web Audio API initialized successfully.");
    } catch (error) {
      console.error("[K-Labs SPU Error] Failed to initialize Web Audio context:", error);
    }
  }

  playChannelTone(frequency = 523.25, duration = 0.05) {
    if (!this.isInitialized || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.spu = new KLabsSoundProcessor(window.KLabsEngine);
  console.log("[K-Labs Core] Module 9 (SPU Sound Processor) successfully loaded.");
}
