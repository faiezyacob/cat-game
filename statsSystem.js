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

        // Calculate Level with scaling XP
        // Level 1: 0 - 99 XP
        // Level 2: 100 - 299 XP (+200) - Wait, let's do:
        // Lvl 1: 100 XP to next
        // Lvl 2: 200 XP more (300 total)
        // Lvl 3: 400 XP more (700 total)
        // Let's stick to a simpler: Next goal = currentLevel * 100
        // But the previous code just did xp / 100.

        // Revised Formula: Level based on accumulated XP
        // Level L requires: 100 * L * (L - 1) / 2
        // To find L: L^2 - L - (2 * XP / 100) = 0
        // L = (1 + sqrt(1 + 4 * (2 * XP / 100))) / 2

        const accumulatedXP = this.stats.xp;
        const newLevel = Math.floor((1 + Math.sqrt(1 + 8 * (accumulatedXP / 100))) / 2);

        if (newLevel > this.stats.level) {
            this.stats.level = newLevel;
            return true; // Level up!
        }
        return false;
    }

    getNextLevelXP() {
        const L = this.stats.level;
        return 100 * (L + 1) * L / 2;
    }

    getCurrentLevelProgress() {
        const L = this.stats.level;
        const baseXP = 100 * L * (L - 1) / 2;
        const nextXP = 100 * (L + 1) * L / 2;
        const needed = nextXP - baseXP;
        const earned = this.stats.xp - baseXP;
        return (earned / needed) * 100;
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
