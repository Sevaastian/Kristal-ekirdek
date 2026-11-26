const GameData = {
    MAX_LEVEL: 110,
    GALAXIES: [
      {name:"Kristal Başlangıç",color:"#00f2fe",bg:"#070913"},{name:"Kızıl Nebula",color:"#ff5b68",bg:"#16070d"},
      {name:"Donmuş Yörünge",color:"#8be9ff",bg:"#06131d"},{name:"Elektrik Fırtınası",color:"#ffe066",bg:"#151007"},
      {name:"Karanlık Boyut",color:"#b58cff",bg:"#10091c"},{name:"Kuantum Labirenti",color:"#72ffc8",bg:"#061711"},
      {name:"Zamanın Çatlağı",color:"#ff9ee8",bg:"#190817"},{name:"Çürüyen Yıldızlar",color:"#ff9b55",bg:"#1a0d06"},
      {name:"Sonsuz Boşluk",color:"#a6b2ff",bg:"#080b1c"},{name:"Son Çekirdek",color:"#ffffff",bg:"#090909"}
    ],
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
            unlockedLevel: 1,
            levelProgress: {},
            totalStars: 0,
            bossWins: [],
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
                this.state.levelProgress = parsed.levelProgress || {};
                this.state.unlockedLevel = Math.max(1, parsed.unlockedLevel || parsed.currentLevel || 1);
                this.state.totalStars = parsed.totalStars || 0;
                this.state.bossWins = parsed.bossWins || [];
                this.state.unlockedLevel = Math.min(GameData.MAX_LEVEL, this.state.unlockedLevel);
                this.state.currentLevel = Math.min(GameData.MAX_LEVEL, parsed.currentLevel || this.state.unlockedLevel);
                this.state.totalStars = Object.values(this.state.levelProgress).reduce((sum, r) => sum + (r.stars || 0), 0);
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
        const isBoss = lvl % 11 === 0;
        const galaxyIndex = Math.min(9, Math.floor((lvl - 1) / 11));
        const localLevel = isBoss ? 11 : ((lvl - 1) % 11) + 1;
        const mechanicPool = [
          ['moving'], ['laser'], ['narrow'], ['gravity'], ['fake'],
          ['dark'], ['radial'], ['moving','laser'], ['gravity','radial'], ['survival']
        ];
        const mechanics = isBoss ? ['boss','radial','moving'] : mechanicPool[(localLevel - 1) % mechanicPool.length];
        const galaxy = GameData.GALAXIES[galaxyIndex];
        return {
          level: lvl, galaxyIndex, galaxyName: galaxy.name, accent: galaxy.color, background: galaxy.bg,
          name: isBoss ? `${galaxy.name}: ÇEKİRDEK MUHAFIZI` : this.levelName(localLevel, galaxyIndex),
          isBoss, type: isBoss ? 'boss' : (mechanics[0] === 'survival' ? 'survival' : 'standard'),
          targetCrystals: isBoss ? 8 + galaxyIndex * 2 : Math.min(18, 3 + Math.floor((localLevel - 1) * 0.8) + galaxyIndex),
          obstacleCount: isBoss ? 5 + galaxyIndex : Math.min(8, 1 + localLevel + Math.floor(galaxyIndex / 2)),
          speedMult: 0.72 + galaxyIndex * 0.08 + localLevel * 0.018,
          movingObstacles: mechanics.includes('moving') || isBoss,
          radialObstacles: mechanics.includes('radial') || mechanics.includes('gravity') || isBoss,
          mechanics, duration: mechanics.includes('survival') ? 32 + galaxyIndex * 3 : 0,
          rewardStardust: 10 + lvl * 2, star2: 0.65, star3: 0.9
        };
    },
    levelName(n, galaxy) {
      const names = ['İlk Işık','Hareketli Gölgeler','Dar Yörünge','Lazer Dansı','Son Saniye','Ters Yerçekimi','Sahte Işıklar','Karanlık Kuşak','Çift Yörünge','Fırtına Kapısı'];
      return names[(n - 1) % names.length];
    },
    getLevelRecord(level) { return this.state.levelProgress[level] || { completed:false, stars:0, bestScore:0, bestTime:null }; },
    recordLevel(level, stars, score, time, isBoss) {
      const old = this.getLevelRecord(level);
      const bestStars = Math.max(old.stars || 0, stars);
      this.state.levelProgress[level] = { completed:true, stars:bestStars, bestScore:Math.max(old.bestScore || 0, score), bestTime:old.bestTime == null ? time : Math.min(old.bestTime, time) };
      this.state.unlockedLevel = Math.max(this.state.unlockedLevel || 1, Math.min(GameData.MAX_LEVEL, level + 1));
      this.state.currentLevel = this.state.unlockedLevel;
      this.state.totalStars = Object.values(this.state.levelProgress).reduce((sum, r) => sum + (r.stars || 0), 0);
      if (isBoss && !this.state.bossWins.includes(level)) this.state.bossWins.push(level);
      this.save();
    },
    getLevelCount() { return GameData.MAX_LEVEL; },

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