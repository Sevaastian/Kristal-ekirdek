const Game = {
    canvas: null, ctx: null, width: 0, height: 0, centerX: 0, centerY: 0,
    minOrbit: 46, maxOrbit: 165, state: 'MENU', lastTime: 0,
    hitStopTimer: 0, shakeTime: 0, shakeIntensity: 0,
    isThrusting: false, score: 0, combo: 1, comboCharge: 0,
    sessionCrystals: 0, survivalTimer: 0, corePulse: 0,
    player: null, particles: null, crystals: [], obstacles: [], bgStars: [],

    init() {
        StorageManager.init();
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new PlayerSpark();
        this.particles = new ParticleSystem(200);
        this.resize();
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'PLAYING') this.pauseGame();
        });
        this.initInput();
        UIManager.init({
            startGame: () => this.startGame(),
            pauseGame: () => this.pauseGame(),
            resumeGame: () => this.resumeGame(),
            quitToMenu: () => this.quitToMenu()
        });
        this.createBgStars();
        requestAnimationFrame((t) => this.loop(t));
    },
    resize() {
        const wrapper = document.getElementById('game-wrapper');
        const rect = wrapper.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = rect.width; this.height = rect.height;
        this.canvas.width = this.width * dpr; this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.centerX = this.width / 2; this.centerY = this.height * 0.52;
        this.minOrbit = Math.min(this.width, this.height) * 0.12;
        this.maxOrbit = Math.min(this.width, this.height) * 0.43;
    },
    createBgStars() {
        this.bgStars = [];
        for (let i = 0; i < 55; i++) {
            this.bgStars.push({ x: Math.random() * 500, y: Math.random() * 900, size: 0.8 + Math.random() * 1.8, alpha: 0.2 + Math.random() * 0.6, speed: 4 + Math.random() * 10 });
        }
    },
    initInput() {
        const startThrust = (e) => {
            if (e.target.closest('button')) return;
            AudioEngine.init();
            if (this.state === 'PLAYING' && !this.isThrusting) { this.isThrusting = true; AudioEngine.playThrust(); }
        };
        const endThrust = () => { this.isThrusting = false; };
        const wrapper = document.getElementById('game-wrapper');
        wrapper.addEventListener('pointerdown', startThrust);
        window.addEventListener('pointerup', endThrust);
        window.addEventListener('pointercancel', endThrust);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault(); AudioEngine.init();
                if (this.state === 'PLAYING' && !this.isThrusting) { this.isThrusting = true; AudioEngine.playThrust(); }
                else if (this.state === 'MENU' || this.state === 'GAMEOVER') this.startGame();
            } else if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.state === 'PLAYING') this.pauseGame();
                else if (this.state === 'PAUSED') this.resumeGame();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.isThrusting = false;
        });
    },
    startGame() {
        UIManager.hideAllModals(); UIManager.showScreen('hud');
        this.state = 'PLAYING'; this.score = 0; this.combo = 1; this.comboCharge = 0;
        this.sessionCrystals = 0; this.survivalTimer = 0; this.isThrusting = false;
        this.hitStopTimer = 0; this.shakeTime = 0;
        this.particles.clear(); this.player.reset(this.minOrbit, this.maxOrbit);
        this.crystals = []; this.obstacles = [];
        this.spawnCrystalRing(3); this.spawnWave(1);
        const skin = StorageManager.getActiveSkin();
        this.particles.spawnShockwave(this.centerX, this.centerY, skin.color, this.maxOrbit);
        UIManager.updateHUD(this.score, this.combo, this.comboCharge, false);
    },
    pauseGame() { if (this.state === 'PLAYING') { this.state = 'PAUSED'; this.isThrusting = false; UIManager.showModal('pause-screen'); } },
    resumeGame() { if (this.state === 'PAUSED') { UIManager.hideModal('pause-screen'); this.state = 'PLAYING'; this.lastTime = performance.now(); } },
    quitToMenu() { this.state = 'MENU'; UIManager.hideAllModals(); UIManager.refreshMenu(); UIManager.showScreen('menu-screen'); },
    triggerShake(duration, intensity) { this.shakeTime = duration; this.shakeIntensity = intensity; },
    spawnCrystalRing(count = 2) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const orbit = this.minOrbit + 24 + Math.random() * (this.maxOrbit - this.minOrbit - 48);
            this.crystals.push(new CrystalItem(angle, orbit));
        }
    },
    spawnWave(difficultyLevel) {
        const count = Math.min(6, 2 + Math.floor(difficultyLevel * 0.65));
        const baseAngle = this.player.angle + Math.PI * 0.65;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i * (Math.PI * 1.4)) / count + (Math.random() - 0.5) * 0.3;
            const orbit = this.minOrbit + 22 + Math.random() * (this.maxOrbit - this.minOrbit - 44);
            const angVel = difficultyLevel > 2 ? (Math.random() - 0.5) * 1.1 : 0;
            const radVel = difficultyLevel > 3 && Math.random() > 0.5 ? (Math.random() > 0.5 ? 35 : -35) : 0;
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
        const earnedStardust = Math.max(1, Math.floor(this.score / 15) + this.sessionCrystals);
        StorageManager.state.stardust += earnedStardust;
        StorageManager.save();
        setTimeout(() => UIManager.showGameOver(this.score, StorageManager.state.bestScore, isNewRecord, earnedStardust), 480);
    },
    update(dt) {
        this.corePulse += dt * 3;
        for (let s of this.bgStars) {
            s.y += s.speed * dt;
            if (s.y > this.height) { s.y = 0; s.x = Math.random() * this.width; }
        }
        if (this.shakeTime > 0) this.shakeTime -= dt;
        this.particles.update(dt);
        if (this.state !== 'PLAYING') {
            if (this.state === 'MENU') this.player.update(dt, Math.sin(this.corePulse * 0.5) > 0, this.centerX, this.centerY, 0.8);
            return;
        }
        if (this.hitStopTimer > 0) { this.hitStopTimer -= dt; return; }
        this.survivalTimer += dt;
        const difficulty = 1 + Math.min(1.1, this.survivalTimer / 65);
        if (this.player.isSupernova) this.comboCharge = Math.max(0, this.player.supernovaTimer / 5.0);
        else this.comboCharge = Math.max(0, this.comboCharge - 0.06 * dt);
        this.player.update(dt, this.isThrusting, this.centerX, this.centerY, difficulty);
        if (this.player.orbitRadius <= this.minOrbit || this.player.orbitRadius >= this.maxOrbit) {
            if (this.player.isSupernova) {
                this.player.orbitRadius = Math.max(this.minOrbit + 4, Math.min(this.maxOrbit - 4, this.player.orbitRadius));
                this.player.radialVelocity *= -0.8;
                this.particles.spawn(this.player.x, this.player.y, '#ffd700', 10, 150, 4);
            } else { this.gameOver(); return; }
        }
        if (this.player.orbitRadius < this.minOrbit + 14 && Math.random() < 4 * dt) {
            this.score += 2 * this.combo;
            UIManager.spawnFloatingText(this.player.x, this.player.y - 16, `ÇEKİRDEK +${2 * this.combo}`, '#00f2fe');
        }
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const c = this.crystals[i];
            c.update(dt, this.centerX, this.centerY);
            if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < this.player.baseRadius + c.radius + 8) {
                this.crystals.splice(i, 1); this.sessionCrystals++;
                const pts = 10 * this.combo; this.score += pts;
                this.combo = Math.min(12, this.combo + 1);
                this.comboCharge = Math.min(1, this.comboCharge + 0.25);
                AudioEngine.playCrystal(this.combo); StorageManager.vibrate(15);
                this.hitStopTimer = 0.025;
                this.particles.spawn(c.x, c.y, '#ffd700', 16, 200, 4);
                this.particles.spawnShockwave(c.x, c.y, '#ffd700', 65);
                UIManager.spawnFloatingText(c.x, c.y, `+${pts}`, '#ffd700');
                StorageManager.updateMissionProgress('crystals', 1);
                StorageManager.updateMissionProgress('score', pts);
                if (this.comboCharge >= 1 && !this.player.isSupernova) {
                    this.player.isSupernova = true; this.player.supernovaTimer = 5.0;
                    AudioEngine.playSupernova(); StorageManager.vibrate([30, 30, 60]);
                    this.triggerShake(0.25, 8);
                    this.particles.spawnShockwave(this.centerX, this.centerY, '#ffd700', this.maxOrbit * 1.2);
                    StorageManager.updateMissionProgress('supernova', 1);
                }
            }
        }
        if (this.crystals.length < 2) this.spawnCrystalRing(2);
        const theme = StorageManager.getActiveTheme();
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.update(dt, this.centerX, this.centerY, this.minOrbit, this.maxOrbit);
            const dist = Math.hypot(this.player.x - obs.x, this.player.y - obs.y);
            const hitDist = this.player.baseRadius + obs.radius - 3;
            if (dist < hitDist) {
                if (this.player.isSupernova) {
                    this.obstacles.splice(i, 1);
                    const bonus = 25 * this.combo; this.score += bonus;
                    AudioEngine.playCrystal(8); StorageManager.vibrate(25);
                    this.triggerShake(0.15, 7);
                    this.particles.spawn(obs.x, obs.y, theme.danger, 22, 260, 5);
                    UIManager.spawnFloatingText(obs.x, obs.y, `PARÇALANDI +${bonus}`, '#ff6b00');
                    continue;
                } else { this.gameOver(); return; }
            } else if (!obs.nearMissed && dist < hitDist + 22) {
                obs.nearMissed = true;
                const bonus = 15 * this.combo; this.score += bonus;
                this.comboCharge = Math.min(1, this.comboCharge + 0.15);
                AudioEngine.playNearMiss(); StorageManager.vibrate(10);
                UIManager.spawnFloatingText(this.player.x, this.player.y - 18, `KIL PAYI +${bonus}`, '#f093fb');
                StorageManager.updateMissionProgress('nearmiss', 1);
            }
        }
        if (this.obstacles.length === 0 || (this.obstacles.length < 3 && Math.random() < 0.8 * dt)) {
            this.obstacles = []; this.spawnWave(difficulty);
        }
        UIManager.updateHUD(this.score, this.combo, this.comboCharge, this.player.isSupernova);
    },
    draw() {
        const ctx = this.ctx;
        const theme = StorageManager.getActiveTheme();
        const skin = StorageManager.getActiveSkin();
        ctx.save();
        if (this.shakeTime > 0) ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
        ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        for (let s of this.bgStars) {
            ctx.globalAlpha = s.alpha; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.save(); ctx.strokeStyle = theme.danger; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(this.centerX, this.centerY, this.maxOrbit, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; ctx.lineWidth = 1;
        for (let r = this.minOrbit + 35; r < this.maxOrbit; r += 38) {
            ctx.beginPath(); ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        const coreR = this.minOrbit + Math.sin(this.corePulse) * 3;
        ctx.save();
        const grad = ctx.createRadialGradient(this.centerX, this.centerY, 4, this.centerX, this.centerY, coreR * 1.4);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.45, theme.core); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(this.centerX, this.centerY, coreR * 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(this.centerX, this.centerY, coreR * 0.65, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        for (let c of this.crystals) c.draw(ctx);
        for (let obs of this.obstacles) obs.draw(ctx, theme.danger);
        if (this.state !== 'GAMEOVER') this.player.draw(ctx, skin);
        this.particles.draw(ctx);
        ctx.restore();
    },
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;
        this.update(dt); this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }
};
window.addEventListener('DOMContentLoaded', () => Game.init());