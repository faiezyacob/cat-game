/**
 * eventSystem.js - Handles random timed events like birds or yarn.
 */
class EventSystem {
    constructor(onEventTrigger) {
        this.nextEventTimer = performance.now() + (30000 + Math.random() * 60000); // 30-90s
        this.onEventTrigger = onEventTrigger;
    }

    update(dt, now) {
        if (now > this.nextEventTimer) {
            this.triggerRandomEvent();
            this.nextEventTimer = now + (30000 + Math.random() * 60000);
        }
    }

    triggerRandomEvent() {
        const events = ['bird', 'yarn', 'demand'];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        this.onEventTrigger(randomEvent);
    }
}

window.EventSystem = EventSystem;
