export class StatsPanel {
    constructor(element) {
        this.container = element;
        this.init();
    }

    init() {
        this.container.classList.add('stats-panel-modular', 'persistent');
    }

    update(statsSys) {
        if (!statsSys) return;
        const state = statsSys.getState();
        const stats = {
            hunger: { label: 'Hunger', val: state.hunger, desc: 'Cat gets hungry over time.' },
            happiness: { label: 'Happiness', val: state.happiness, desc: 'Keep the cat happy by playing.' },
            energy: { label: 'Energy', val: state.energy, desc: 'Sleeping restores energy.' },
            cleanliness: { label: 'Clean', val: state.cleanliness, desc: 'Grooming keeps the cat clean.' },
            xp: { label: 'XP', val: statsSys.getCurrentLevelProgress(), desc: 'Progress to next level.' }
        };

        this.container.innerHTML = `
            <div class="stats-header-modular">
                <span class="stats-title">Cat Stats</span>
            </div>
            <div class="stats-list">
                ${Object.entries(stats).map(([id, s]) => `
                    <div class="stat-row" title="${s.desc}">
                        <div class="stat-label-row">
                            <span class="stat-label">${s.label}</span>
                            <span class="stat-value">${Math.floor(s.val)}%</span>
                        </div>
                        <div class="stat-bar-bg">
                            <div class="stat-bar-fill ${id}" style="width: ${s.val}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}
