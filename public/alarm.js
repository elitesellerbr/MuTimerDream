class AlarmSystem {
    constructor() {
        this.audioCtx = null;
        this.volume = 0.7;
        this.soundType = 'default';
    }

    getAudioContext() {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    setVolume(v) {
        this.volume = v / 100;
    }

    setSoundType(type) {
        this.soundType = type;
    }

    playNote(ctx, freq, start, dur, gain, type = 'sine') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain * this.volume, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
    }

    playDefault() {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        this.playNote(ctx, 880, now, 0.15, 0.4);
        this.playNote(ctx, 1100, now + 0.15, 0.15, 0.4);
        this.playNote(ctx, 880, now + 0.3, 0.15, 0.4);
        this.playNote(ctx, 1100, now + 0.5, 0.15, 0.4);
        this.playNote(ctx, 880, now + 0.65, 0.15, 0.4);
        this.playNote(ctx, 1320, now + 0.8, 0.4, 0.5);
    }

    playBell() {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        [523, 659, 784, 1047].forEach((f, i) => {
            this.playNote(ctx, f, now + i * 0.25, 0.8, 0.3);
            this.playNote(ctx, f * 2, now + i * 0.25, 0.4, 0.1);
        });
    }

    playHorn() {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        this.playNote(ctx, 262, now, 0.3, 0.5, 'sawtooth');
        this.playNote(ctx, 330, now + 0.3, 0.3, 0.5, 'sawtooth');
        this.playNote(ctx, 392, now + 0.6, 0.6, 0.6, 'sawtooth');
    }

    playChime() {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        [1047, 1319, 1568, 2093].forEach((f, i) => {
            this.playNote(ctx, f, now + i * 0.15, 1.2 - i * 0.2, 0.25);
        });
    }

    play() {
        try {
            switch (this.soundType) {
                case 'bell': this.playBell(); break;
                case 'horn': this.playHorn(); break;
                case 'chime': this.playChime(); break;
                default: this.playDefault();
            }
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }

    async sendNotification(title, body, icon = '⚔️') {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: 'favicon.svg',
                badge: 'favicon.svg',
                tag: 'mudream-event',
                renotify: true,
                vibrate: [200, 100, 200]
            });
        }
    }
}
