export class AudioManager {
    constructor() {
        this.bgm = new Audio('./assets/bgm.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.3; // Low volume for lo-fi

        // Persistent state
        this.isMuted = JSON.parse(localStorage.getItem('pixelCatMuted')) || false;
        this.hasInteracted = false;

        this.init();
    }

    init() {
        // Handle browser autoplay policy: wait for first interaction
        const startAudio = () => {
            if (!this.hasInteracted) {
                this.hasInteracted = true;
                if (!this.isMuted) {
                    this.bgm.play()
                        .then(() => console.log("BGM started successfully"))
                        .catch(e => {
                            if (e.name === 'NotSupportedError') {
                                console.error("BGM Error: The audio file is corrupt or not supported.", e);
                            } else {
                                console.log("BGM autoplay blocked or failed:", e);
                            }
                        });
                }
                document.removeEventListener('click', startAudio);
                document.removeEventListener('keydown', startAudio);
            }
        };

        document.addEventListener('click', startAudio);
        document.addEventListener('keydown', startAudio);
    }

    updateMuteState(muted) {
        this.isMuted = muted;
        localStorage.setItem('pixelCatMuted', JSON.stringify(this.isMuted));

        if (this.isMuted) {
            this.bgm.pause();
        } else if (this.hasInteracted) {
            this.bgm.play().catch(e => console.log("BGM play failed:", e));
        }
    }

    toggleMute() {
        this.updateMuteState(!this.isMuted);
        return this.isMuted;
    }

    playSFX(id) {
        if (this.isMuted) return;
        const sfx = document.getElementById(id);
        if (sfx) {
            sfx.currentTime = 0;
            sfx.play().catch(() => { });
        }
    }
}
