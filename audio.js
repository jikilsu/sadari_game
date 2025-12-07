// Audio Manager for Ladder Game
// Uses Web Audio API to generate all sounds procedurally

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.bgmGainNode = null;
        this.sfxGainNode = null;
        this.bgmOscillators = [];
        this.isBgmPlaying = false;
        this.isBgmEnabled = true; // Start with BGM enabled
        this.masterVolume = 0.3; // Overall volume control
        this.bgmVolume = 0.15; // Background music volume (subtle)
        this.sfxVolume = 0.4; // Sound effects volume
    }

    // Initialize Audio Context (must be called after user interaction)
    init() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create gain nodes for mixing
        this.bgmGainNode = this.audioContext.createGain();
        this.bgmGainNode.gain.value = this.bgmVolume;
        this.bgmGainNode.connect(this.audioContext.destination);

        this.sfxGainNode = this.audioContext.createGain();
        this.sfxGainNode.gain.value = this.sfxVolume;
        this.sfxGainNode.connect(this.audioContext.destination);
    }

    // Background Music - Exciting and anticipatory melody
    startBackgroundMusic() {
        if (this.isBgmPlaying || !this.isBgmEnabled) return;
        this.init();

        this.isBgmPlaying = true;

        // Create a cheerful, exciting melody with multiple layers
        // Layer 1: Main melody (higher pitched)
        this.playMelodyLoop();

        // Layer 2: Bass line (lower pitched)
        this.playBassLoop();

        // Layer 3: Rhythm/percussion (using filtered noise)
        this.playRhythmLoop();
    }

    playMelodyLoop() {
        const melodyNotes = [
            { freq: 523.25, duration: 0.3 }, // C5
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 783.99, duration: 0.3 }, // G5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 523.25, duration: 0.6 }, // C5 (longer)
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 698.46, duration: 0.3 }, // F5
            { freq: 783.99, duration: 0.6 }, // G5 (longer)
        ];

        let currentTime = this.audioContext.currentTime;

        const playMelody = () => {
            if (!this.isBgmPlaying) return;

            melodyNotes.forEach((note, index) => {
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                osc.type = 'sine';
                osc.frequency.value = note.freq;

                // ADSR envelope for smooth notes
                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(0.15, currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.1, currentTime + note.duration * 0.7);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);

                osc.connect(gainNode);
                gainNode.connect(this.bgmGainNode);

                osc.start(currentTime);
                osc.stop(currentTime + note.duration);

                this.bgmOscillators.push(osc);
                currentTime += note.duration;
            });

            // Loop the melody
            const totalDuration = melodyNotes.reduce((sum, note) => sum + note.duration, 0);
            setTimeout(() => playMelody(), totalDuration * 1000);
        };

        playMelody();
    }

    playBassLoop() {
        const bassNotes = [
            { freq: 130.81, duration: 0.6 }, // C3
            { freq: 146.83, duration: 0.6 }, // D3
            { freq: 164.81, duration: 0.6 }, // E3
            { freq: 196.00, duration: 0.6 }, // G3
        ];

        let currentTime = this.audioContext.currentTime;

        const playBass = () => {
            if (!this.isBgmPlaying) return;

            bassNotes.forEach((note, index) => {
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                osc.type = 'triangle';
                osc.frequency.value = note.freq;

                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(0.08, currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.05, currentTime + note.duration * 0.8);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);

                osc.connect(gainNode);
                gainNode.connect(this.bgmGainNode);

                osc.start(currentTime);
                osc.stop(currentTime + note.duration);

                this.bgmOscillators.push(osc);
                currentTime += note.duration;
            });

            const totalDuration = bassNotes.reduce((sum, note) => sum + note.duration, 0);
            setTimeout(() => playBass(), totalDuration * 1000);
        };

        playBass();
    }

    playRhythmLoop() {
        const beatInterval = 0.3; // 200 BPM

        const playBeat = () => {
            if (!this.isBgmPlaying) return;

            // Create a short click/tick sound
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'square';
            osc.frequency.value = 100;

            filter.type = 'highpass';
            filter.frequency.value = 1000;

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.03, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.bgmGainNode);

            osc.start(now);
            osc.stop(now + 0.05);

            setTimeout(() => playBeat(), beatInterval * 1000);
        };

        playBeat();
    }

    stopBackgroundMusic() {
        this.isBgmPlaying = false;
        // Oscillators will stop naturally as they complete
        this.bgmOscillators = [];
    }

    // Toggle BGM on/off
    toggleBackgroundMusic() {
        this.isBgmEnabled = !this.isBgmEnabled;

        if (this.isBgmEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }

        return this.isBgmEnabled;
    }

    // Sound Effects

    // Participant count change sound (soft beep)
    playCountChangeSound() {
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = 800;

        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Apply button click sound (confirmation beep)
    playApplySound() {
        this.init();

        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 600;
        osc2.type = 'sine';
        osc2.frequency.value = 900;

        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        osc1.start(now);
        osc2.start(now + 0.05);
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.2);
    }

    // Start game button sound (exciting ascending tone)
    playStartGameSound() {
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'triangle';

        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // GO button click sound (quick pop)
    playGoSound() {
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1000;

        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Reset button sound (descending tone)
    playResetSound() {
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sawtooth';

        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Win/Success sound (celebration melody)
    playWinSound() {
        this.init();

        const notes = [
            { freq: 523.25, time: 0, duration: 0.15 },    // C5
            { freq: 659.25, time: 0.15, duration: 0.15 }, // E5
            { freq: 783.99, time: 0.3, duration: 0.3 },   // G5
            { freq: 1046.50, time: 0.6, duration: 0.4 },  // C6
        ];

        const now = this.audioContext.currentTime;

        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = note.freq;

            const startTime = now + note.time;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + note.duration * 0.7);
            gainNode.gain.linearRampToValueAtTime(0, startTime + note.duration);

            osc.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            osc.start(startTime);
            osc.stop(startTime + note.duration);
        });

        // Add a sparkle effect
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                osc.type = 'sine';
                osc.frequency.value = 2000 + Math.random() * 1000;

                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                osc.connect(gainNode);
                gainNode.connect(this.sfxGainNode);

                osc.start(now);
                osc.stop(now + 0.1);
            }, i * 100);
        }
    }

    // Lose/Fail sound (consolation tone)
    playLoseSound() {
        this.init();

        const notes = [
            { freq: 392.00, time: 0, duration: 0.3 },    // G4
            { freq: 349.23, time: 0.3, duration: 0.3 },  // F4
            { freq: 293.66, time: 0.6, duration: 0.5 },  // D4
        ];

        const now = this.audioContext.currentTime;

        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = note.freq;

            const startTime = now + note.time;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + note.duration * 0.7);
            gainNode.gain.linearRampToValueAtTime(0, startTime + note.duration);

            osc.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            osc.start(startTime);
            osc.stop(startTime + note.duration);
        });

        // Add a gentle sympathetic tone
        setTimeout(() => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.value = 220;

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

            osc.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            osc.start(now);
            osc.stop(now + 0.8);
        }, 400);
    }

    // Helper method to determine if result is a win
    isWinResult(result) {
        const winKeywords = ['win', 'winner', '당첨', '성공', '승리', '1등', '2등', '3등'];
        const lowerResult = result.toLowerCase();
        return winKeywords.some(keyword => lowerResult.includes(keyword));
    }

    // Play appropriate result sound based on result text
    playResultSound(result) {
        if (this.isWinResult(result)) {
            this.playWinSound();
        } else {
            this.playLoseSound();
        }
    }

    // Ladder movement sound (bouncing/sliding effect)
    playLadderMoveSound(isHorizontal = false) {
        this.init();

        if (isHorizontal) {
            // Horizontal movement - sliding sound
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'sawtooth';

            const now = this.audioContext.currentTime;
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(400, now + 0.08);

            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            osc.start(now);
            osc.stop(now + 0.08);
        } else {
            // Vertical movement - quick bounce sound
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = 800 + Math.random() * 200; // Slight variation

            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            osc.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            osc.start(now);
            osc.stop(now + 0.05);
        }
    }
}

// Create global audio manager instance
const audioManager = new AudioManager();
