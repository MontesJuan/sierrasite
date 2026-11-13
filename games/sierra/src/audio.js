/** Original, quiet procedural audio. No files, network, microphone or recordings. */
export class SierraAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.speed = 0;
    this.mounted = false;
    this.destroyed = false;
    this.birdTimer = null;
    this.stepTimer = null;
    this.stepNumber = 0;
  }

  async setEnabled(value) {
    if (this.destroyed) return false;
    this.enabled = Boolean(value);
    if (!this.enabled) {
      clearTimeout(this.birdTimer); clearTimeout(this.stepTimer);
      this.birdTimer = this.stepTimer = null;
      if (this.context && this.master) this.master.gain.setTargetAtTime(0, this.context.currentTime, .06);
      return false;
    }
    try {
      // This method is called by the app from a user click / key gesture.
      if (!this.context) this.createContext();
      await this.context.resume();
      if (!this.enabled || this.destroyed) return false;
      this.master.gain.setTargetAtTime(.24, this.context.currentTime, .15);
      this.scheduleBird();
      this.scheduleStep();
      return this.context.state === 'running';
    } catch {
      this.enabled = false;
      return false;
    }
  }

  createContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio unavailable');
    this.context = new AudioContext();
    const context = this.context;
    this.master = context.createGain(); this.master.gain.value = 0; this.master.connect(context.destination);
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
    const delay = this.mounted ? 220 : 350;
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

  cue(kind) {
    if (!this.enabled || this.context?.state !== 'running' || this.destroyed) return;
    const now = this.context.currentTime;
    if (kind === 'success') {
      this.tone(520, now, .23, .16); this.tone(650, now + .12, .26, .13); this.tone(780, now + .25, .34, .11);
    } else if (kind === 'error') {
      this.tone(210, now, .2, .12, 'sine', 150);
    } else if (kind === 'photo') {
      this.tone(1800, now, .025, .08, 'triangle', 240); this.tone(700, now + .035, .03, .05, 'triangle', 180);
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
