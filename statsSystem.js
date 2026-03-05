/**
 * statsSystem.js - Handles cat statistics, decay, and leveling.
 */
class StatsSystem {
    constructor(savedState) {
        this.stats = {
            hunger: 50,
            happiness: 50,
            energy: 100,
            cleanliness: 100,
            xp: 0,
            level: 1,
            ...savedState
        };

        // Coefficients for decay per hour (Base rates)
        this.decayRates = {
            hunger: 100 / 0.5,       // 30 mins to reach 100 (idle)
            happiness: -100 / 0.25,  // 15 mins to empty
            energy: -100 / 1.0,      // 60 mins to empty (idle)
            cleanliness: -100 / 0.5  // 30 mins to empty
        };
    }

    update(dt, isActive = false) {
        const hoursPassed = (dt / 1000) / 3600;
        
        // Dynamic multiplier: Hunger increases 3x faster when active/playing
        const hungerMult = isActive ? 3.0 : 1.0;

        // Apply decay
        this.stats.hunger = Math.min(100, this.stats.hunger + (this.decayRates.hunger * hungerMult) * hoursPassed);
        this.stats.happiness = Math.max(0, this.stats.happiness + this.decayRates.happiness * hoursPassed);
        this.stats.energy = Math.max(0, this.stats.energy + this.decayRates.energy * hoursPassed);
        this.stats.cleanliness = Math.max(0, this.stats.cleanliness + this.decayRates.cleanliness * hoursPassed);

        // Calculate Level
        const newLevel = Math.floor(this.stats.xp / 100) + 1;
        if (newLevel > this.stats.level) {
            this.stats.level = newLevel;
            return true; // Level up!
        }
        return false;
    }

    modify(stat, amount) {
        if (this.stats[stat] !== undefined) {
            this.stats[stat] = Math.max(0, Math.min(100, this.stats[stat] + amount));
        }
    }

    addXP(amount) {
        this.stats.xp += amount;
    }

    getState() {
        return this.stats;
    }
}

window.StatsSystem = StatsSystem;
