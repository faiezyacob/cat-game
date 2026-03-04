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
    black: { name: "Black Cat", color: 0x333333, req: "3-day streak" },
    white: { name: "White Cat", color: 0xffffff, req: "25 total feeds" },
    calico: { name: "Calico", color: 0xffdab9, req: "7-day streak" },
    golden: { name: "Golden Cat", color: 0xffd700, req: "100 total feeds" }
};

let state = {
    nickname: "",
    coins: 100,
    streak: 0,
    lastLogin: Date.now(),
    lastFed: Date.now(),
    hunger: 0,
    totalFeeds: 0,
    lifetimeCoins: 100,
    unlockedCats: ["tabby"],
    currentCat: "tabby",
    toys: ["ball"], // Default toy to start earning
    soundEnabled: true
};

const dom = {
    screens: document.querySelectorAll('.screen'),
    navBtns: document.querySelectorAll('[data-screen]'),
    nicknameInput: document.getElementById('nickname-input'),
    beginBtn: document.getElementById('begin-btn'),
    hungerBar: document.getElementById('hunger-bar'),
    hungerVal: document.getElementById('hunger-val'),
    hungerUI: document.querySelector('.hunger-ui'),
    gameCoins: document.getElementById('game-coins'),
    gameStreak: document.getElementById('game-streak'),
    gameViewport: document.getElementById('game-viewport'),
    feedBtn: document.getElementById('feed-btn'),
    playBtn: document.getElementById('play-btn'),
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
    sfxCoin: document.getElementById('sfx-coin')
};

/**
 * Engine Internals
 */
let world;
let cat;
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

    // Initialize Cat Model
    cat = new CatModel();
    world.scene.add(cat.group);

    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        state = JSON.parse(saved);
        // Migration logic
        if (!state.toys || state.toys.length === 0) state.toys = ["ball"];
        if (state.totalFeeds === undefined) state.totalFeeds = 0;
        if (state.lifetimeCoins === undefined) state.lifetimeCoins = state.coins || 0;

        handleDailyLogin();
        updateCatVariant();
        showScreen('menu');
    } else {
        updateCatVariant();
        showScreen('start');
    }

    // Game Loop
    function loop(time) {
        requestAnimationFrame(loop);
        const dt = (time - lastTime) / 16.6; // Normalised to 60fps
        lastTime = time;

        const h = calculateHunger();
        state.hunger = h;

        updateAI(dt, time);

        let displayState = catState;
        if (state.hunger >= 100 && catState !== 'play') {
            displayState = 'sad';
        }
        cat.animate(dt, displayState, time);

        world.render();

        if (activeScreen === 'game') syncUI();
    }
    requestAnimationFrame(loop);

    // Event Listeners
    dom.beginBtn.addEventListener('click', startNewGame);
    dom.feedBtn.addEventListener('click', feedCat);
    dom.playBtn.addEventListener('click', playCat);
    dom.soundToggle.addEventListener('click', toggleSound);
    dom.shopCatsTab.addEventListener('click', () => { shopTab = 'cats'; renderShop(); });
    dom.shopToysTab.addEventListener('click', () => { shopTab = 'toys'; renderShop(); });
    dom.navBtns.forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));

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

    if (state.hunger >= 100 && catState !== 'play') {
        catState = 'sad';
        cat.setDirection(0); // Face front
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
function syncUI() {
    const h = Math.floor(state.hunger);
    dom.hungerVal.textContent = `${h}%`;
    dom.hungerBar.style.width = `${h}%`;

    // Gradients
    if (h > 80) dom.hungerBar.style.background = 'var(--progress-crit)';
    else if (h > 40) dom.hungerBar.style.background = 'var(--progress-warn)';
    else dom.hungerBar.style.background = 'linear-gradient(90deg, #81c784, #a5d6a7)';

    dom.hungerUI.classList.toggle('shake', h > 85);
    dom.gameCoins.textContent = state.coins;
    dom.gameStreak.textContent = state.streak;
    dom.feedBtn.disabled = (h <= 0 || state.coins < FEED_COST);

    const isPlaying = (catState === 'play');
    dom.playBtn.disabled = (state.toys.length === 0 || isPlaying);
    if (state.toys.length === 0) {
        dom.playBtn.innerHTML = "<span>PLAY (Needs Toy)</span>";
    } else {
        dom.playBtn.innerHTML = isPlaying ? "<span>PLAYING...</span>" : "<span>PLAY TOY (+15 🪙)</span>";
    }
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
    if (state.coins < FEED_COST || state.hunger <= 0) return;

    const bonus = state.toys.includes('feather') ? 1.5 : 1.0;
    const hungerReduction = 40 * bonus;
    const timeReduction = hungerReduction * (HUNGER_24H_MS / 100);

    state.lastFed += timeReduction;
    if (state.lastFed > Date.now()) state.lastFed = Date.now();

    state.coins -= FEED_COST;
    state.totalFeeds++;

    playSound(dom.sfxPop);
    checkUnlocks();
    saveGame();
}

function playCat() {
    if (state.toys.length === 0 || catState === 'play') return;

    catState = 'play';
    moveTimer = performance.now() + 3000; // play for 3 seconds
    cat.setDirection(1); // Face right

    // Play loop economics: Gain coins, but get hungry faster
    state.coins += 15;
    state.lifetimeCoins += 15;
    state.lastFed -= HUNGER_24H_MS * 0.15; // Instantly adds 15% hunger

    playSound(dom.sfxPop);
    saveGame();
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
    if (state.streak >= 3 && !state.unlockedCats.includes('black')) state.unlockedCats.push('black');
    if (state.totalFeeds >= 25 && !state.unlockedCats.includes('white')) state.unlockedCats.push('white');
    if (state.streak >= 7 && !state.unlockedCats.includes('calico')) state.unlockedCats.push('calico');
    if (state.totalFeeds >= 100 && !state.unlockedCats.includes('golden')) state.unlockedCats.push('golden');
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
        const TOYS_DEF = {
            ball: { icon: "🧶", cost: 100, desc: "Play mode" },
            feather: { icon: "🪶", cost: 200, desc: "Better feeding" },
            mouse: { icon: "🐁", cost: 500, desc: "Faster frames" }
        };
        Object.keys(TOYS_DEF).forEach(id => {
            const toy = TOYS_DEF[id];
            const isOwned = state.toys.includes(id);
            const item = document.createElement('div');
            item.className = `shop-item ${isOwned ? 'active' : ''}`;
            item.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${toy.icon}</div>
                <strong>${id.charAt(0).toUpperCase() + id.slice(1)}</strong>
                <span class="unlock-req">${isOwned ? 'Owned' : toy.cost + ' 🪙'}</span>`;
            if (!isOwned) item.onclick = () => {
                if (state.coins >= toy.cost) {
                    state.coins -= toy.cost; state.toys.push(id);
                    saveGame(); renderShop(); playSound(dom.sfxCoin);
                } else alert("Not enough coins!");
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

function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
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
