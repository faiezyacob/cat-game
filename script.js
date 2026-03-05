/**
 * Daily Pixel Cat - 3D Engine Core (Three.js)
 */

const SAVE_KEY = "pixelCatSave";
const HUNGER_24H_MS = 15 * 60 * 1000; // 15 minutes for a full hunger bar
const FEED_COST = 10;
const DAILY_REWARD = 50;
const MS_IN_24_HOURS = 24 * 60 * 60 * 1000;
const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;

// Cat Definitions
const CATS = {
    tabby: { name: "Tabby", color: 0xffa726, req: "Default" },
    black: { name: "Black Cat", color: 0x333333, req: "Level 5" },
    white: { name: "White Cat", color: 0xffffff, req: "Level 10" },
    calico: { name: "Calico", color: 0xffdab9, req: "Level 15" },
    golden: { name: "Golden Cat", color: 0xffd700, req: "Level 25" }
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
    soundEnabled: true
};

// Systems Initialization
let statsSys, inventorySys, catEnt, behaviorCtrl, eventSys;

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
    hungerBar: document.getElementById('hunger-bar'),
    hungerVal: document.getElementById('hunger-val'),
    happBar: document.getElementById('happ-bar'),
    happVal: document.getElementById('happ-val'),
    energyBar: document.getElementById('energy-bar'),
    energyVal: document.getElementById('energy-val'),
    cleanBar: document.getElementById('clean-bar'),
    cleanVal: document.getElementById('clean-val'),
    gameCoins: document.getElementById('game-coins'),
    gameStreak: document.getElementById('game-streak'),
    gameViewport: document.getElementById('game-viewport'),
    feedBtn: document.getElementById('feed-btn'),
    playBtn: document.getElementById('play-btn'),
    roomBtn: document.getElementById('room-btn'), // For Phase 4
    groomBtn: document.getElementById('groom-btn'),
    sleepBtn: document.getElementById('sleep-btn'),
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
    gameLevel: document.getElementById('game-level')
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
    }

    // Initialize Systems (AFTER loading state)
    statsSys = new StatsSystem(state.stats);
    inventorySys = new InventorySystem(state.inventory);
    catEnt = new CatEntity(cat, statsSys, state.currentCat || 'tabby');
    behaviorCtrl = new BehaviorController(catEnt);
    eventSys = new EventSystem((evt) => handleRandomEvent(evt));

    handleDailyLogin();
    updateCatVariant();
    
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
    dom.feedBtn.addEventListener('click', feedCat);
    dom.playBtn.addEventListener('click', playCat);
    dom.groomBtn.addEventListener('click', groomCat);
    dom.sleepBtn.addEventListener('click', sleepCat);
    dom.soundToggle.addEventListener('click', toggleSound);
    dom.shopCatsTab.addEventListener('click', () => { shopTab = 'cats'; renderShop(); });
    dom.shopToysTab.addEventListener('click', () => { shopTab = 'toys'; renderShop(); });
    dom.navBtns.forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));

    // Reset lastTime on tab wake
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') lastTime = performance.now();
    });

    syncUI();
}

/**
 * AI Logic
 */
let catState = 'idle';
let moveTimer = 0;
let targetX = 0;
const BOUNDARY = 2.5;

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

    if (now > moveTimer) {
        // Change behavior
        const rand = Math.random();
        if (rand < 0.6) {
            catState = 'idle';
            moveTimer = now + 1000 + Math.random() * 3000;
        } else {
            catState = 'walk';
            targetX = (Math.random() - 0.5) * BOUNDARY * 2;
            moveTimer = now + 2000 + Math.random() * 2000;
        }
    }

    if (catState === 'walk') {
        const diff = targetX - cat.group.position.x;
        const dir = Math.sign(diff);

        if (Math.abs(diff) > 0.1) {
            cat.group.position.x += dir * 0.05 * dt;
            cat.setDirection(dir);
        } else {
            catState = 'idle';
        }
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
    if (!statsSys) return;
    const s = statsSys.getState();
    const coins = state.coins;
    const streak = state.streak;

    // Smooth Bar Updates
    updateBar(dom.hungerBar, dom.hungerVal, s.hunger);
    updateBar(dom.happBar, dom.happVal, s.happiness);
    updateBar(dom.energyBar, dom.energyVal, s.energy);
    updateBar(dom.cleanBar, dom.cleanVal, s.cleanliness);

    if (dom.gameLevel) dom.gameLevel.textContent = s.level;

    if (coins !== lastUIState.coins) {
        dom.gameCoins.textContent = coins;
        lastUIState.coins = coins;
    }
    if (streak !== lastUIState.streak) {
        dom.gameStreak.textContent = streak;
        lastUIState.streak = streak;
    }

    // Button States
    const isBusy = catState === 'play' || catState === 'chase' || catState === 'eat' || catState === 'lick' || catState === 'sleep';
    
    // Use floor/ceil to sync with displayed values
    const hRounded = Math.floor(s.hunger);
    const eRounded = Math.floor(s.energy);
    const cRounded = Math.floor(s.cleanliness);

    dom.playBtn.disabled = isBusy || hRounded >= 100 || eRounded <= 0;
    dom.feedBtn.disabled = isBusy || hRounded <= 0;
    dom.groomBtn.disabled = isBusy || cRounded >= 100;
    dom.sleepBtn.disabled = isBusy || eRounded >= 100;

    // Update Play Button Text
    const playLabel = dom.playBtn.querySelector('.btn-label');
    if (hRounded >= 100) playLabel.textContent = "TOO HUNGRY";
    else if (eRounded <= 0) playLabel.textContent = "TOO TIRED";
    else if (catState === 'play' || catState === 'chase') playLabel.textContent = "PLAYING...";
    else if (catState === 'eat') playLabel.textContent = "EATING...";
    else playLabel.textContent = "PLAY";
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
    
    cat.setDirection(0);
    moveTimer = performance.now() + 3000;
    playSound(dom.sfxPop);
    saveGame();
}

function playCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.energy) <= 0) { notify("💤 Cat is too tired to play!"); return; }
    if (Math.floor(s.hunger) >= 100) { notify("🍱 Cat is too hungry to play!"); return; }
    
    statsSys.modify('energy', -20);
    statsSys.modify('happiness', 15);
    statsSys.addXP(10);
    
    if (state.currentToy === 'ball') {
        catState = 'chase';
        toy.build('ball');
        toy.group.position.set(-BOUNDARY, 0.2, 0);
        cat.group.position.x = -BOUNDARY - 1.5;
    } else {
        catState = 'play';
        toy.build(state.currentToy);
        toy.group.position.set(0.6, toy.type === 'feather' ? 2 : 0, 0);
    }
    
    world.scene.add(toy.group);
    moveTimer = performance.now() + 3000;
    saveGame();
}

function groomCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.cleanliness) >= 100) { notify("🧼 Cat is already clean!"); return; }
    
    statsSys.modify('cleanliness', 25);
    statsSys.addXP(3);
    catState = 'lick';
    moveTimer = performance.now() + 3000;
    saveGame();
}

function sleepCat() {
    const s = statsSys.getState();
    if (isBusy()) return;
    if (Math.floor(s.energy) >= 100) { notify("⚡ Cat is full of energy!"); return; }
    
    statsSys.modify('energy', 40);
    catState = 'sleep';
    moveTimer = performance.now() + 5000;
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
        const item = ['yarn', 'feather', 'bell'][Math.floor(Math.random()*3)];
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
    notify(`✨ LEVEL UP! You are now Level ${s.level}!`);
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(state)); 
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
    checkUnlocks();
    saveGame();
}

function checkUnlocks() {
    const s = statsSys.getState();
    if (s.level >= 5 && !state.unlockedCats.includes('black')) state.unlockedCats.push('black');
    if (s.level >= 10 && !state.unlockedCats.includes('white')) state.unlockedCats.push('white');
    if (s.level >= 15 && !state.unlockedCats.includes('calico')) state.unlockedCats.push('calico');
    if (s.level >= 25 && !state.unlockedCats.includes('golden')) state.unlockedCats.push('golden');
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
            const item = document.createElement('div');
            item.className = `shop-item ${!isUnlocked ? 'locked' : ''} ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem; filter: grayscale(${isUnlocked ? 0 : 1});">🐱</div>
                <strong>${catDef.name}</strong>
                <span class="unlock-req">${isUnlocked ? 'Unlocked' : catDef.req}</span>`;
            if (isUnlocked) item.onclick = () => {
                state.currentCat = id;
                updateCatVariant();
                saveGame();
                renderShop();
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
    dom.soundToggle.textContent = `Sound: ${state.soundEnabled ? 'ON' : 'OFF'}`;
    saveGame();
}
function playSound(audio) { if (state.soundEnabled && audio) { audio.currentTime = 0; audio.play().catch(() => { }); } }
function showReward() {
    dom.rewardBanner.classList.remove('hidden');
    setTimeout(() => dom.rewardBanner.classList.add('hidden'), 5000);
}

window.addEventListener('DOMContentLoaded', init);
