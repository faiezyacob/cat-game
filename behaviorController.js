/**
 * behaviorController.js - Manages weighted random transitions between behaviors.
 */
class BehaviorController {
    constructor(catEntity) {
        this.cat = catEntity;
        this.nextStateTimer = 0;
        
        // Base probabilities
        this.weights = {
            idle: 40,
            walk: 30,
            lick: 10,
            play: 15,
            sit: 5
        };
    }

    update(dt, now) {
        if (now > this.nextStateTimer) {
            this.selectNextBehavior();
            // Randomly stay in state for 5-10 seconds
            this.nextStateTimer = now + (5000 + Math.random() * 5000);
        }
    }

    selectNextBehavior() {
        // Apply personality modifiers
        const p = this.cat.personality;
        const currentWeights = { ...this.weights };
        
        currentWeights.play *= p.playChance;
        currentWeights.sit *= p.sleepChance; // sit/sleep grouped here for logic

        // Weighted random selection
        const totalWeight = Object.values(currentWeights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (const [state, weight] of Object.entries(currentWeights)) {
            if (random < weight) {
                this.cat.setState(state);
                break;
            }
            random -= weight;
        }
    }
}

window.BehaviorController = BehaviorController;
