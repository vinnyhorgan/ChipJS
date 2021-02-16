class CPU {
  constructor(renderer, keyboard, speaker) {
    this.renderer = renderer;
    this.keyboard = keyboard;
    this.speaker = speaker;

    this.memory = new Uint8Array(4096);

    this.v = new Uint8Array(16);

    this.i = 0;

    this.delayTimer = 0;
    this.soundTimer = 0;

    this.pc = 0x200;

    this.stack = new Array();

    this.paused = false;

    this.speed = 10;
  }

  loadSpritesIntoMemory() {
    const sprites = [
      0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];

    for (let i = 0; i < sprites.length; i++) {
      this.memory[i] = sprites[i];
    }
  }

  loadProgramIntoMemory(program) {
    for (let loc = 0; loc < program.length; loc++) {
      this.memory[0x200 + loc] = program[loc];
    }
  }

  loadRom(romName) {
    var request = new XMLHttpRequest;
    var self = this;

    request.onload = function() {
      if (request.response) {
        let program = new Uint8Array(request.response);

        self.loadProgramIntoMemory(program);
      }
    }

    request.open("GET", "/roms/" + romName);
    request.responseType = "arraybuffer";

    request.send();
  }

  cycle() {
    for (let i = 0; i < this.speed; i++) {
      if (!this.paused) {
        let opcode = (this.memory[this.pc] << 8 | this.memory[this.pc + 1]);
        this.executeInstruction(opcode);
      }
    }

    if (!this.paused) {
      this.updateTimers();
    }

    this.playSound();
    this.renderer.render();
  }

  updateTimers() {
    if (this.delayTimer > 0) {
      this.delayTimer -= 1;
    }

    if (this.soundTimer > 0) {
      this.soundTimer -= 1;
    }
  }

  playSound() {
    if (this.soundTimer > 0) {
      this.speaker.play(440);
    } else {
      this.speaker.stop();
    }
  }

  executeInstruction(opcode) {
    this.pc += 2;

    let x = (opcode & 0x0F00) >> 8;
    let y = (opcode & 0x00F0) >> 4;

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (opcode) {
          case 0x00E0:
            this.renderer.clear();
            break;
          case 0x00EE:
            this.pc = this.stack.pop();
            break;
        }

        break;

      case 0x1000:
        this.pc = (opcode & 0xFFF);
        break;
      case 0x2000:
        this.stack.push(this.pc);
        this.pc = (opcode & 0xFFF);
        break;
      case 0x3000:
        if (this.v[x] === (opcode & 0xFF)) {
          this.pc += 2;
        }
        break;
      case 0x4000:
        if (this.v[x] !== (opcode & 0xFF)) {
          this.pc += 2;
        }
        break;
      case 0x5000:
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0x6000:
        this.v[x] = (opcode & 0xFF);
        break;
      case 0x7000:
        this.v[x] += (opcode & 0xFF);
        break;
      case 0x8000:
        switch (opcode & 0xF) {
          case 0x0:
            this.v[x] = this.v[y];
            break;
          case 0x1:
            this.v[x] |= this.v[y];
            break;
          case 0x2:
            this.v[x] &= this.v[y];
            break;
          case 0x3:
            this.v[x] ^= this.v[y];
            break;
          case 0x4:
            let sum = (this.v[x] += this.v[y]);

            this.v[0xF] = 0;

            if (sum > 0xFF) {
              this.v[0xF] = 1;
            }

            this.v[x] = sum;
            break;
          case 0x5:
            this.v[0xF] = 0;

            if (this.v[x] > this.v[y]) {
              this.v[0xF] = 1;
            }

            this.v[x] -= this.v[y];
            break;
          case 0x6:
            this.v[0xF] = (this.v[x] & 0x1);

            this.v[x] >>= 1;
            break;
          case 0x7:
            this.v[0xF] = 0;

            if (this.v[y] > this.v[x]) {
              this.v[0xF] = 1;
            }

            this.v[x] = this.v[y] - this.v[x];
            break;
          case 0xE:
            this.v[0xF] = (this.v[x] & 0x80);
            this.v[x] <<= 1;
            break;
        }

        break;
      case 0x9000:
        if (this.v[x] !== this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0xA000:
        this.i = (opcode & 0xFFF);
        break;
      case 0xB000:
        this.pc = (opcode & 0xFFF) + this.v[0];
        break;
      case 0xC000:
        let rand = Math.floor(Math.random() * 0xFF);

        this.v[x] = rand & (opcode & 0xFF);
        break;
      case 0xD000:
        let width = 8;
        let height = (opcode & 0xF);

        this.v[0xF] = 0;

        for (let row = 0; row < height; row++) {
          let sprite = this.memory[this.i + row];

          for (let col = 0; col < width; col++) {
            if ((sprite & 0x80) > 0) {
              if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                this.v[0xF] = 1;
              }
            }

          sprite <<= 1;
          }
        }
        break;
      case 0xE000:
        switch (opcode & 0xFF) {
          case 0x9E:
            if (this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
          case 0xA1:
            if (!this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
        }

        break;
      case 0xF000:
        switch (opcode & 0xFF) {
          case 0x07:
            this.v[x] = this.delayTimer;
            break;
          case 0x0A:
            this.paused = true;

            this.keyboard.onNextKeyPress = function(key) {
              this.v[x] = key;
              this.paused = false;
            }.bind(this);
            break;
          case 0x15:
            this.delayTimer = this.v[x];
            break;
          case 0x18:
            this.soundTimer = this.v[x];
            break;
          case 0x1E:
            this.i += this.v[x];
            break;
          case 0x29:
            this.i = this.v[x] * 5;
            break;
          case 0x33:
            this.memory[this.i] = parseInt(this.v[x] / 100);

            this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);

            this.memory[this.i + 2] = parseInt(this.v[x] % 10);
            break;
          case 0x55:
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.memory[this.i + registerIndex] = this.v[registerIndex];
            }
            break;
          case 0x65:
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.v[registerIndex] = this.memory[this.i + registerIndex];
            }
            break;
        }

        break;

      default:
        throw new Error("Unknown opcode " + opcode);
    }
  }
}

class Keyboard {
  constructor() {
    this.KEYMAP = {
      49: 0x1, // 1
      50: 0x2, // 2
      51: 0x3, // 3
      52: 0xc, // 4
      81: 0x4, // Q
      87: 0x5, // W
      69: 0x6, // E
      82: 0xD, // R
      65: 0x7, // A
      83: 0x8, // S
      68: 0x9, // D
      70: 0xE, // F
      90: 0xA, // Z
      88: 0x0, // X
      67: 0xB, // C
      86: 0xF  // V
    }

    this.keysPressed = [];

    this.onNextKeyPress = null;

    window.addEventListener("keydown", this.onKeyDown.bind(this), false);
    window.addEventListener("keyup", this.onKeyUp.bind(this), false);
  }

  isKeyPressed(keyCode) {
    return this.keysPressed[keyCode];
  }

  onKeyDown(event) {
    let key = this.KEYMAP[event.which];
    this.keysPressed[key] = true;

    if (this.onNextKeyPress !== null && key) {
        this.onNextKeyPress(parseInt(key));
        this.onNextKeyPress = null;
    }
  }

  onKeyUp(event) {
    let key = this.KEYMAP[event.which];
    this.keysPressed[key] = false;
  }
}

class Renderer {
  constructor(scale) {
    this.cols = 64;
    this.rows = 32;

    this.scale = scale;

    this.canvas = document.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.width = this.cols * this.scale;
    this.canvas.height = this.rows * this.scale;

    this.display = new Array(this.cols * this.rows);
  }

  setPixel(x, y) {
    if (x > this.cols) {
      x -= this.cols;
    } else if (x < 0) {
      x += this.cols;
    }

    if (y > this.rows) {
      y -= this.rows;
    } else if (y < 0) {
      y += this.rows;
    }

    let pixelLoc = x + (y * this.cols);

    this.display[pixelLoc] ^= 1;

    return !this.display[pixelLoc];
  }

  clear() {
    this.display = new Array(this.cols * this.rows);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.cols * this.rows; i++) {
      let x = (i % this.cols) * this.scale;

      let y = Math.floor(i / this.cols) * this.scale;

      if (this.display[i]) {
        this.ctx.fillStyle = "#000";

        this.ctx.fillRect(x, y, this.scale, this.scale);
      }
    }
  }
}

class Speaker {
  constructor() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    this.audioCtx = new AudioContext();

    this.gain = this.audioCtx.createGain();
    this.finish = this.audioCtx.destination;

    this.gain.connect(this.finish);
  }

  play(frequency) {
    if (this.audioCtx && !this.oscillator) {
      this.oscillator = this.audioCtx.createOscillator();

      this.oscillator.frequency.setValueAtTime(frequency || 440, this.audioCtx.currentTime);

      this.oscillator.type = "square";

      this.oscillator.connect(this.gain);
      this.oscillator.start();
    }
  }

  stop() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
  }
}

class ChipJS {
  constructor(rom) {
    const renderer = new Renderer(10);
    const keyboard = new Keyboard();
    const speaker = new Speaker();
    const cpu = new CPU(renderer, keyboard, speaker);

    let loop;

    let fps = 60, fpsInterval, startTime, now, then, elapsed;

    function init() {
      fpsInterval = 1000 / fps;
      then = Date.now();
      startTime = then;

      renderer.render();

      cpu.loadSpritesIntoMemory();
      cpu.loadRom(rom);
      loop = requestAnimationFrame(step);
    }

    function step() {
      now = Date.now();
      elapsed = now - then;

      if (elapsed > fpsInterval) {
        cpu.cycle();
      }

      loop = requestAnimationFrame(step);
    }

    init();
  }
}
