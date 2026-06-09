class AlarmSystem {
    constructor() {
        this.audioCtx = null;
        this.volume = 0.7;
        this.soundType = 'default';
        this.customBuffer = null;
        this.customSoundUrl = null;
        this.fallbackAudio = null;
        this.unlocked = false;
        this._setupInteractionUnlock();
        this._startKeepAlive();
    }

    /* ── AudioContext management ── */

    getAudioContext() {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    /* ── PWA Audio Fix A: unlock on first user interaction ── */

    _setupInteractionUnlock() {
        const unlock = () => {
            const ctx = this.getAudioContext();
            // Play a silent buffer to fully unlock audio on iOS/Android
            try {
                const buf = ctx.createBuffer(1, 1, 22050);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start(0);
            } catch {}
            this.unlocked = true;
            ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt =>
                document.removeEventListener(evt, unlock, true)
            );
        };
        ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt =>
            document.addEventListener(evt, unlock, { capture: true })
        );
    }

    /* ── PWA Audio Fix B: silent keep-alive in standalone mode ── */

    _startKeepAlive() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
        if (!isStandalone) return;

        setInterval(() => {
            if (this.audioCtx && this.audioCtx.state === 'running') {
                try {
                    const buf = this.audioCtx.createBuffer(1, 1, 22050);
                    const src = this.audioCtx.createBufferSource();
                    src.buffer = buf;
                    src.connect(this.audioCtx.destination);
                    src.start();
                } catch {}
            }
        }, 25000);
    }

    /* ── Volume & Sound type ── */

    setVolume(v) {
        this.volume = v / 100;
        if (this.fallbackAudio) this.fallbackAudio.volume = this.volume;
    }

    setSoundType(type) {
        this.soundType = type;
        // If custom:xxx, load the audio
        if (type.startsWith('custom:')) {
            const url = type.substring(7);
            this.loadCustomSound(url);
        } else {
            this.customBuffer = null;
            this.customSoundUrl = null;
        }
    }

    /* ── Custom sound loading ── */

    async loadCustomSound(url) {
        this.customSoundUrl = url;
        try {
            const ctx = this.getAudioContext();
            let arrayBuf;
            if (url.startsWith('data:')) {
                // Decode base64 data URL directly (more efficient than fetch)
                const base64 = url.split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                arrayBuf = bytes.buffer;
            } else {
                const resp = await fetch(url);
                arrayBuf = await resp.arrayBuffer();
            }
            this.customBuffer = await ctx.decodeAudioData(arrayBuf);
        } catch (e) {
            console.warn('Failed to load custom sound:', e);
            this.customBuffer = null;
        }
    }

    /* ── Built-in synthesized sounds ── */

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

    /* ── Elite sound: aggressive "battle horn" — distinct from event alarms ── */
    playElite() {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        // Low descending war horn
        this.playNote(ctx, 220, now,        0.18, 0.5, 'sawtooth');
        this.playNote(ctx, 165, now + 0.18, 0.18, 0.5, 'sawtooth');
        this.playNote(ctx, 220, now + 0.36, 0.18, 0.5, 'sawtooth');
        // Then a sharp metallic "clang" — square wave high notes
        this.playNote(ctx, 1568, now + 0.6,  0.12, 0.35, 'square');
        this.playNote(ctx, 2093, now + 0.72, 0.12, 0.35, 'square');
        this.playNote(ctx, 2637, now + 0.84, 0.4,  0.4,  'square');
    }

    /* ── Custom sound playback ── */

    playCustom() {
        if (!this.customBuffer) {
            // Fallback: try HTML5 Audio if buffer failed to load
            if (this.customSoundUrl) {
                this._playFallbackAudio(this.customSoundUrl);
            } else {
                this.playDefault();
            }
            return;
        }
        try {
            const ctx = this.getAudioContext();
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            source.buffer = this.customBuffer;
            gainNode.gain.value = this.volume;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(0);
        } catch (e) {
            console.warn('Custom sound playback failed:', e);
            this._playFallbackAudio(this.customSoundUrl);
        }
    }

    /* ── PWA Audio Fix C: HTML5 Audio fallback ── */

    _playFallbackAudio(url) {
        if (!url) return;
        try {
            if (this.fallbackAudio) {
                this.fallbackAudio.pause();
                this.fallbackAudio.currentTime = 0;
            }
            this.fallbackAudio = new Audio(url);
            this.fallbackAudio.volume = this.volume;
            this.fallbackAudio.play().catch(() => {});
        } catch {}
    }

    /* ── Main play method with PWA fallback ── */

    async play() {
        try {
            const ctx = this.getAudioContext();
            // Try to resume if suspended (PWA fix)
            if (ctx.state === 'suspended') {
                try { await ctx.resume(); } catch {}
            }

            if (this.soundType.startsWith('custom:')) {
                this.playCustom();
                return;
            }

            if (ctx.state === 'running') {
                switch (this.soundType) {
                    case 'bell': this.playBell(); break;
                    case 'horn': this.playHorn(); break;
                    case 'chime': this.playChime(); break;
                    default: this.playDefault();
                }
            } else {
                // AudioContext still suspended — try vibration as last resort
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
            }
        } catch (e) {
            console.warn('Audio playback failed:', e);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }

    /* ── Elite-specific play (always uses battle horn, ignores soundType) ── */
    async playForElite() {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') {
                try { await ctx.resume(); } catch {}
            }
            if (ctx.state === 'running') {
                this.playElite();
            } else if (navigator.vibrate) {
                navigator.vibrate([300, 80, 300, 80, 500]);
            }
        } catch (e) {
            console.warn('Elite alarm failed:', e);
            if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        }
    }

    /* ── Notifications with improved PWA support ── */

    async sendNotification(title, body, icon = '⚔️') {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        if (Notification.permission === 'granted') {
            try {
                const reg = await navigator.serviceWorker?.ready;
                if (reg) {
                    // Use SW notification (works in background/standalone PWA)
                    reg.showNotification(title, {
                        body,
                        icon: 'favicon.svg',
                        badge: 'favicon.svg',
                        tag: 'mudream-event-' + Date.now(),
                        renotify: true,
                        requireInteraction: true,
                        vibrate: [200, 100, 200, 100, 200],
                        silent: false
                    });
                } else {
                    // Fallback: regular notification
                    new Notification(title, {
                        body,
                        icon: 'favicon.svg',
                        badge: 'favicon.svg',
                        tag: 'mudream-event',
                        renotify: true,
                        vibrate: [200, 100, 200]
                    });
                }
            } catch {
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
}
