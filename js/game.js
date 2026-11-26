const Game = {
    canvas: null, ctx: null, width: 0, height: 0, centerX: 0, centerY: 0,
    minOrbit: 46, maxOrbit: 165, state: 'MENU', lastTime: 0,
    hitStopTimer: 0, shakeTime: 0, shakeIntensity: 0,
    isThrusting: false, graceTimer: 0, score: 0, combo: 1, comboCharge: 0,
    sessionCrystals: 0, corePulse: 0,
    currentLevel: 1, levelCrystals: 0, levelConfig: null, shields: 2, levelElapsed: 0, damageTaken: 0, levelNearMisses: 0,
    player: null, particles: null, crystals: [], obstacles: [], bgStars: [],

    init() {
        StorageManager.init();
        this.canvas = document.getElementById('gameCanvas'); this.ctx = this.canvas.getContext('2d');
        this.player = new PlayerSpark(); this.particles = new ParticleSystem(220);
        this.resize(); window.addEventListener('resize', () => this.resize());
        document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'PLAYING') this.pauseGame(); });
        this.initInput();
        UIManager.init({ startGame: (level) => this.startGame(level), pauseGame: () => this.pauseGame(), resumeGame: () => this.resumeGame(), quitToMenu: () => this.quitToMenu() });
        this.createBgStars(); requestAnimationFrame((t) => this.loop(t));
    },
    resize() {
        const wrapper = document.getElementById('game-wrapper'); const rect = wrapper.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = rect.width; this.height = rect.height; this.canvas.width = this.width * dpr; this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.centerX = this.width / 2; this.centerY = this.height * 0.53;
        this.minOrbit = Math.min(this.width, this.height) * 0.12; this.maxOrbit = Math.min(this.width, this.height) * 0.43;
    },
    createBgStars() {
        this.bgStars = [];
        for (let i = 0; i < 55; i++) this.bgStars.push({ x: Math.random() * 500, y: Math.random() * 900, size: 0.8 + Math.random() * 1.8, alpha: 0.2 + Math.random() * 0.6, speed: 4 + Math.random() * 10 });
    },
    initInput() {
        const startThrust = (e) => {
            if (e && e.cancelable) e.preventDefault(); AudioEngine.init();
            if (this.state === 'PLAYING' && !this.isThrusting) { this.isThrusting = true; this.graceTimer = 0; AudioEngine.playThrust(); }
        };
        const endThrust = () => { this.isThrusting = false; };
        this.canvas.addEventListener('pointerdown', startThrust); this.canvas.addEventListener('touchstart', startThrust, { passive: false });
        window.addEventListener('pointerup', endThrust); window.addEventListener('pointercancel', endThrust); window.addEventListener('touchend', endThrust);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault(); AudioEngine.init();
                if (this.state === 'PLAYING' && !this.isThrusting) { this.isThrusting = true; this.graceTimer = 0; AudioEngine.playThrust(); }
                else if (this.state === 'MENU' || this.state === 'GAMEOVER') this.startGame();
            } else if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.state === 'PLAYING') this.pauseGame(); else if (this.state === 'PAUSED') this.resumeGame();
            }
        });
        window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.isThrusting = false; });
    },
    startGame(level = StorageManager.state.currentLevel) {
        UIManager.hideAllModals(); UIManager.showScreen('hud');
        this.state = 'PLAYING'; this.score = 0; this.combo = 1; this.comboCharge = 0; this.sessionCrystals = 0;
        this.isThrusting = false; this.hitStopTimer = 0; this.shakeTime = 0;
        this.particles.clear(); this.player.reset(this.minOrbit, this.maxOrbit);
        this.setupLevel(level, true);
    },
    setupLevel(levelNum, resetShields = false) {
        this.currentLevel = Math.min(GameData.MAX_LEVEL, levelNum);
        this.levelConfig = StorageManager.getLevelConfig(this.currentLevel);
        this.levelCrystals = 0; this.graceTimer = 0.7; this.levelElapsed = 0; this.damageTaken = 0; this.levelNearMisses = 0;
        if (resetShields) this.shields = 2;
        this.crystals = []; this.obstacles = [];
        this.spawnCrystalRing(Math.min(4, this.levelConfig.targetCrystals));
        this.spawnWaveForLevel();
        const skin = StorageManager.getActiveSkin();
        this.particles.spawnShockwave(this.centerX, this.centerY, skin.color, this.maxOrbit);
        UIManager.updateLevelHUD(this.currentLevel, this.levelCrystals, this.levelConfig.targetCrystals, this.shields);
        if (this.levelConfig.mechanics.includes('survival') && this.levelElapsed >= this.levelConfig.duration) { this.completeLevel(); return; }
        UIManager.updateHUD(this.score, this.combo, this.comboCharge, this.player.isSupernova);
    },
    completeLevel() {
        const cfg = this.levelConfig;
        const completedLvl = this.currentLevel;
        const clean = this.damageTaken === 0;
        const ratio = this.score / Math.max(1, cfg.targetCrystals * 35);
        let stars = 1;
        if (ratio >= 0.75 || (this.levelNearMisses >= 3 && clean)) stars = 2;
        if ((ratio >= 1.15 && clean) || (cfg.isBoss && this.damageTaken === 0 && this.levelNearMisses >= 2)) stars = 3;
        if (cfg.mechanics.includes('survival') && this.levelElapsed >= cfg.duration) stars = Math.max(stars, this.damageTaken === 0 ? 3 : 2);
        const reward = cfg.rewardStardust + stars * 5;
        this.score += completedLvl * 50;
        StorageManager.state.stardust += reward;
        StorageManager.recordLevel(completedLvl, stars, this.score, this.levelElapsed, cfg.isBoss);
        StorageManager.updateMissionProgress('score', this.score);
        AudioEngine.playLevelUp(); StorageManager.vibrate([25, 30, 50]);
        this.triggerShake(0.25, 8);
        this.particles.spawn(this.centerX, this.centerY, '#00ff87', 40, 280, 5);
        this.particles.spawnShockwave(this.centerX, this.centerY, '#00ff87', this.maxOrbit * 1.25);
        this.state = 'LEVEL_COMPLETE'; this.isThrusting = false;
        UIManager.showLevelResult({level:completedLvl,name:cfg.name,stars,score:this.score,crystals:this.levelCrystals,damage:this.damageTaken,time:this.levelElapsed,isBoss:cfg.isBoss,criteria:`${stars===3?'Mükemmel performans!':stars===2?'İyi iş! Bir yıldız daha kazanmak için hasarı azalt veya skorunu yükselt.':'Bölümü tamamladın! Daha fazla yıldız için hasar almadan ve daha yüksek skorla bitirmeyi dene.'} • Kıl payı geçiş: ${this.levelNearMisses}`});
    },
    pauseGame() { if (this.state === 'PLAYING') { this.state = 'PAUSED'; this.isThrusting = false; UIManager.showModal('pause-screen'); } },
    resumeGame() { if (this.state === 'PAUSED') { UIManager.hideModal('pause-screen'); this.state = 'PLAYING'; this.lastTime = performance.now(); } },
    quitToMenu() { this.state = 'MENU'; this.isThrusting = false; UIManager.hideAllModals(); UIManager.refreshMenu(); UIManager.showScreen('menu-screen'); },
    triggerShake(duration, intensity) { this.shakeTime = duration; this.shakeIntensity = intensity; },
    spawnCrystalRing(count = 2) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const orbit = this.minOrbit + 26 + Math.random() * (this.maxOrbit - this.minOrbit - 52);
            this.crystals.push(new CrystalItem(angle, orbit));
        }
    },
    spawnWaveForLevel() {
        const count = this.levelConfig.obstacleCount;
        const baseAngle = this.player.angle + Math.PI * 0.75;
        const bossPhase = this.levelConfig.isBoss ? Math.min(2, Math.floor(this.levelCrystals / Math.max(1, this.levelConfig.targetCrystals / 3))) : 0;
        for (let i = 0; i < count; i++) {
            let angle = baseAngle + (i * (Math.PI * 1.35)) / count + (Math.random() - 0.5) * 0.25;
            let orbit = this.minOrbit + 25 + Math.random() * (this.maxOrbit - this.minOrbit - 50);
            let angVel = this.levelConfig.movingObstacles ? (Math.random() - 0.5) * 0.9 : 0;
            let radVel = this.levelConfig.radialObstacles && Math.random() > 0.5 ? (Math.random() > 0.5 ? 28 : -28) : 0;
            if (this.levelConfig.isBoss) {
                // Boss phases: sweeping orbit, inward/outward pincer, then faster rotating ring.
                angle = baseAngle + i * (Math.PI * 2 / count) + bossPhase * 0.18;
                orbit = bossPhase === 1 ? this.minOrbit + 34 + (i % 2) * (this.maxOrbit - this.minOrbit - 68) : this.minOrbit + 30 + Math.random() * (this.maxOrbit - this.minOrbit - 60);
                angVel = bossPhase === 2 ? (i % 2 ? -1.25 : 1.25) : (i % 2 ? -0.72 : 0.72);
                radVel = bossPhase === 1 ? (i % 2 ? 42 : -42) : 0;
            }
            this.obstacles.push(new DarkObstacle(angle, orbit, angVel, radVel));
        }
    },
    gameOver() {
        this.state = 'GAMEOVER'; this.isThrusting = false;
        const theme = StorageManager.getActiveTheme();
        AudioEngine.playCrash(); StorageManager.vibrate([60, 40, 120]);
        this.triggerShake(0.4, 14);
        this.particles.spawn(this.player.x, this.player.y, theme.danger, 45, 320, 6);
        this.particles.spawnShockwave(this.player.x, this.player.y, theme.danger, 160);
        const isNewRecord = this.score > StorageManager.state.bestScore;
        if (isNewRecord) StorageManager.state.bestScore = this.score;
        const earnedStardust = Math.max(2, Math.floor(this.score / 20) + this.sessionCrystals);
        StorageManager.state.stardust += earnedStardust;
        StorageManager.save();
        setTimeout(() => UIManager.showGameOver(this.score, StorageManager.state.bestScore, isNewRecord, earnedStardust, this.currentLevel), 480);
    },
    update(dt) {
        this.corePulse += dt * 3;
        for (let s of this.bgStars) { s.y += s.speed * dt; if (s.y > this.height) { s.y = 0; s.x = Math.random() * this.width; } }
        if (this.shakeTime > 0) this.shakeTime -= dt;
        this.particles.update(dt);
        if (this.state !== 'PLAYING') {
            if (this.state === 'MENU') this.player.update(dt, Math.sin(this.corePulse * 0.5) > 0, this.centerX, this.centerY, 0.75);
            return;
        }
        if (this.hitStopTimer > 0) { this.hitStopTimer -= dt; return; }
        const difficulty = this.levelConfig.speedMult;
        this.levelElapsed += dt;
        if (this.levelConfig.mechanics.includes('gravity') && Math.floor(this.levelElapsed / 5) % 2 === 1) this.player.radialVelocity += (this.isThrusting ? -1 : 1) * 34 * dt;
        if (this.player.isSupernova) this.comboCharge = Math.max(0, this.player.supernovaTimer / 5.0);
        else this.comboCharge = Math.max(0, this.comboCharge - 0.05 * dt);
        if (this.graceTimer > 0 && !this.isThrusting) {
            this.graceTimer -= dt;
            const safeOrbit = (this.minOrbit + this.maxOrbit) * 0.48;
            this.player.orbitRadius += (safeOrbit - this.player.orbitRadius) * 8 * dt;
            this.player.radialVelocity = 0; this.player.angle += this.player.angularSpeed * difficulty * dt;
            this.player.x = this.centerX + Math.cos(this.player.angle) * this.player.orbitRadius;
            this.player.y = this.centerY + Math.sin(this.player.angle) * this.player.orbitRadius;
            this.player.trail.unshift({ x: this.player.x, y: this.player.y });
            if (this.player.trail.length > this.player.maxTrail) this.player.trail.pop();
        } else {
            this.player.update(dt, this.isThrusting, this.centerX, this.centerY, difficulty);
        }
        if (this.levelConfig.mechanics.includes('narrow')) { this.player.orbitRadius = Math.max(this.minOrbit + 8, Math.min(this.maxOrbit - 28, this.player.orbitRadius)); }
        if (this.player.orbitRadius <= this.minOrbit + 4) {
            this.player.orbitRadius = this.minOrbit + 5; this.player.radialVelocity = Math.abs(this.player.radialVelocity) * 0.65 + 90;
            AudioEngine.playBounce(); this.particles.spawn(this.player.x, this.player.y, '#00f2fe', 8, 120, 3);
        } else if (this.player.orbitRadius >= this.maxOrbit - 4) {
            this.player.orbitRadius = this.maxOrbit - 5; this.player.radialVelocity = -Math.abs(this.player.radialVelocity) * 0.65 - 90;
            AudioEngine.playBounce(); this.particles.spawn(this.player.x, this.player.y, '#f093fb', 8, 120, 3);
        }
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const c = this.crystals[i]; c.update(dt, this.centerX, this.centerY);
            if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < this.player.baseRadius + c.radius + 10) {
                this.crystals.splice(i, 1); this.sessionCrystals++; this.levelCrystals++;
                const pts = 10 * this.combo; this.score += pts;
                this.combo = Math.min(12, this.combo + 1); this.comboCharge = Math.min(1, this.comboCharge + 0.25);
                AudioEngine.playCrystal(this.combo); StorageManager.vibrate(15);
                this.hitStopTimer = 0.02;
                this.particles.spawn(c.x, c.y, '#ffd700', 16, 200, 4); this.particles.spawnShockwave(c.x, c.y, '#ffd700', 65);
                UIManager.spawnFloatingText(c.x, c.y, `+${pts}`, '#ffd700');
                StorageManager.updateMissionProgress('crystals', 1); StorageManager.updateMissionProgress('score', pts);
                UIManager.updateLevelHUD(this.currentLevel, this.levelCrystals, this.levelConfig.targetCrystals, this.shields);
                if (this.levelCrystals >= this.levelConfig.targetCrystals) { this.completeLevel(); return; }
                if (this.comboCharge >= 1 && !this.player.isSupernova) {
                    this.player.isSupernova = true; this.player.supernovaTimer = 5.0;
                    AudioEngine.playSupernova(); StorageManager.vibrate([30, 30, 60]);
                    this.triggerShake(0.25, 8); this.particles.spawnShockwave(this.centerX, this.centerY, '#ffd700', this.maxOrbit * 1.2);
                    StorageManager.updateMissionProgress('supernova', 1);
                }
            }
        }
        const remaining = this.levelConfig.targetCrystals - this.levelCrystals;
        if (this.crystals.length < Math.min(3, remaining)) this.spawnCrystalRing(Math.min(2, remaining - this.crystals.length));
        const theme = StorageManager.getActiveTheme();
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i]; obs.update(dt, this.centerX, this.centerY, this.minOrbit, this.maxOrbit);
            const dist = Math.hypot(this.player.x - obs.x, this.player.y - obs.y);
            if (this.levelConfig.mechanics.includes('laser')) obs.radius = 13 + Math.sin(this.levelElapsed * 4 + i) * 4;
            if (this.levelConfig.mechanics.includes('dark')) obs.alpha = 0.75;
            const hitDist = this.player.baseRadius + obs.radius - 4;
            if (dist < hitDist) {
                if (this.player.isSupernova) {
                    this.obstacles.splice(i, 1); const bonus = 25 * this.combo; this.score += bonus;
                    AudioEngine.playCrystal(8); StorageManager.vibrate(25); this.triggerShake(0.15, 7);
                    this.particles.spawn(obs.x, obs.y, theme.danger, 22, 260, 5);
                    UIManager.spawnFloatingText(obs.x, obs.y, `PARÇALANDI +${bonus}`, '#ff6b00'); continue;
                } else if (this.player.invulnTimer <= 0) {
                    this.obstacles.splice(i, 1); this.shields--; this.damageTaken++; this.combo = 1;
                    UIManager.updateLevelHUD(this.currentLevel, this.levelCrystals, this.levelConfig.targetCrystals, this.shields);
                    if (this.shields > 0) {
                        this.player.invulnTimer = 1.6; AudioEngine.playShieldBreak(); StorageManager.vibrate([40, 30, 40]);
                        this.triggerShake(0.25, 10); this.particles.spawn(obs.x, obs.y, '#00f2fe', 25, 220, 5);
                        UIManager.spawnFloatingText(this.player.x, this.player.y - 20, 'KALKAN KIRILDI!', '#00f2fe');
                    } else { this.gameOver(); return; }
                }
            } else if (!obs.nearMissed && dist < hitDist + 22) {
                obs.nearMissed = true; this.levelNearMisses++; const bonus = 15 * this.combo; this.score += bonus;
                this.comboCharge = Math.min(1, this.comboCharge + 0.15); AudioEngine.playNearMiss(); StorageManager.vibrate(10);
                UIManager.spawnFloatingText(this.player.x, this.player.y - 18, `KIL PAYI +${bonus}`, '#f093fb');
                StorageManager.updateMissionProgress('nearmiss', 1);
            }
        }
        if (this.obstacles.length === 0) this.spawnWaveForLevel();
        if (this.levelConfig.mechanics.includes('survival') && this.levelElapsed >= this.levelConfig.duration) { this.completeLevel(); return; }
        UIManager.updateHUD(this.score, this.combo, this.comboCharge, this.player.isSupernova);
    },
    draw() {
        const ctx = this.ctx; const theme = StorageManager.getActiveTheme(); const skin = StorageManager.getActiveSkin();
        ctx.save();
        if (this.shakeTime > 0) ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
        ctx.fillStyle = this.levelConfig && this.state === 'PLAYING' ? this.levelConfig.background : theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        for (let s of this.bgStars) { ctx.globalAlpha = s.alpha; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.save(); ctx.strokeStyle = theme.core; ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]); ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.arc(this.centerX, this.centerY, this.maxOrbit, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; ctx.lineWidth = 1;
        for (let r = this.minOrbit + 35; r < this.maxOrbit; r += 38) { ctx.beginPath(); ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
        if (this.isThrusting && this.state === 'PLAYING') {
            ctx.save(); ctx.strokeStyle = skin.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.arc(this.centerX, this.centerY, this.player.orbitRadius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const coreR = this.minOrbit + Math.sin(this.corePulse) * 3;
        ctx.save();
        const grad = ctx.createRadialGradient(this.centerX, this.centerY, 4, this.centerX, this.centerY, coreR * 1.4);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.45, theme.core); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(this.centerX, this.centerY, coreR * 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(this.centerX, this.centerY, coreR * 0.65, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        if (this.levelConfig && this.levelConfig.isBoss && this.state === 'PLAYING') { ctx.save(); const phase=Math.min(2,Math.floor(this.levelCrystals/Math.max(1,this.levelConfig.targetCrystals/3))); ctx.strokeStyle=this.levelConfig.accent; ctx.lineWidth=3; ctx.globalAlpha=0.75; ctx.setLineDash([5+phase*3,5]); ctx.beginPath(); ctx.arc(this.centerX,this.centerY,coreR*1.8+Math.sin(this.corePulse*2)*4,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#fff'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center'; ctx.fillText(`ÇEKİRDEK MUHAFIZI • AŞAMA ${phase+1}`,this.centerX,this.centerY+coreR*2.25); ctx.restore(); }
        for (let c of this.crystals) c.draw(ctx);
        for (let obs of this.obstacles) obs.draw(ctx, theme.danger);
        if (this.state !== 'GAMEOVER') this.player.draw(ctx, skin);
        this.particles.draw(ctx);
        if (this.state === 'PLAYING' && this.levelConfig && this.levelConfig.mechanics.includes('dark')) { const v=ctx.createRadialGradient(this.player.x,this.player.y,55,this.player.x,this.player.y,Math.max(this.width,this.height)*0.62); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.88)'); ctx.fillStyle=v; ctx.fillRect(0,0,this.width,this.height); }
        ctx.restore();
    },
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp; this.update(dt); this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }
};
window.addEventListener('DOMContentLoaded', () => Game.init());