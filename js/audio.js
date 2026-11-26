const AudioEngine = {
    ctx: null, isInitialized: false, musicInterval: null, beatStep: 0,
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99],
    init() {
        if (this.isInitialized) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
        try { const AudioCtx = window.AudioContext || window.webkitAudioContext; this.ctx = new AudioCtx(); this.isInitialized = true; this.startMusicLoop(); } catch (e) {}
    },
    playTone(freq, type, duration, vol = 0.2, slideTo = null) {
        if (!this.isInitialized || !StorageManager.state.settings.sfx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, now);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + duration);
    },
    playCrystal(combo = 1) {
        const baseFreq = this.scale[Math.min(combo - 1, this.scale.length - 1)];
        this.playTone(baseFreq, 'sine', 0.25, 0.22, baseFreq * 1.5);
        setTimeout(() => this.playTone(baseFreq * 1.5, 'triangle', 0.2, 0.12), 45);
    },
    playNearMiss() { this.playTone(320, 'sine', 0.18, 0.18, 680); },
    playThrust() { this.playTone(140, 'triangle', 0.12, 0.08, 240); },
    playBounce() { this.playTone(220, 'sine', 0.14, 0.14, 340); },
    playShieldBreak() { this.playTone(180, 'sawtooth', 0.3, 0.25, 70); },
    playLevelUp() {
        [392.00, 493.88, 587.33, 783.99].forEach((n, i) => setTimeout(() => this.playTone(n, 'triangle', 0.35, 0.22), i * 70));
    },
    playSupernova() {
        [261.63, 329.63, 392.00, 523.25, 659.25].forEach((n, i) => setTimeout(() => this.playTone(n, 'sawtooth', 0.35, 0.12), i * 55));
    },
    playCrash() {
        if (!this.isInitialized || !StorageManager.state.settings.sfx) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.45;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now); filter.frequency.exponentialRampToValueAtTime(60, now + 0.45);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.35, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        noise.start(now); this.playTone(110, 'sawtooth', 0.4, 0.25, 32);
    },
    startMusicLoop() {
        if (this.musicInterval) clearInterval(this.musicInterval);
        const bassNotes = [65.41, 65.41, 82.41, 73.42, 65.41, 65.41, 98.00, 82.41];
        this.musicInterval = setInterval(() => {
            if (!this.isInitialized || !StorageManager.state.settings.music || document.hidden || this.ctx.state !== 'running') return;
            const freq = bassNotes[this.beatStep % bassNotes.length];
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now); osc.stop(now + 0.4); this.beatStep++;
        }, 420);
    }
};