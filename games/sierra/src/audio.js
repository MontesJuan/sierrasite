/**
 * Sonido del juego. Viento, pasos y señales se sintetizan; la música y algunos
 * efectos son archivos generados para el juego (ver docs/ASSET-CREDITS.md).
 * Sin micrófono ni grabaciones de personas. Los archivos se piden sólo con el sonido activado.
 */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]; // do mayor pentatónica
export class SierraAudio {
  constructor(base = '/jugar/') {
    this.base = base;
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.speed = 0;
    this.mounted = false;
    this.destroyed = false;
    this.birdTimer = null;
    this.stepTimer = null;
    this.stepNumber = 0;
    this.buffers = new Map();
    this.loops = new Map();
    this.music = null;
    this.musicName = null;
  }

  async setEnabled(value) {
    if (this.destroyed) return false;
    this.enabled = Boolean(value);
    if (!this.enabled) {
      clearTimeout(this.birdTimer); clearTimeout(this.stepTimer);
      this.birdTimer = this.stepTimer = null;
      if (this.context && this.output) this.output.gain.setTargetAtTime(0, this.context.currentTime, .06);
      return false;
    }
    try {
      // This method is called by the app from a user click / key gesture.
      if (!this.context) this.createContext();
      await this.context.resume();
      if (!this.enabled || this.destroyed) return false;
      this.output.gain.setTargetAtTime(1, this.context.currentTime, .15);
      this.scheduleBird();
      this.scheduleStep();
      if (this.musicName) this.setMusic(this.musicName, true);
      return this.context.state === 'running';
    } catch {
      this.enabled = false;
      return false;
    }
  }

  /** El navegador puede dejar el audio en pausa hasta el próximo gesto: reintentar ahí. */
  unlock() { if (this.enabled && this.context && this.context.state !== 'running') this.context.resume().then(() => { if (this.musicName) this.setMusic(this.musicName, true); }).catch(() => {}); }

  createContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio unavailable');
    this.context = new AudioContext();
    const context = this.context;
    this.output = context.createGain(); this.output.gain.value = 0; this.output.connect(context.destination);
    this.master = context.createGain(); this.master.gain.value = .24; this.master.connect(this.output);
    this.musicBus = context.createGain(); this.musicBus.gain.value = .3; this.musicBus.connect(this.output);
    this.sampleBus = context.createGain(); this.sampleBus.gain.value = .75; this.sampleBus.connect(this.output);
    // A looping, filtered noise bed evokes air through dry vegetation.
    this.noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      previous = (previous + (Math.random() * 2 - 1) * .025) / 1.025;
      const envelope = .72 + Math.sin(i / data.length * Math.PI * 2) * .23;
      data[i] = previous * envelope;
    }
    this.wind = context.createBufferSource(); this.wind.buffer = this.noiseBuffer; this.wind.loop = true;
    const windFilter = context.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 950; windFilter.Q.value = .4;
    const windGain = context.createGain(); windGain.gain.value = .8;
    this.wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(this.master); this.wind.start();
  }

  /** Descarga y decodifica una sola vez. Un archivo que falta no interrumpe el juego. */
  load(name) {
    if (!this.buffers.has(name)) this.buffers.set(name, fetch(`${this.base}audio/${name}.mp3`).then(response => { if (!response.ok) throw new Error(name); return response.arrayBuffer(); }).then(bytes => this.context.decodeAudioData(bytes)).catch(() => null));
    return this.buffers.get(name);
  }

  /** Efecto corto: cabra, pavo, gallina, tranquera, mula, charango. */
  async sample(name, { volume = 1, rate = 1 } = {}) {
    if (!this.enabled || this.context?.state !== 'running' || this.destroyed) return;
    const buffer = await this.load(name); if (!buffer || !this.enabled || this.destroyed) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.playbackRate.value = rate; gain.gain.value = volume;
    source.connect(gain); gain.connect(this.sampleBus); source.start();
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }

  /** Ambientes en bucle según la cercanía: { majada, rio, telar } entre 0 y 1. */
  setAmbience(levels) {
    if (!this.enabled || this.context?.state !== 'running' || this.destroyed) return;
    for (const [name, level] of Object.entries(levels)) {
      const target = Math.max(0, Math.min(1, Number(level) || 0)); let loop = this.loops.get(name);
      if (!loop) {
        if (target < .02) continue;
        loop = { gain: this.context.createGain() }; loop.gain.gain.value = 0; loop.gain.connect(this.sampleBus); this.loops.set(name, loop);
        this.load(name).then(buffer => { if (!buffer || this.destroyed) return; loop.source = this.context.createBufferSource(); loop.source.buffer = buffer; loop.source.loop = true; loop.source.connect(loop.gain); loop.source.start(); });
      }
      loop.gain.gain.setTargetAtTime(target, this.context.currentTime, .4);
    }
  }

  /** Baja la música y el ambiente mientras se escucha una voz del documental. */
  duck(on) {
    if (!this.context || !this.musicBus) return;
    const now = this.context.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? .05 : .3, now, .25); this.sampleBus.gain.setTargetAtTime(on ? .15 : .75, now, .25); this.master.gain.setTargetAtTime(on ? .06 : .24, now, .25);
  }

  /** Música de fondo: 'viaje', 'encuentro', 'libro' o null. Cambia con un fundido. */
  async setMusic(name, force = false) {
    if (name === this.musicName && !force && this.music) return;
    this.musicName = name;
    if (!this.enabled || this.context?.state !== 'running' || this.destroyed) return;
    const now = this.context.currentTime, previous = this.music; this.music = null;
    if (previous) { previous.gain.gain.setTargetAtTime(0, now, .5); setTimeout(() => { try { previous.source.stop(); } catch { /* ya detenida */ } previous.source.disconnect(); previous.gain.disconnect(); }, 2600); }
    if (!name) return;
    const buffer = await this.load(`musica-${name}`);
    if (!buffer || this.musicName !== name || this.music || !this.enabled || this.destroyed) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = true; gain.gain.value = 0; gain.gain.setTargetAtTime(1, this.context.currentTime, .9);
    source.connect(gain); gain.connect(this.musicBus); source.start(); this.music = { source, gain, name };
  }

  setWalking(speed, mounted = false) {
    this.speed = Math.abs(Number(speed) || 0);
    this.mounted = Boolean(mounted);
    if (this.speed < .1) {
      clearTimeout(this.stepTimer); this.stepTimer = null;
      return;
    }
    this.scheduleStep();
  }

  scheduleStep() {
    if (this.stepTimer || !this.enabled || !this.context || this.speed < .1 || this.destroyed) return;
    const delay = (this.mounted ? 220 : 350) / Math.min(1.7, Math.max(.8, this.speed / 1.8));
    this.stepTimer = setTimeout(() => {
      this.stepTimer = null;
      if (!this.enabled || this.speed < .1 || this.destroyed || this.context?.state !== 'running') return;
      this.footstep(); this.scheduleStep();
    }, delay);
  }

  footstep() {
    const context = this.context, now = context.currentTime;
    const source = context.createBufferSource(); source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = this.mounted ? 330 : 650; filter.Q.value = .5;
    const gain = context.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(this.mounted ? .6 : .37, now + .008); gain.gain.exponentialRampToValueAtTime(.001, now + (this.mounted ? .1 : .16));
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start(now, Math.random() * 2); source.stop(now + .18);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    if (this.mounted) this.tone(90 + (this.stepNumber % 2) * 28, now, .07, .07, 'sine', 65);
    this.stepNumber++;
  }

  scheduleBird() {
    if (this.birdTimer || !this.enabled || this.destroyed) return;
    this.birdTimer = setTimeout(() => {
      this.birdTimer = null;
      if (!this.enabled || this.destroyed || this.context?.state !== 'running') return;
      const now = this.context.currentTime;
      const base = 1700 + Math.random() * 600;
      this.tone(base, now, .11, .026, 'sine', base + 550);
      this.tone(base + 150, now + .17, .1, .018, 'sine', base - 150);
      this.scheduleBird();
    }, 8000 + Math.random() * 11000);
  }

  tone(frequency, when, duration, volume, type = 'sine', endFrequency = frequency) {
    if (!this.context || !this.master || this.destroyed) return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, when); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), when + duration);
    gain.gain.setValueAtTime(.0001, when); gain.gain.exponentialRampToValueAtTime(volume, when + .01); gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(when); oscillator.stop(when + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  /** `step` sube la nota de «word» con cada palabra seguida, como una escalera. */
  cue(kind, step = 1) {
    if (!this.enabled || this.context?.state !== 'running' || this.destroyed) return;
    const now = this.context.currentTime;
    if (kind === 'success') {
      this.tone(520, now, .23, .16); this.tone(650, now + .12, .26, .13); this.tone(780, now + .25, .34, .11);
    } else if (kind === 'error') {
      this.tone(210, now, .2, .12, 'sine', 150);
    } else if (kind === 'photo') {
      this.tone(1800, now, .025, .08, 'triangle', 240); this.tone(700, now + .035, .03, .05, 'triangle', 180);
    } else if (kind === 'word') {
      const note = SCALE[Math.min(SCALE.length - 1, Math.max(0, step - 1))];
      this.tone(note, now, .16, .3, 'triangle'); this.tone(note * 1.5, now + .07, .28, .2, 'sine'); this.tone(note * 2, now + .14, .3, .09, 'sine');
    } else if (kind === 'star') {
      [0, 4, 7, 12].forEach((semitone, i) => this.tone(659.25 * 2 ** (semitone / 12), now + i * .09, .4, .2, 'triangle'));
    } else if (kind === 'rumble' || kind === 'wind') {
      // Aviso de derrumbe (grave y corto) o de ráfaga (soplido que crece): ruido filtrado.
      const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain(), rumble = kind === 'rumble';
      source.buffer = this.noiseBuffer; filter.type = rumble ? 'lowpass' : 'bandpass'; filter.frequency.setValueAtTime(rumble ? 170 : 500, now); if (!rumble) filter.frequency.linearRampToValueAtTime(1500, now + 1.3);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(rumble ? 2.6 : 1.6, now + (rumble ? .12 : .9)); gain.gain.exponentialRampToValueAtTime(.0001, now + (rumble ? 1.3 : 2.1));
      source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(now, Math.random()); source.stop(now + 2.2);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      if (rumble) { this.tone(70, now, .5, .3, 'sine', 42); this.tone(58, now + .3, .6, .24, 'sine', 38); }
    } else if (kind === 'jump') {
      this.tone(260, now, .14, .1, 'sine', 430);
    } else if (kind === 'land') {
      this.tone(120, now, .12, .26, 'sine', 55);
    }
  }

  destroy() {
    this.destroyed = true; this.enabled = false;
    clearTimeout(this.birdTimer); clearTimeout(this.stepTimer);
    try { this.wind?.stop(); } catch { /* already stopped */ }
    this.wind?.disconnect(); this.master?.disconnect();
    this.context?.close().catch(() => {});
    this.context = null; this.master = null;
  }
}
