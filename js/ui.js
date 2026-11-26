const UIManager = {
    currentShopTab: 'skins',
    init(gameCallbacks) {
        this.callbacks = gameCallbacks;
        this.bindEvents();
        this.refreshMenu();
    },
    bindEvents() {
        document.getElementById('btn-play').addEventListener('click', () => { AudioEngine.init(); this.callbacks.startGame(); });
        document.getElementById('btn-pause').addEventListener('click', (e) => { e.stopPropagation(); this.callbacks.pauseGame(); });
        document.getElementById('btn-resume').addEventListener('click', () => this.callbacks.resumeGame());
        document.getElementById('btn-restart-pause').addEventListener('click', () => this.callbacks.startGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.callbacks.quitToMenu());
        document.getElementById('btn-replay').addEventListener('click', () => this.callbacks.startGame());
        document.getElementById('btn-home').addEventListener('click', () => this.callbacks.quitToMenu());
        document.getElementById('btn-shop').addEventListener('click', () => { AudioEngine.init(); this.openShop(); });
        document.getElementById('btn-close-shop').addEventListener('click', () => { this.hideModal('shop-screen'); this.refreshMenu(); });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentShopTab = btn.dataset.tab;
                this.renderShopItems();
            });
        });
        document.getElementById('btn-settings').addEventListener('click', () => { AudioEngine.init(); this.updateSettingsButtons(); this.showModal('settings-screen'); });
        document.getElementById('btn-close-settings').addEventListener('click', () => this.hideModal('settings-screen'));
        document.getElementById('toggle-sfx').addEventListener('click', () => { StorageManager.state.settings.sfx = !StorageManager.state.settings.sfx; StorageManager.save(); this.updateSettingsButtons(); });
        document.getElementById('toggle-music').addEventListener('click', () => { StorageManager.state.settings.music = !StorageManager.state.settings.music; StorageManager.save(); this.updateSettingsButtons(); });
        document.getElementById('toggle-vibrate').addEventListener('click', () => { StorageManager.state.settings.vibrate = !StorageManager.state.settings.vibrate; StorageManager.save(); this.updateSettingsButtons(); });
    },
    showScreen(id) {
        ['menu-screen', 'hud'].forEach(s => {
            const el = document.getElementById(s);
            el.classList.toggle('hidden', s !== id);
            el.classList.toggle('active', s === id);
        });
    },
    showModal(id) { const el = document.getElementById(id); el.classList.remove('hidden'); el.classList.add('active'); },
    hideModal(id) { const el = document.getElementById(id); el.classList.add('hidden'); el.classList.remove('active'); },
    hideAllModals() { ['pause-screen', 'gameover-screen', 'shop-screen', 'settings-screen'].forEach(m => this.hideModal(m)); },
    refreshMenu() {
        document.getElementById('menu-best-score').textContent = StorageManager.state.bestScore;
        document.getElementById('menu-stardust').textContent = StorageManager.state.stardust;
        const mission = StorageManager.getCurrentMission();
        const prog = Math.min(StorageManager.state.missionProgress, mission.target);
        document.getElementById('mission-desc').textContent = `${mission.text.replace('{target}', mission.target)} (${prog}/${mission.target}) • +${mission.reward}✦`;
        document.getElementById('mission-progress-fill').style.width = `${(prog / mission.target) * 100}%`;
    },
    updateHUD(score, combo, comboProgress, isSupernova) {
        document.getElementById('score-value').textContent = score;
        document.getElementById('combo-value').textContent = `x${combo}`;
        document.getElementById('combo-bar-fill').style.width = `${Math.min(100, comboProgress * 100)}%`;
        document.getElementById('supernova-banner').classList.toggle('hidden', !isSupernova);
    },
    spawnFloatingText(x, y, text, color = '#ffffff') {
        const container = document.getElementById('floating-text-container');
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.textContent = text;
        el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.color = color;
        container.appendChild(el);
        setTimeout(() => el.remove(), 850);
    },
    showGameOver(score, bestScore, isNewRecord, earnedStardust) {
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-best').textContent = bestScore;
        document.getElementById('earned-stardust').textContent = earnedStardust;
        document.getElementById('new-record-badge').classList.toggle('hidden', !isNewRecord);
        this.showModal('gameover-screen');
    },
    openShop() {
        document.getElementById('shop-stardust').textContent = StorageManager.state.stardust;
        this.renderShopItems();
        this.showModal('shop-screen');
    },
    renderShopItems() {
        const grid = document.getElementById('shop-items-grid');
        grid.innerHTML = '';
        document.getElementById('shop-stardust').textContent = StorageManager.state.stardust;
        const isSkins = this.currentShopTab === 'skins';
        const items = isSkins ? GameData.SKINS : GameData.THEMES;
        const unlocked = isSkins ? StorageManager.state.unlockedSkins : StorageManager.state.unlockedThemes;
        const selected = isSkins ? StorageManager.state.selectedSkin : StorageManager.state.selectedTheme;
        items.forEach(item => {
            const isUnlocked = unlocked.includes(item.id);
            const isSelected = selected === item.id;
            const card = document.createElement('div');
            card.className = `shop-item ${isSelected ? 'selected' : ''}`;
            const previewColor = isSkins ? item.color : item.core;
            card.innerHTML = `<div class="item-preview" style="background:${previewColor}; box-shadow: 0 0 15px ${previewColor};"></div><div class="item-name">${item.name}</div><div class="item-price">${isSelected ? 'SEÇİLİ' : (isUnlocked ? 'KULLAN' : `${item.price} ✦`)}</div>`;
            card.addEventListener('click', () => {
                if (isUnlocked) {
                    if (isSkins) StorageManager.state.selectedSkin = item.id;
                    else StorageManager.state.selectedTheme = item.id;
                    AudioEngine.playCrystal(2);
                } else if (StorageManager.state.stardust >= item.price) {
                    StorageManager.state.stardust -= item.price;
                    unlocked.push(item.id);
                    if (isSkins) StorageManager.state.selectedSkin = item.id;
                    else StorageManager.state.selectedTheme = item.id;
                    AudioEngine.playSupernova();
                } else { AudioEngine.playTone(150, 'sawtooth', 0.15, 0.15); return; }
                StorageManager.save();
                this.renderShopItems();
            });
            grid.appendChild(card);
        });
    },
    updateSettingsButtons() {
        const s = StorageManager.state.settings;
        this.setToggleState('toggle-sfx', s.sfx);
        this.setToggleState('toggle-music', s.music);
        this.setToggleState('toggle-vibrate', s.vibrate);
    },
    setToggleState(id, active) {
        const btn = document.getElementById(id);
        btn.textContent = active ? 'AÇIK' : 'KAPALI';
        btn.classList.toggle('active', active);
    }
};