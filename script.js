/**
 * Daily Pixel Cat - 3D Engine Core (Three.js)
 */
import { UIManager } from './ui/uiManager.js';
import { StatsPanel } from './ui/statsPanel.js';
import { TasksPanel } from './ui/tasksPanel.js';
import { ActionButtons } from './ui/actionButtons.js';
import { AudioManager } from './audioManager.js';

const SAVE_KEY = "pixelCatSave";
const HUNGER_24H_MS = 15 * 60 * 1000; // 15 minutes for a full hunger bar
const FEED_COST = 10;
const DAILY_REWARD = 50;
const MS_IN_24_HOURS = 24 * 60 * 60 * 1000;
const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;

// Cat Definitions
const CATS = {
    tabby: { name: "Tabby", color: 0xffa726, levelReq: 1, price: 0 },
    black: { name: "Black Cat", color: 0x333333, levelReq: 5, price: 500 },
    white: { name: "White Cat", color: 0xffffff, levelReq: 10, price: 1500 },
    calico: { name: "Calico", color: 0xffdab9, levelReq: 15, price: 3000 },
    golden: { name: "Golden Cat", color: 0xffd700, levelReq: 25, price: 10000 }
};

let state = JSON.parse(localStorage.getItem(SAVE_KEY)) || {
    nickname: "",
    coins: 100,
    streak: 0,
    lastLogin: Date.now(),
    stats: {
        hunger: 50,
        happiness: 100,
        energy: 100,
        cleanliness: 100,
        xp: 0,
        level: 1
    },
    inventory: {
        feather: 0,
        yarn: 0,
        bell: 0
    },
    totalFeeds: 0,
    lifetimeCoins: 100,
    unlockedCats: ["tabby"],
    currentCat: "tabby",
    toys: ["ball"],
    currentToy: "ball",
    soundEnabled: true,
    lastPlayed: Date.now(),
    dailyTasks: [],
    lastTaskReset: ""
};

// Systems Initialization
let statsSys, inventorySys, catEnt, behaviorCtrl, eventSys, uiMgr, audioMgr;

const TOYS_DEF = {
    ball: { name: "Ball", icon: "🧶", cost: 100, desc: "Play mode" },
    feather: { name: "Feather", icon: "🪶", cost: 200, desc: "Better feeding" },
    mouse: { name: "Mouse", icon: "🐁", cost: 500, desc: "Faster frames" }
};

const dom = {
    screens: document.querySelectorAll('.screen'),
    navBtns: document.querySelectorAll('[data-screen]'),
    nicknameInput: document.getElementById('nickname-input'),
    beginBtn: document.getElementById('begin-btn'),
    gameCoins: document.getElementById('game-coins'),
    gameViewport: document.getElementById('game-viewport'),
    rewardBanner: document.getElementById('reward-banner'),
    shopGrid: document.getElementById('shop-grid'),
    shopCatsTab: document.getElementById('tab-cats'),
    shopToysTab: document.getElementById('tab-toys'),
    statName: document.getElementById('stat-name'),
    statFeeds: document.getElementById('stat-feeds'),
    statStreak: document.getElementById('stat-streak'),
    statLifetime: document.getElementById('stat-lifetime-coins'),
    soundToggle: document.getElementById('menu-sound-toggle'),
    cheatScreen: document.getElementById('cheat-screen'),
    sfxPop: document.getElementById('sfx-pop'),
    sfxCoin: document.getElementById('sfx-coin'),
    sfxEat: document.getElementById('sfx-eat'),
    sfxGroom: document.getElementById('sfx-groom'),
    sfxSleep: document.getElementById('sfx-sleep'),
    sfxLevel: document.getElementById('sfx-level'),
    sfxPlay: document.getElementById('sfx-play'),
    gameLevel: document.getElementById('game-level'),

    // UI Anchors
    statsAnchor: document.getElementById('stats-panel-anchor'),
    tasksAnchor: document.getElementById('tasks-panel-anchor'),
    actionsAnchor: document.getElementById('action-buttons-anchor'),
    tasksToggle: document.getElementById('tasks-toggle-btn')
};

/**
 * Engine Internals
 */
let world;
let cat;
let toy; // New 3D Toy
let activeScreen = 'start';
let lastTime = 0;

/**
 * Initialization
 */
function init() {
    if (typeof THREE === 'undefined') {
        console.error("Three.js library failed to load.");
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = "position:fixed; top:0; left:0; width:100%; padding:20px; background:#f44336; color:white; text-align:center; z-index:9999; font-family:sans-serif;";
        errorMsg.innerHTML = `
            <strong>Error: Three.js library not found.</strong><br>
            Please check your internet connection or use a VPN.<br>
            <button onclick="location.reload(true)" style="margin-top:10px; padding:8px 16px; cursor:pointer;">Retry Hard Refresh</button>
        `;
        document.body.appendChild(errorMsg);
        return;
    }

    // Initialize 3D Scene
    world = new ThreeScene(dom.gameViewport);

    // Initialize Models
    cat = new CatModel();
    world.scene.add(cat.group);
    toy = new ToyModel();

    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        state = JSON.parse(saved);
        // Migration
        if (!state.stats) state.stats = { hunger: 50, happiness: 100, energy: 100, cleanliness: 100, xp: 0, level: 1 };
        if (!state.inventory) state.inventory = { feather: 0, yarn: 0, bell: 0 };
        if (!state.lastPlayed) state.lastPlayed = Date.now();
        if (!state.dailyTasks) state.dailyTasks = [];
        if (!state.lastTaskReset) state.lastTaskReset = "";
    }

    // Initialize Systems (AFTER loading state)
    statsSys = new StatsSystem(state.stats);
    inventorySys = new InventorySystem(state.inventory);
    catEnt = new CatEntity(cat, statsSys, state.currentCat || 'tabby');
    behaviorCtrl = new BehaviorController(catEnt);
    eventSys = new EventSystem((evt) => handleRandomEvent(evt));

    handleDailyLogin();
    handleIdleRewards();
    checkDailyReset();
    updateCatVariant();

    // Initialize Audio
    audioMgr = new AudioManager();
    audioMgr.updateMuteState(!state.soundEnabled);
    uiMgr = new UIManager(world);
    const statsP = new StatsPanel(dom.statsAnchor);
    const tasksP = new TasksPanel(dom.tasksAnchor, dom.tasksToggle);
    const actionB = new ActionButtons(dom.actionsAnchor, {
        feed: () => feedCat(),
        play: () => playCat(),
        groom: () => groomCat(),
        sleep: () => sleepCat()
    });

    uiMgr.init(statsP, tasksP, actionB);

    if (saved) {
        showScreen('menu');
    } else {
        showScreen('start');
    }

    // Game Loop
    function loop(time) {
        if (!lastTime) lastTime = time;
        const deltaMs = time - lastTime;
        lastTime = time;

        // Cap delta to prevent spikes after tab wake
        const cappedDelta = Math.min(deltaMs, 100);
        const dt = cappedDelta / 16.6; // Normalized 60fps unit

        if (activeScreen === 'game') {
            const isActive = catState === 'play' || catState === 'chase';
            const levelUp = statsSys.update(cappedDelta, isActive);
            if (levelUp) showLevelUp();

            behaviorCtrl.update(dt, time);
            eventSys.update(dt, time);
            catEnt.setState(catState); // Sync state for animation
            catEnt.update(dt, time);

            updateAI(dt, time);
            if (toy && toy.group) toy.animate(dt, time);
        } else {
            cat.animate(dt, 'idle', time); // Menu preview
        }

        world.render();
        syncUI();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Event Listeners
    dom.beginBtn.addEventListener('click', startNewGame);
    dom.soundToggle.addEventListener('click', toggleSound);

    const musicBtn = document.getElementById('music-toggle-btn');
    if (musicBtn) {
        musicBtn.addEventListener('click', () => {
            toggleSound();
            // Optional: update icon or visual state here
        });
    }

    dom.shopCatsTab.addEventListener('click', () => { shopTab = 'cats'; renderShop(); });
    dom.shopToysTab.addEventListener('click', () => { shopTab = 'toys'; renderShop(); });
    dom.navBtns.forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));

    // Reset lastTime on tab wake
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            lastTime = performance.now();
            checkDailyReset(); // Check for day change when returning
        }
    });

    // Periodic check for day change (every minute)
    setInterval(checkDailyReset, 60000);

    syncUI();
    window.state = state;
    window.checkDailyReset = checkDailyReset;
}

/**
 * AI Logic
 */
let catState = 'idle';
let moveTimer = 0;
let targetX = 0;

function getBounds() {
    if (world && world.camera) {
        const dist = world.camera.position.z;
        const vFOV = (world.camera.fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFOV / 2) * dist;
        const width = height * world.camera.aspect;
        return Math.max(0.5, (width / 2) - 0.8);
    }
    return 2.5;
}

function updateAI(dt, now) {
    if (activeScreen !== 'game') return;

    if (state.hunger >= 100 && (catState !== 'play' && catState !== 'chase' && catState !== 'eat')) {
        catState = 'sad';
        cat.setDirection(0); // Face front
        return;
    }

    if (catState === 'eat' || catState === 'play' || catState === 'lick' || catState === 'sleep') {
        if (catState === 'play' && toy.type === 'feather') {
            // Feather falls from top
            if (toy.group.position.y > 1.2) {
                toy.group.position.y -= 0.015 * dt;
                // Slight drift
                toy.group.position.x = Math.sin(now * 0.001) * 0.5;
            }
        }

        if (now > moveTimer) {
            catState = 'idle';
            if (toy.group.parent) world.scene.remove(toy.group);
            cat.group.position.set(0, 0, 0); // Ensure reset
            cat.setDirection(0);
        }
        return;
    }
    if (catState === 'chase') {
        const toyPos = toy.group.position;
        const catPos = cat.group.position;
        const MAX_X = 8; // Move off-screen to the right

        // Linear move to the right
        if (toyPos.x < MAX_X) toyPos.x += 0.08 * dt;
        if (catPos.x < MAX_X) catPos.x += 0.11 * dt;

        cat.setDirection(1); // Always face right

        if (now > moveTimer) {
            catState = 'idle';
            if (toy.group.parent) world.scene.remove(toy.group);
            // Instantly reset cat back to center
            cat.group.position.x = 0;
            cat.setDirection(0); // Face user
        }
        return;
    }

    const bounds = getBounds();

    if (now > moveTimer) {
        // Change behavior
        const rand = Math.random();
        if (rand < 0.6) {
            catState = 'idle';
            cat.setDirection(0);
            moveTimer = now + 1000 + Math.random() * 3000;
        } else {
            catState = 'walk';
            targetX = (Math.random() - 0.5) * bounds * 2;
            moveTimer = now + 2000 + Math.random() * 2000;
        }
    }

    if (catState === 'idle') {
        if (cat.group.position.x > bounds) cat.group.position.x = bounds;
        if (cat.group.position.x < -bounds) cat.group.position.x = -bounds;
    } else if (catState === 'walk') {
        const diff = targetX - cat.group.position.x;
        const dir = Math.sign(diff);

        if (Math.abs(diff) > 0.1) {
            cat.group.position.x += dir * 0.05 * dt;
            cat.setDirection(dir);
        } else {
            catState = 'idle';
            cat.setDirection(0);
        }
        if (cat.group.position.x > bounds) cat.group.position.x = bounds;
        if (cat.group.position.x < -bounds) cat.group.position.x = -bounds;
    } else if (catState === 'play') {
        // Smoothly move to center to play
        const diff = 0 - cat.group.position.x;
        if (Math.abs(diff) > 0.1) {
            cat.group.position.x += Math.sign(diff) * 0.05 * dt;
        }
    }
}

function calculateHunger() {
    let elapsed = Date.now() - state.lastFed;
    // Cap elapsed time to prevent hunger going beyond 100% implicitly
    if (elapsed > HUNGER_24H_MS) {
        elapsed = HUNGER_24H_MS;
        state.lastFed = Date.now() - HUNGER_24H_MS; // Sync the underlying timestamp
    }
    return Math.min(100, (elapsed / HUNGER_24H_MS) * 100);
}

/**
 * UI & Bridging
 */
let lastUIState = {
    hunger: -1,
    coins: -1,
    streak: -1,
    toysLength: -1,
    catState: "",
    currentToy: ""
};

function syncUI() {
    if (!statsSys || !uiMgr) return;
    const s = statsSys.getState();

    // Refresh Modular Components
    uiMgr.refresh(state, statsSys, catState);

    // Update Floating Stats
    if (dom.gameLevel) dom.gameLevel.textContent = s.level;
    if (dom.gameCoins) dom.gameCoins.textContent = state.coins;
}

function updateBar(bar, valText, value) {
    const rounded = Math.floor(value);
    bar.style.width = `${rounded}%`;
    valText.textContent = `${rounded}%`;
}


function updateCatVariant() {
    const catDef = CATS[state.currentCat] || CATS.tabby;
    cat.bodyMat.color.setHex(catDef.color);
    // You could add logic here to swap parts for different breeds
}

function showScreen(screenId) {
    activeScreen = screenId;
    dom.screens.forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`${screenId}-screen`);
    if (target) {
        target.classList.remove('hidden');

        // 3D Camera Views
        if (screenId === 'start') {
            world.setCameraView([0.8, 1.5, 2.5], [0.8, 1.2, 0]);
            cat.group.position.set(0, 0, 0);
            cat.setDirection(1);
            catState = 'idle';
        } else if (screenId === 'menu') {
            world.setCameraView([2.5, 2, 4], [0, 1, 0]);
            cat.group.position.set(0, 0, 0);
            cat.setDirection(1);
            catState = 'idle';
        } else if (screenId === 'game') {
            world.setCameraView([0, 1.5, 6], [0, 1.5, 0]); // Pure Sideview
        }

        if (screenId === 'shop') renderShop();
        if (screenId === 'stats') renderStats();
    }
}

function feedCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.hunger) <= 0) { notify("🍱 Cat is already full!"); return; }
    if (state.coins < FEED_COST) { notify("🪙 Not enough coins!"); return; }

    state.coins -= FEED_COST;
    state.totalFeeds++;
    statsSys.modify('hunger', -30);
    statsSys.modify('happiness', 5);
    statsSys.addXP(5);

    catState = 'eat';
    toy.build('food');
    toy.group.position.set(0.6, 0.1, 0.2);
    world.scene.add(toy.group);
    updateTaskProgress('feed');

    cat.setDirection(0);
    moveTimer = lastTime + 3000;
    playSound(dom.sfxEat);
    saveGame();
}

function playCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.energy) <= 0) { notify("💤 Cat is too tired to play!"); return; }
    if (Math.floor(s.hunger) >= 100) { notify("🍱 Cat is too hungry to play!"); return; }

    statsSys.modify('energy', -20);
    statsSys.modify('happiness', 15);
    statsSys.addXP(15); // Increased XP reward

    // Coin reward for playing
    const coinReward = 5 + Math.floor(Math.random() * 6); // 5-10 coins
    state.coins += coinReward;
    state.lifetimeCoins += coinReward;

    if (state.currentToy === 'ball') {
        catState = 'chase';
        toy.build('ball');
        const bounds = getBounds();
        toy.group.position.set(-bounds, 0.2, 0);
        cat.group.position.x = -bounds - 1.5;
    } else {
        catState = 'play';
        toy.build(state.currentToy);
        toy.group.position.set(0.6, toy.type === 'feather' ? 2 : 0, 0);
    }

    world.scene.add(toy.group);
    moveTimer = lastTime + 3000;
    updateTaskProgress('play');
    playSound(dom.sfxPlay);
    saveGame();
}

function groomCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.cleanliness) >= 100) { notify("🧼 Cat is already clean!"); return; }

    statsSys.modify('cleanliness', 25);
    statsSys.addXP(3);
    catState = 'lick';
    moveTimer = lastTime + 3000;
    updateTaskProgress('groom');
    playSound(dom.sfxGroom);
    saveGame();
}

function sleepCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.energy) >= 100) { notify("⚡ Cat is full of energy!"); return; }

    statsSys.modify('energy', 40);
    catState = 'sleep';
    moveTimer = lastTime + 5000;
    updateTaskProgress('sleep');
    playSound(dom.sfxSleep);
    saveGame();
}

function isBusy() {
    return catState === 'play' || catState === 'chase' || catState === 'eat' || catState === 'lick' || catState === 'sleep';
}

function handleRandomEvent(type) {
    console.log("Event:", type);
    if (activeScreen !== 'game') return;

    if (type === 'bird') {
        notify("🐦 A bird appeared! Click it to chase!", () => {
            statsSys.modify('happiness', 10);
            state.coins += 20;
            saveGame();
            notify("🐦 Cat chased the bird! +20 🪙");
        });
    } else if (type === 'yarn') {
        const item = ['yarn', 'feather', 'bell'][Math.floor(Math.random() * 3)];
        notify(`🧶 Item found: ${item.toUpperCase()}!`, () => {
            inventorySys.addItem(item);
            statsSys.modify('happiness', 5);
            saveGame();
        });
    } else if (type === 'demand') {
        notify("🗯️ Cat wants attention!", () => {
            statsSys.modify('happiness', 15);
            statsSys.addXP(10);
            saveGame();
            notify("❤️ Happiness Boost!");
        }, 5000, () => {
            statsSys.modify('happiness', -10);
            notify("😿 Cat felt ignored...");
        });
    }
}

function showLevelUp() {
    const s = statsSys.getState();
    const reward = 100 + (s.level * 20); // Base 100 + scaling
    state.coins += reward;
    state.lifetimeCoins += reward;
    notify(`✨ LEVEL UP! Level ${s.level}! +${reward} 🪙`);
    playSound(dom.sfxLevel);
    saveGame();
}

function notify(text, onClick, duration = 4000, onExpire) {
    const toast = document.createElement('div');
    toast.className = 'pixel-toast';
    toast.textContent = text;
    document.body.appendChild(toast);

    let timer = setTimeout(() => {
        toast.remove();
        if (onExpire) onExpire();
    }, duration);

    toast.onclick = () => {
        clearTimeout(timer);
        toast.remove();
        if (onClick) onClick();
    };
}

function saveGame() {
    if (statsSys) state.stats = statsSys.getState();
    if (inventorySys) state.inventory = inventorySys.getInventory();
    state.lastPlayed = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function handleIdleRewards() {
    if (!state.lastPlayed) {
        state.lastPlayed = Date.now();
        return;
    }

    const now = Date.now();
    const diff = now - state.lastPlayed;

    // Minimum 10 minutes required for first coin (600,000 ms)
    if (diff < 600000) return;

    // Cap at 12 hours (43,200,000 ms)
    const cappedDiff = Math.min(diff, 12 * 60 * 60 * 1000);
    const coinsEarned = Math.floor(cappedDiff / (10 * 60 * 1000));

    if (coinsEarned > 0) {
        setTimeout(() => showIdlePopup(coinsEarned), 1000); // Small delay for effect
    }
}

function showIdlePopup(amount) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay idle-reward-overlay';
    overlay.innerHTML = `
        <div class="overlay-box reward-modal bounce-anim">
            <div style="font-size: 3rem; margin-bottom: 1rem;">😴</div>
            <h2>While you were away...</h2>
            <p>Your cat was busy playing and earned you:</p>
            <div class="reward-amount">
                <span style="font-size: 2.5rem; font-weight: 700; color: #ffd700;">${amount}</span>
                <span style="font-size: 1.5rem;">🪙</span>
            </div>
            <button id="collect-idle-btn" class="pixel-btn primary" style="margin-top: 1.5rem;">Collect Coins</button>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('collect-idle-btn').onclick = () => {
        state.coins += amount;
        state.lifetimeCoins += amount;
        playSound(dom.sfxCoin);
        syncUI();
        saveGame();
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        setTimeout(() => overlay.remove(), 300);
    };
}



/**
 * Persistence & Systems
 */
function handleDailyLogin() {
    const now = Date.now();
    if (now < state.lastLogin) { dom.cheatScreen.classList.remove('hidden'); return; }
    const elapsed = now - state.lastLogin;
    if (elapsed >= MS_IN_24_HOURS && elapsed < MS_IN_48_HOURS) {
        state.streak++; state.coins += DAILY_REWARD; state.lifetimeCoins += DAILY_REWARD;
        showReward();
    } else if (elapsed >= MS_IN_48_HOURS) { state.streak = 1; }
    state.lastLogin = now;
    if (state.streak === 0) state.streak = 1;
    saveGame();
}

// Unlocks are now handled via shop purchase
function checkUnlocks() {
    return;
}

let shopTab = 'cats';

function renderShop() {
    dom.shopCatsTab.classList.toggle('active', shopTab === 'cats');
    dom.shopToysTab.classList.toggle('active', shopTab === 'toys');
    dom.shopGrid.innerHTML = '';

    if (shopTab === 'cats') {
        Object.keys(CATS).forEach(id => {
            const catDef = CATS[id];
            const isUnlocked = state.unlockedCats.includes(id);
            const isActive = state.currentCat === id;
            const levelMet = statsSys.getState().level >= catDef.levelReq;
            const canAfford = state.coins >= catDef.price;

            const item = document.createElement('div');
            item.className = `shop-item ${!isUnlocked ? 'locked' : ''} ${isActive ? 'active' : ''}`;

            let statusHTML = '';
            if (isUnlocked) {
                statusHTML = `<span class="unlock-req">Owned</span>`;
            } else {
                statusHTML = `
                    <span class="unlock-req" style="color: ${levelMet ? '#4caf50' : '#f44336'}">Req: Lvl ${catDef.levelReq}</span>
                    <span class="unlock-req" style="color: ${canAfford ? '#ffd700' : '#f44336'}">${catDef.price} 🪙</span>
                `;
            }

            item.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem; filter: grayscale(${isUnlocked ? 0 : 0.7});">🐱</div>
                <strong>${catDef.name}</strong>
                ${statusHTML}`;

            item.onclick = () => {
                if (isActive) return;

                if (isUnlocked) {
                    state.currentCat = id;
                    updateCatVariant();
                    playSound(dom.sfxPop);
                    saveGame();
                    renderShop();
                } else if (levelMet && canAfford) {
                    state.coins -= catDef.price;
                    state.unlockedCats.push(id);
                    state.currentCat = id;
                    updateCatVariant();
                    playSound(dom.sfxCoin);
                    saveGame();
                    renderShop();
                    notify(`🎉 New Cat Unlocked: ${catDef.name}!`);
                } else if (!levelMet) {
                    notify(`🔒 Need Level ${catDef.levelReq}!`);
                } else {
                    notify(`🪙 Need ${catDef.price} coins!`);
                }
            };
            dom.shopGrid.appendChild(item);
        });
    } else {
        Object.keys(TOYS_DEF).forEach(id => {
            const toy = TOYS_DEF[id];
            const isOwned = state.toys.includes(id);
            const isEquipped = state.currentToy === id;

            const item = document.createElement('div');
            item.className = `shop-item ${isOwned ? 'active' : ''} ${isEquipped ? 'equipped' : ''}`;

            let statusText = toy.cost + ' 🪙';
            if (isEquipped) statusText = 'Equipped';
            else if (isOwned) statusText = 'Owned (Click to Equip)';

            item.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${toy.icon}</div>
                <strong>${toy.name}</strong>
                <span class="unlock-req">${statusText}</span>`;

            item.onclick = () => {
                if (isEquipped) return;

                if (isOwned) {
                    state.currentToy = id;
                    playSound(dom.sfxPop);
                    saveGame();
                    renderShop();
                } else if (state.coins >= toy.cost) {
                    state.coins -= toy.cost;
                    state.toys.push(id);
                    state.currentToy = id; // Auto equip new toy
                    saveGame();
                    renderShop();
                    playSound(dom.sfxCoin);
                } else {
                    alert("Not enough coins!");
                }
            };
            dom.shopGrid.appendChild(item);
        });
    }
}

function renderStats() {
    dom.statName.textContent = state.nickname;
    dom.statFeeds.textContent = state.totalFeeds;
    dom.statStreak.textContent = state.streak;
    dom.statLifetime.textContent = state.lifetimeCoins;
}

function startNewGame() {
    const name = dom.nicknameInput.value.trim();
    if (!name) return;
    state.nickname = name;
    state.lastLogin = Date.now();
    state.lastFed = Date.now();
    saveGame();
    showScreen('menu');
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    if (audioMgr) audioMgr.updateMuteState(!state.soundEnabled);

    // Update menu button text
    if (dom.soundToggle) dom.soundToggle.textContent = `Sound: ${state.soundEnabled ? 'ON' : 'OFF'}`;

    saveGame();
}

function playSound(audioId) {
    if (audioMgr) {
        // audioId can be the element or just the ID string
        const id = typeof audioId === 'string' ? audioId : (audioId?.id);
        if (id) audioMgr.playSFX(id);
    }
}
function showReward() {
    dom.rewardBanner.classList.remove('hidden');
    setTimeout(() => dom.rewardBanner.classList.add('hidden'), 5000);
}

/**
 * Daily Task System
 */
const TASK_POOL = [
    { id: 'feed', text: 'Feed cat', target: 3, rewardCoins: 50, rewardXP: 20 },
    { id: 'play', text: 'Play with cat', target: 2, rewardCoins: 40, rewardXP: 15 },
    { id: 'groom', text: 'Groom cat', target: 1, rewardCoins: 30, rewardXP: 10 },
    { id: 'sleep', text: 'Make cat sleep', target: 1, rewardCoins: 20, rewardXP: 5 },
    { id: 'feed_special', text: 'Delicious Meals', target: 5, rewardCoins: 100, rewardXP: 40 }
];

function checkDailyReset() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const lastResetStr = state.lastTaskReset;

    if (todayStr !== lastResetStr) {
        console.log("Day change detected! Resetting daily tasks...");
        generateDailyTasks();
        state.lastTaskReset = todayStr;
        saveGame();
    }
    syncUI();
}

function generateDailyTasks() {
    // Pick 3 random tasks
    const shuffled = [...TASK_POOL].sort(() => 0.5 - Math.random());
    state.dailyTasks = shuffled.slice(0, 3).map(t => ({
        ...t,
        progress: 0,
        completed: false
    }));
    saveGame();
}


function updateTaskProgress(actionId) {
    let changed = false;
    state.dailyTasks.forEach(task => {
        if (task.id.includes(actionId) && !task.completed) {
            task.progress++;
            changed = true;
            if (task.progress >= task.target) {
                completeTask(task);
            }
        }
    });

    if (changed) {
        syncUI();
        saveGame();
    }
}

function completeTask(task) {
    task.completed = true;
    state.coins += task.rewardCoins;
    state.lifetimeCoins += task.rewardCoins;
    statsSys.addXP(task.rewardXP);

    notify(`✅ Task Complete: ${task.text}! +${task.rewardCoins} 🪙`);
    playSound(dom.sfxCoin);
    syncUI(); // Update coins/level display
}

window.addEventListener('DOMContentLoaded', init);
