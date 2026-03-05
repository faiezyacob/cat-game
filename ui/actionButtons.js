export class ActionButtons {
    constructor(container, handlers) {
        this.container = container;
        this.handlers = handlers; // { feed, play, groom, sleep }
        this.init();
    }

    init() {
        this.container.classList.add('action-grid-modular');
        this.render();
    }

    render() {
        const buttons = [
            { id: 'feed', label: 'Feed', icon: '🍲' },
            { id: 'play', label: 'Play', icon: '🎾' },
            { id: 'groom', label: 'Groom', icon: '🧼' },
            { id: 'sleep', label: 'Sleep', icon: '🌙' }
        ];

        this.container.innerHTML = buttons.map(btn => `
            <button class="action-btn-modular" id="${btn.id}-btn-modular">
                <span class="action-icon">${btn.icon}</span>
                <span class="action-label">${btn.label}</span>
            </button>
        `).join('');

        buttons.forEach(btn => {
            const el = document.getElementById(`${btn.id}-btn-modular`);
            if (el && this.handlers[btn.id]) {
                el.onclick = () => this.handlers[btn.id]();
            }
        });
    }

    update(state, statsSys, catState) {
        if (!statsSys) return;
        const s = statsSys.getState();
        const isBusy = catState === 'play' || catState === 'chase' || catState === 'eat' || catState === 'lick' || catState === 'sleep';

        const hRounded = Math.floor(s.hunger);
        const eRounded = Math.floor(s.energy);
        const cRounded = Math.floor(s.cleanliness);

        const config = {
            feed: { disabled: isBusy || hRounded <= 0, label: hRounded <= 0 ? 'Full' : 'Feed' },
            play: {
                disabled: isBusy || hRounded >= 100 || eRounded <= 0,
                label: hRounded >= 100 ? 'Hungry' : (eRounded <= 0 ? 'Tired' : 'Play')
            },
            groom: { disabled: isBusy || cRounded >= 100, label: 'Groom' },
            sleep: { disabled: isBusy || eRounded >= 100, label: 'Sleep' }
        };

        // Override labels if busy with specific action
        if (catState === 'eat') config.feed.label = "Eating...";
        if (catState === 'sleep') config.sleep.label = "Sleeping...";
        if (catState === 'play' || catState === 'chase') config.play.label = "Playing...";

        Object.entries(config).forEach(([id, cfg]) => {
            const btn = document.getElementById(`${id}-btn-modular`);
            if (btn) {
                btn.disabled = cfg.disabled;
                const label = btn.querySelector('.action-label');
                if (label) label.textContent = cfg.label;
            }
        });
    }
}
