/**
 * catEntity.js - Integration between stats, personality, and the 3D model.
 */
class CatEntity {
    constructor(catModel, statsSystem, personalityType = 'tabby') {
        this.model = catModel;
        this.stats = statsSystem;
        this.personality = this.getPersonality(personalityType);
        this.state = 'idle';
    }

    getPersonality(type) {
        const personalities = {
            tabby: {
                name: "Playful",
                playChance: 1.4,
                sleepChance: 0.7,
                discoveryRate: 1.0
            },
            black: {
                name: "Lazy",
                playChance: 0.6,
                sleepChance: 1.5,
                discoveryRate: 0.8
            },
            white: {
                name: "Curious",
                playChance: 1.0,
                sleepChance: 0.9,
                discoveryRate: 1.6
            }
        };
        return personalities[type] || personalities.tabby;
    }

    update(dt, elapsed) {
        // Stats update is handled externally in the main loop to keep it simple
        // Animation update
        this.model.animate(dt, this.state, elapsed);
    }

    setState(newState) {
        this.state = newState;
    }
}

window.CatEntity = CatEntity;
