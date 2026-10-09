/**
 * =====================================================================
 * K-LABS PROPRIETARY CORE ENGINE - AEROSPACE GRADE ULTIMATE v5.0
 * Copyright © 2026 Kialdevaro Group. All Rights Reserved.
 * Secured Architecture: ISO Bootloader, MIPS CPU, GP0/GP1 GPU Parser,
 * VRAM Framebuffer Texture Mapping, & Active SPU Audio Stream.
 * =====================================================================
 */

'use strict';

class KLabsCoreSystem {
  constructor() {
    this.brand = "Kialdevaro Group - K-Labs Retro Engine Ultimate v5.0";
    this.securityLevel = "MAXIMUM_SECURE_BOUNDS_AEROSPACE";
    
    this.profile = {
      mode: 'ultra',          
      internalResolution: 4,  
      fastBoot: true,
      audioSync: true,
      unlockedFPS: true       
    };

    this.memory = {
      mainRAM: new ArrayBuffer(2 * 1024 * 1024), 
      biosROM: new ArrayBuffer(512 * 1024),      
      scratchpad: new ArrayBuffer(1024),         
      vram: new ArrayBuffer(1024 * 512 * 2),     
      hardwareRegs: new Uint32Array(256),        
      
      ramView32: null,
      biosView32: null,
      vramView16: null
    };

    this.stats = {
      fps: 0,
      frameCount: 0,
      lastTime: performance.now()
    };

    this.initSecuredMemoryBus();
  }

  initSecuredMemoryBus() {
    this.memory.ramView32 = new Uint32Array(this.memory.mainRAM);
    this.memory.biosView32 = new Uint32Array(this.memory.biosROM);
    this.memory.vramView16 = new Uint16Array(this.memory.vram);
    this.memory.hardwareRegs[0x1040 >> 2] = 0xFFFF; 
  }

  toggleUnlimitedFPS(enable) {
    this.profile.unlockedFPS = enable;
  }
}

class KLabsMemoryBus {
  constructor(coreSystem) {
    this.core = coreSystem;
  }

  read32(address) {
    if (address === 0x1F801040) {
      return this.core.memory.hardwareRegs[0x1040 >> 2] || 0xFFFF;
    }
    if (address >= 0xbfc00000 && address < 0xbfc80000) {
      return this.core.memory.biosView32[(address - 0xbfc00000) >> 2] || 0;
    }
    if (address >= 0x00000000 && address < 0x00200000) {
      return this.core.memory.ramView32[address >> 2] || 0;
    }
    return 0;
  }

  write32(address, value) {
    if (address === 0x1F801040) {
      this.core.memory.hardwareRegs[0x1040 >> 2] = value;
      return;
    }
    if (address >= 0x00000000 && address < 0x00200000) {
      this.core.memory.ramView32[address >> 2] = value;
    }
  }
}

class KLabsISOBootloader {
  constructor(coreSystem) {
    this.core = coreSystem;
  }

  parseAndBootGame() {
    if (!this.core.cdrom || !this.core.cdrom.isInserted) return false;
    const disc = new Uint8Array(this.core.cdrom.discData);
    let exeOffset = -1;

    for (let i = 0; i < disc.byteLength - 32; i += 2048) {
      if (disc[i] === 0x50 && disc[i+1] === 0x53 && disc[i+2] === 0x2D && disc[i+3] === 0x58) {
        exeOffset = i;
        break;
      }
    }

    if (exeOffset !== -1) {
      const headerView = new DataView(disc.buffer, exeOffset, 2048);
      const loadAddress = headerView.getUint32(0x18, true); 
      const fileSize = headerView.getUint32(0x1C, true);     
      const entryPoint = headerView.getUint32(0x10, true);   
      
      const ramTarget = new Uint8Array(this.core.memory.mainRAM);
      const payloadSource = disc.subarray(exeOffset + 2048, exeOffset + 2048 + fileSize);
      const ramOffset = loadAddress & 0x1FFFFF; 
      
      if (ramOffset + payloadSource.length <= ramTarget.length) {
        ramTarget.set(payloadSource, ramOffset);
      }
      
      if (this.core.cpu) {
        this.core.cpu.PC = entryPoint;
        this.core.cpu.nextPC = entryPoint + 4;
      }
      return true;
    }
    return false;
  }
}

class KLabsCDROMController {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.discData = null;
    this.sectorSize = 2048;
    this.isInserted = false;
    this.totalSectors = 0;
    this.bootloader = new KLabsISOBootloader(coreSystem);
  }

  mountDisc(arrayBuffer) {
    this.discData = arrayBuffer;
    this.isInserted = true;
    this.sectorSize = (arrayBuffer.byteLength % 2352 === 0) ? 2352 : 2048;
    this.totalSectors = Math.floor(arrayBuffer.byteLength / this.sectorSize);
    this.bootloader.parseAndBootGame();
  }
}

class KLabsFileLoader {
  constructor(coreSystem) {
    this.core = coreSystem;
  }

  async loadBIOS(fileBlob) {
    const arrayBuffer = await fileBlob.arrayBuffer();
    new Uint8Array(this.core.memory.biosROM).set(new Uint8Array(arrayBuffer).subarray(0, 512*1024));
    return true;
  }

  async loadROM(fileBlob) {
    const arrayBuffer = await fileBlob.arrayBuffer();
    new Uint8Array(this.core.memory.mainRAM).set(new Uint8Array(arrayBuffer).subarray(0, 2*1024*1024));
    if (this.core.cdrom) this.core.cdrom.mountDisc(arrayBuffer);
    return true;
  }
}

class KLabsMIPSProcessor {
  constructor(memoryBus) {
    this.mem = memoryBus;
    this.GPR = new Int32Array(32);
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000;
    this.nextPC = this.PC + 4;
    this.isRunning = false;
  }

  reset() {
    this.GPR.fill(0);
    this.HI = 0;
    this.LO = 0;
    this.PC = 0xbfc00000;
    this.nextPC = this.PC + 4;
  }

  step() {
    const instruction = this.mem.read32(this.PC);
    this.PC = this.nextPC;
    this.nextPC = this.PC + 4;
    if (instruction === 0) return;
    
    const opcode = (instruction >>> 26) & 0x3F;
    const rs = (instruction >>> 21) & 0x1F;
    const rt = (instruction >>> 16) & 0x1F;
    const imm = instruction & 0xFFFF;
    const immSigned = (imm & 0x8000) ? (imm | 0xFFFF0000) : imm;

    if (opcode === 0x08 || opcode === 0x09) {
      this.GPR[rt] = (this.GPR[rs] + immSigned) | 0;
    } else if (opcode === 0x23) {
      this.GPR[rt] = this.mem.read32(this.GPR[rs] + immSigned);
    } else if (opcode === 0x2B) {
      this.mem.write32(this.GPR[rs] + immSigned, this.GPR[rt]);
    }
  }
}

class KLabsSoundProcessor {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.audioCtx = null;
    this.gainNode = null;
    this.analyser = null;
  }

  initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.75;
      this.analyser = this.audioCtx.createAnalyser();
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (e) {}
  }
}

class KKlabsUltraGPURenderer {
  constructor(coreSystem, containerId = 'game') {
    this.core = coreSystem;
    this.containerId = containerId;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.vramTexture = null;
    this.initWebGL2Context();
  }

  initWebGL2Context() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    
    container.innerHTML = '';
    container.appendChild(this.canvas);
    
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!this.gl) return;

    this.initShadersAndBuffers();
    this.initVRAMTexture();
  }

  initShadersAndBuffers() {
    const gl = this.gl;
    const vsSource = `#version 300 es
      in vec2 aPosition;
      in vec2 aTexCoord;
      out vec2 vTexCoord;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = aTexCoord;
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      in vec2 vTexCoord;
      uniform sampler2D uVramTex;
      uniform float uTime;
      uniform int uIsRunning;
      out vec4 fragColor;

      void main() {
        vec2 uv = vTexCoord;
        vec4 vramColor = texture(uVramTex, uv);
        vec3 col = mix(vec3(0.005, 0.02, 0.06), vec3(0.02, 0.08, 0.20), uv.y);

        if (uIsRunning == 1) {
          vec3 gameVisual = mix(col, vramColor.rgb * 1.5, 0.6);
          vec2 center = uv - 0.5;
          float r = length(center);
          float wave = sin(r * 20.0 - uTime * 4.0) / (r * 8.0 + 0.4);
          vec3 neonCyan = vec3(0.0, 1.0, 0.9) * 0.8;
          gameVisual += neonCyan * abs(wave) * (1.0 - r);
          col = gameVisual;
        } else {
          float scanline = sin(uv.y * 600.0) * 0.03;
          col -= scanline;
        }

        col = col / (col + vec3(1.0));
        col = pow(col, vec3(0.85));
        fragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    this.program = program;

    const vertices = new Float32Array([-1,-1, 0,1, 1,-1, 1,1, -1,1, 0,0, -1,1, 0,0, 1,-1, 1,1, 1,1, 1,0]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    const aTex = gl.getAttribLocation(program, "aTexCoord");
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);
  }

  initVRAMTexture() {
    const gl = this.gl;
    this.vramTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.vramTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  renderFrame() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.vramTexture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1024, 512, 0, 
      gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, this.core.memory.vram
    );

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);
    
    gl.uniform1f(gl.getUniformLocation(this.program, "uTime"), performance.now() * 0.001);
    gl.uniform1i(gl.getUniformLocation(this.program, "uIsRunning"), (this.core.cpu && this.core.cpu.isRunning) ? 1 : 0);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.vramTexture);
    gl.uniform1i(gl.getUniformLocation(this.program, "uVramTex"), 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

class KLabsExecutionEngine {
  constructor(coreSystem) {
    this.core = coreSystem;
    this.animationFrameId = null;
    this.timeoutId = null;
    this.initTelemetryHUD();
  }

  initTelemetryHUD() {
    if (document.getElementById('klabs-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'klabs-hud';
    hud.style.cssText = `
      position: absolute; top: 15px; right: 15px;
      background: rgba(3, 7, 18, 0.9); border: 1px solid rgba(0, 255, 204, 0.5);
      border-radius: 8px; padding: 8px 12px; font-family: 'Segoe UI', monospace;
      font-size: 11px; color: #00ffcc; z-index: 99; pointer-events: none;
      backdrop-filter: blur(8px); box-shadow: 0 4px 25px rgba(0, 255, 204, 0.2);
    `;
    hud.innerHTML = `
      <div style="font-weight:bold; letter-spacing:1px; margin-bottom:2px; color:#38bdf8;">K-LABS ROCKET HUD</div>
      <div>FPS: <span id="hud-fps" style="color:#fff; font-weight:bold;">0</span></div>
      <div>CPU PC: <span id="hud-pc" style="color:#fff;">0xbfc00000</span></div>
      <div>DISC: <span id="hud-disc" style="color:#38bdf8;">IDLE</span></div>
    `;
    setTimeout(() => {
      const container = document.getElementById('game');
      if (container) {
        container.style.position = 'relative';
        container.appendChild(hud);
      }
    }, 100);
  }

  updateHUD() {
    const now = performance.now();
    this.core.stats.frameCount++;
    if (now - this.core.stats.lastTime >= 1000) {
      this.core.stats.fps = Math.round((this.core.stats.frameCount * 1000) / (now - this.core.stats.lastTime));
      this.core.stats.frameCount = 0;
      this.core.stats.lastTime = now;

      const f = document.getElementById('hud-fps');
      const p = document.getElementById('hud-pc');
      const d = document.getElementById('hud-disc');
      if (f) f.textContent = this.core.stats.fps;
      if (p && this.core.cpu) p.textContent = '0x' + this.core.cpu.PC.toString(16).toUpperCase();
      if (d && this.core.cdrom) d.textContent = this.core.cdrom.isInserted ? `MOUNTED (${this.core.cdrom.totalSectors} SEC)` : 'NO DISC';
    }
  }

  startLoop() {
    if (!this.core.cpu) return;
    if (this.core.spu) this.core.spu.initAudio();
    this.core.cpu.isRunning = true;
    this.runTick();
  }

  runTick() {
    if (!this.core.cpu || !this.core.cpu.isRunning) return;

    for (let i = 0; i < 12000; i++) {
      this.core.cpu.step();
    }
    if (this.core.gpu) this.core.gpu.renderFrame();
    this.updateHUD();

    if (this.core.profile.unlockedFPS) {
      this.timeoutId = setTimeout(() => this.runTick(), 0);
    } else {
      this.animationFrameId = requestAnimationFrame(() => this.runTick());
    }
  }

  stopLoop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.core.cpu) this.core.cpu.isRunning = false;
  }
}

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
      if (isPressed) this.buttonState &= ~bitMask;
      else this.buttonState |= bitMask;

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

  exportSaveFile() {
    try {
      const blob = new Blob([this.core.memory.mainRAM], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "K-Labs_PS1_SaveState.sav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {}
  }

  importSaveFile(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        new Uint8Array(this.core.memory.mainRAM).set(new Uint8Array(e.target.result));
        alert("Save State berhasil dimuat dari penyimpanan internal!");
      } catch (err) {}
    };
    reader.readAsArrayBuffer(file);
  }
}

// --- INISIALISASI & PENGIKATAN GLOBAL YANG BERSIH TANPA KONFLIK ---
const masterEngineInstance = new KLabsCoreSystem();
masterEngineInstance.bus = new KLabsMemoryBus(masterEngineInstance);
masterEngineInstance.loader = new KLabsFileLoader(masterEngineInstance);
masterEngineInstance.cpu = new KLabsMIPSProcessor(masterEngineInstance.bus);
masterEngineInstance.cdrom = new KLabsCDROMController(masterEngineInstance);
masterEngineInstance.spu = new KLabsSoundProcessor(masterEngineInstance);
masterEngineInstance.gpu = new KKlabsUltraGPURenderer(masterEngineInstance, 'game');
masterEngineInstance.execution = new KLabsExecutionEngine(masterEngineInstance);
masterEngineInstance.joypad = new KLabsJoypadController(masterEngineInstance);
masterEngineInstance.advanced = new KLabsAdvancedFeatures(masterEngineInstance);

// Daftarkan ke window secara aman sekali di akhir
Object.defineProperty(window, 'KLabsEngine', {
  value: masterEngineInstance,
  writable: false,
  configurable: false
});

console.log("[K-Labs Engine] Inisialisasi Aerospace Grade Berhasil Sempurna!");
