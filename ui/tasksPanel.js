export class TasksPanel {
    constructor(element, toggleBtn) {
        this.container = element;
        this.toggleBtn = toggleBtn;
        this.isOpen = false;
        this.init();
    }

    init() {
        this.container.classList.add('tasks-panel-modular', 'hidden');
        this.toggleBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggle();
        };
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.container.classList.remove('hidden');
        this.container.classList.add('fade-in');
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
        this.container.classList.remove('fade-in');
    }

    update(tasks) {
        if (!tasks) return;
        this.container.innerHTML = `
            <div class="tasks-header">
                <h3>Daily Tasks</h3>
                <button class="close-tasks-btn" onclick="document.dispatchEvent(new CustomEvent('closeTasks'))">×</button>
            </div>
            <div class="tasks-list">
                ${tasks.map(task => `
                    <div class="task-item-modular ${task.completed ? 'completed' : ''}">
                        <div class="task-top">
                            <span class="task-check">${task.completed ? '✅' : '○'}</span>
                            <span class="task-text">${task.text}</span>
                        </div>
                        <div class="task-progress-box">
                            <div class="task-bar-mini">
                                <div class="task-fill-mini" style="width: ${(task.progress / task.target) * 100}%"></div>
                            </div>
                            <span class="task-count">${task.progress}/${task.target}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="tasks-footer">
                <span class="reward-hint">Complete for 🪙 and XP!</span>
            </div>
        `;

        // Small bridge for close button if not using global listener
        const closeBtn = this.container.querySelector('.close-tasks-btn');
        if (closeBtn) closeBtn.onclick = () => this.close();
    }
}
