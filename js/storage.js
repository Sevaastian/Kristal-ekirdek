const GameData = {
    MAX_LEVEL: 200,
    SKINS: [
        { id: 'sapphire', name: 'Safir Kıvılcım', color: '#00f2fe', trail: '#4facfe', price: 0 },
        { id: 'solar', name: 'Güneş Patlaması', color: '#ffd700', trail: '#ff6b00', price: 50 },
        { id: 'emerald', name: 'Zümrüt Hayalet', color: '#00ff87', trail: '#60efff', price: 120 },
        { id: 'nebula', name: 'Kuantum Prizma', color: '#f093fb', trail: '#f5576c', price: 250 }
    ],
    THEMES: [
        { id: 'deep_space', name: 'Derin Uzay', bg: '#070913', core: '#00f2fe', danger: '#ff0844', price: 0 },
        { id: 'cyber_violet', name: 'Siber Nebula', bg: '#0e071a', core: '#b721ff', danger: '#ff2a6d', price: 80 },
        { id: 'golden_sun', name: 'Altın Güneş', bg: '#140c05', core: '#ffb703', danger: '#fb5607', price: 180 },
        { id: 'crimson_void', name: 'Kızıl Boşluk', bg: '#140508', core: '#ff4d6d', danger: '#c9184a', price: 300 }
    ],
    MISSIONS: [
        { id: 'collect_crystals', text: '{target} Kristal Topla', target: 8, reward: 25, type: 'crystals' },
        { id: 'near_miss', text: '{target} Kıl Payı Geçiş Yap', target: 4, reward: 35, type: 'nearmiss' },
        { id: 'trigger_supernova', text: 'Süpernova Moduna Gir', target: 1, reward: 40, type: 'supernova' },
        { id: 'reach_score', text: '{target} Skora Ulaş', target: 300, reward: 30, type: 'score' }
    ]
};

const StorageManager = {
    KEY: 'kristal_cekirdek_save_v2',
    state: null,

    init() {
        const defaultState = {
            currentLevel: 1,
            bestScore: 0,
            stardust: 0,
            unlockedSkins: ['sapphire'],
            selectedSkin: 'sapphire',
            unlockedThemes: ['deep_space'],
            selectedTheme: 'deep_space',
            missionIndex: 0,
            missionProgress: 0,
            settings: { sfx: true, music: true, vibrate: true }
        };

        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.state = Object.assign({}, defaultState, parsed);
                this.state.settings = Object.assign({}, defaultState.settings, parsed.settings || {});
            } else {
                this.state = defaultState;
            }
        } catch (e) {
            this.state = defaultState;
        }
        this.save();
    },

    save() {
        try { localStorage.setItem(this.KEY, JSON.stringify(this.state)); } catch (e) {}
    },

    getLevelConfig(level) {
        const lvl = Math.max(1, Math.min(GameData.MAX_LEVEL, level));
        return {
            level: lvl,
            targetCrystals: Math.min(25, 3 + Math.floor((lvl - 1) * 0.45)),
            obstacleCount: Math.min(9, 1 + Math.floor(lvl / 4)),
            speedMult: 0.72 + Math.min(1.1, (lvl - 1) * 0.008),
            movingObstacles: lvl >= 4,
            radialObstacles: lvl >= 10,
            rewardStardust: 10 + Math.floor(lvl * 1.5)
        };
    },

    getActiveSkin() { return GameData.SKINS.find(s => s.id === this.state.selectedSkin) || GameData.SKINS[0]; },
    getActiveTheme() { return GameData.THEMES.find(t => t.id === this.state.selectedTheme) || GameData.THEMES[0]; },

    getCurrentMission() {
        const idx = this.state.missionIndex % GameData.MISSIONS.length;
        const base = GameData.MISSIONS[idx];
        const scale = Math.floor(this.state.missionIndex / GameData.MISSIONS.length) + 1;
        return { ...base, target: base.target * scale, reward: base.reward * scale };
    },

    updateMissionProgress(type, amount = 1) {
        const mission = this.getCurrentMission();
        if (mission.type !== type) return false;
        this.state.missionProgress += amount;
        if (this.state.missionProgress >= mission.target) {
            this.state.stardust += mission.reward;
            this.state.missionIndex++;
            this.state.missionProgress = 0;
            this.save();
            return mission.reward;
        }
        this.save();
        return false;
    },

    vibrate(pattern) {
        if (this.state.settings.vibrate && navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    }
};