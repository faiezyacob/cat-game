export class UIManager {
    constructor(game) {
        this.game = game;
        this.statsPanel = null;
        this.tasksPanel = null;
        this.actionButtons = null;
    }

    init(stats, tasks, actions) {
        this.statsPanel = stats;
        this.tasksPanel = tasks;
        this.actionButtons = actions;

        // Global clicks to close panels
        window.addEventListener('click', (e) => {
            if (this.tasksPanel && !e.target.closest('.tasks-container') && !e.target.closest('#tasks-toggle-btn')) {
                this.tasksPanel.close();
            }
        });
    }

    refresh(state, statsSys, catState) {
        if (this.statsPanel) this.statsPanel.update(statsSys);
        if (this.tasksPanel) this.tasksPanel.update(state.dailyTasks);
        if (this.actionButtons) this.actionButtons.update(state, statsSys, catState);
    }
}
