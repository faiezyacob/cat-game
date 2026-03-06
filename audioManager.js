export class AudioManager {
    constructor() {
        this.bgm = new Audio('./assets/bgm.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.3; // Low volume for lo-fi

        // Persistent state split
        this.isBGMEnabled = true;
        this.isSFXEnabled = true;
        this.hasInteracted = false;

        this.init();
    }

    init() {
        // Handle browser autoplay policy: wait for first interaction
        const startAudio = () => {
            if (!this.hasInteracted) {
                this.hasInteracted = true;
                if (this.isBGMEnabled) {
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

    setBGMEnabled(enabled) {
        this.isBGMEnabled = enabled;
        if (!this.isBGMEnabled) {
            this.bgm.pause();
        } else if (this.hasInteracted) {
            this.bgm.play().catch(e => console.log("BGM play failed:", e));
        }
    }

    setSFXEnabled(enabled) {
        this.isSFXEnabled = enabled;
    }

    playSFX(id) {
        if (!this.isSFXEnabled) return;
        const sfx = document.getElementById(id);
        if (sfx) {
            sfx.currentTime = 0;
            sfx.play().catch(() => { });
        }
    }
}
