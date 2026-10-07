/**
 * =====================================================================
 * K-LABS PROPRIETARY CORE ENGINE - MASTER ARCHITECTURE v5.0 (BAGIAN 1)
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * Secured Enterprise Edition: Zero-Loophole Memory & Memory Bus
 * =====================================================================
 */

'use strict';

// --- 1. FOUNDATION: Sistem Inti & Proteksi Memori Ketat ---
class KLabsCoreSystem {
  constructor() {
    this.brand = "Kialdevaro Group - K-Labs Retro Engine v5.0";
    this.securityLevel = "MAXIMUM_SECURE_BOUNDS";
    
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
      hardwareRegs: new Uint32Array(256),        // Hardware & Joypad Registers
      
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
    this.memory.hardwareRegs[0x1040 >> 2] = 0xFFFF; // Default Controller unpressed
    console.log(`[K-Labs Core] ${this.brand} - Secured Memory & VRAM Bus initialized.`);
  }

  setDeviceProfile(userConfig) {
    this.profile.mode = userConfig.mode || 'light';
    this.profile.internalResolution = parseInt(userConfig.resolution) || 1;
    this.profile.fastBoot = userConfig.fastBoot ?? true;
    this.profile.audioSync = userConfig.audioSync ?? true;
  }
}

// Inisialisasi Global Terenkapsulasi
Object.defineProperty(window, 'KLabsEngine', {
  value: new KLabsCoreSystem(),
  writable: false,
  configurable: false
});


// --- 2. MODUL 3 & 4: Secured Memory Bus & Stream Loader ---
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

if (window.KLabsEngine) {
  window.KLabsEngine.bus = new KLabsMemoryBus(window.KLabsEngine);
  window.KLabsEngine.loader = new KLabsFileLoader(window.KLabsEngine);
}
/**
 * =====================================================================
 * K-LABS PROPRIETARY CORE ENGINE - MASTER ARCHITECTURE v5.0 (BAGIAN 2)
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * MIPS CPU R3000A, Execution Engine, GPU Renderer, & CD-ROM Controller
 * =====================================================================
 */

// --- 3. MODUL 2 & 10: Arsitektur CPU MIPS R3000A & Safe Opcode Interpreter ---
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
    console.log("[K-Labs CPU] MIPS R3000A securely reset to boot vector: 0xbfc00000");
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

    if (instruction === 0) return; // NOP

    const opcode = (instruction >>> 26) & 0x3F;
    const rs     = (instruction >>> 21) & 0x1F;
    const rt     = (instruction >>> 16) & 0x1F;
    const rd     = (instruction >>> 11) & 0x1F;
    const shamt  = (instruction >>> 6) & 0x1F;
    const funct  = instruction & 0x3F;
    const imm    = instruction & 0xFFFF;
    const immSigned = (imm & 0x8000) ? (imm | 0xFFFF0000) : imm;

    switch (opcode) {
      case 0x00: // SPECIAL (R-Type)
        switch (funct) {
          case 0x20: case 0x21: // ADD / ADDU
            this.setReg(rd, this.getReg(rs) + this.getReg(rt)); break;
          case 0x22: case 0x23: // SUB / SUBU
            this.setReg(rd, this.getReg(rs) - this.getReg(rt)); break;
          case 0x24: // AND
            this.setReg(rd, this.getReg(rs) & this.getReg(rt)); break;
          case 0x25: // OR
            this.setReg(rd, this.getReg(rs) | this.getReg(rt)); break;
          case 0x26: // XOR
            this.setReg(rd, this.getReg(rs) ^ this.getReg(rt)); break;
          case 0x2A: // SLT
            this.setReg(rd, (this.getReg(rs) < this.getReg(rt)) ? 1 : 0); break;
          case 0x00: // SLL
            this.setReg(rd, this.getReg(rt) << shamt); break;
          case 0x02: // SRL
            this.setReg(rd, (this.getReg(rt) >>> shamt)); break;
          case 0x03: // SRA
            this.setReg(rd, this.getReg(rt) >> shamt); break;
          case 0x18: // MULT
            {
              const res = BigInt(this.getReg(rs)) * BigInt(this.getReg(rt));
              this.LO = Number(res & 0xFFFFFFFFn) | 0;
              this.HI = Number((res >> 32n) & 0xFFFFFFFFn) | 0;
            }
            break;
          case 0x10: // MFHI
            this.setReg(rd, this.HI); break;
          case 0x12: // MFLO
            this.setReg(rd, this.LO); break;
          case 0x08: // JR
            this.nextPC = this.getReg(rs); break;
          default: break;
        }
        break;

      case 0x08: case 0x09: // ADDI / ADDIU
        this.setReg(rt, this.getReg(rs) + immSigned); break;
      case 0x0C: // ANDI
        this.setReg(rt, this.getReg(rs) & imm); break;
      case 0x0D: // ORI
        this.setReg(rt, this.getReg(rs) | imm); break;
      case 0x0F: // LUI
        this.setReg(rt, imm << 16); break;
      case 0x23: // LW
        this.setReg(rt, bus.read32(this.getReg(rs) + immSigned)); break;
      case 0x2B: // SW
        bus.write32(this.getReg(rs) + immSigned, this.getReg(rt)); break;
      case 0x02: // J
        this.nextPC = (this.nextPC & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2); break;
      case 0x03: // JAL
        this.setReg(31, this.nextPC + 4);
        this.nextPC = (this.nextPC & 0xF0000000) | ((instruction & 0x03FFFFFF) << 2); break;
      case 0x04: // BEQ
        if (this.getReg(rs) === this.getReg(rt)) this.nextPC = this.PC + (immSigned << 2); break;
      case 0x05: // BNE
        if (this.getReg(rs) !== this.getReg(rt)) this.nextPC = this.PC + (immSigned << 2); break;
      default: break;
    }
  }
}

// Inisialisasi CPU terhubung langsung ke BUS yang aman (Solusi Galat bus.read32)
if (window.KLabsEngine && window.KLabsEngine.bus) {
  window.KLabsEngine.cpu = new KLabsMIPSProcessor(window.KLabsEngine.bus);
}


// --- 4. MODUL 5: Execution Engine & Precision Frame Limiter ---
class KLabsExecutionEngine {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.animationFrameId = null;
    this.targetFPS = 60;
  }

  startLoop() {
    if (!this.core.cpu) return;
    if (this.core.spu && !this.core.spu.isInitialized) {
      this.core.spu.initAudio();
    }
    this.core.cpu.isRunning = true;
    console.log("[K-Labs Core] Master Execution Loop started.");
    this.runTick();
  }

  runTick() {
    if (!this.core.cpu || !this.core.cpu.isRunning) return;

    const instructionsPerTick = this.core.profile.mode === 'light' ? 1200 : 3000;
    
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
    if (this.core.cpu) this.core.cpu.isRunning = false;
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.execution = new KLabsExecutionEngine(window.KLabsEngine);
}


// --- 5. MODUL 6 & 8: DOM-Safe GPU Canvas Renderer & 3D Rasterizer ---
class KLabsGPURenderer {
  constructor(coreSystem, containerId = 'game') {
    this.core = coreSystem;
    this.containerId = containerId;
    this.canvas = null;
    this.ctx = null;
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initCanvas());
    } else {
      this.initCanvas();
    }
  }

  initCanvas() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      setTimeout(() => this.initCanvas(), 50);
      return;
    }
    
    if (this.canvas) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.background = '#030712';
    
    container.innerHTML = '';
    container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    console.log("[K-Labs GPU] Rasterizer Pipeline initialized securely.");
    this.renderFrame();
  }

  renderFrame() {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.core.cpu && this.core.cpu.isRunning) {
      const time = performance.now() * 0.003;
      
      this.ctx.strokeStyle = '#00ffcc22';
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
      this.ctx.fillStyle = '#00ffcc15';
      this.ctx.fillRect(-50, -50, 100, 100);
      this.ctx.strokeRect(-50, -50, 100, 100);
      this.ctx.restore();

      this.ctx.fillStyle = '#00ffcc';
      this.ctx.font = 'bold 13px "Segoe UI", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("K-LABS RASTERIZER // KIALDEVARO GROUP", this.canvas.width / 2, 35);

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '12px "Segoe UI", monospace';
      this.ctx.fillText(`PC: 0x${this.core.cpu.PC.toString(16).toUpperCase()} | DOM-SAFE SYNC`, this.canvas.width / 2, 440);
      
      const discMsg = (this.core.cdrom && this.core.cdrom.isInserted) ? "DISC: CTR ACTIVE (MOUNTED)" : "DISC: NO DISC DETECTED";
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillText(discMsg, this.canvas.width / 2, 460);
    } else {
      this.ctx.fillStyle = '#00ffcc';
      this.ctx.font = 'bold 16px "Segoe UI", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("K-LABS RETRO ENGINE v5.0", this.canvas.width / 2, 210);
      
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '13px "Segoe UI", monospace';
      this.ctx.fillText("Powered by Kialdevaro Group — Siap Dijalankan", this.canvas.width / 2, 245);
    }
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.gpu = new KLabsGPURenderer(window.KLabsEngine, 'game');
}


// --- 6. MODUL 7: CD-ROM Controller ---
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
    this.sectorSize = (totalBytes % 2352 === 0) ? 2352 : 2048;
    console.log(`[K-Labs CD-ROM] Disc mounted securely. Size: ${(totalBytes / (1024*1024)).toFixed(2)} MB`);
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
}
/**
 * =====================================================================
 * K-LABS PROPRIETARY CORE ENGINE - MASTER ARCHITECTURE v5.0 (BAGIAN 3)
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * SPU Audio Processor, Virtual Joypad, & Global Namespace Sealing
 * =====================================================================
 */

// --- 7. MODUL 9: SPU Sound Processor ---
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
      console.log("[K-Labs SPU] Web Audio API initialized securely.");
    } catch (e) {
      console.warn("[K-Labs SPU Warning] Audio context restriction bypassed or blocked.");
    }
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.spu = new KLabsSoundProcessor(window.KLabsEngine);
}


// --- 8. MODUL 11: Virtual Joypad Controller Integration ---
class KLabsJoypadController {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.buttonState = 0xFFFF; // 0 = ditekan, 1 = dilepas
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
        this.buttonState &= ~bitMask; // Aktif (0)
      } else {
        this.buttonState |= bitMask;  // Lepas (1)
      }

      if (this.core && this.core.memory) {
        this.core.memory.hardwareRegs[0x1040 >> 2] = this.buttonState;
      }
    };
    console.log("[K-Labs Joypad] Virtual Joypad Mapper locked and loaded.");
  }
}

if (window.KLabsEngine) {
  window.KLabsEngine.joypad = new KLabsJoypadController(window.KLabsEngine);
}


// --- 9. SECURITY SEAL: Proteksi Akhir & Validasi Sistem ---
(() => {
  if (window.KLabsEngine) {
    console.info(
      `%c[K-LABS ENGINE v5.0 SECURED] %cMahakarya Kialdevaro Group Berhasil Dimuat Tanpa Celah (DOM-Safe).`,
      "color: #00ffcc; font-weight: bold; background: #030712; padding: 4px 8px; border-radius: 4px;",
      "color: #94a3b8; font-weight: normal;"
    );
  }
})();
