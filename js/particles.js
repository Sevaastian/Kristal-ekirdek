class ParticleSystem {
    constructor(poolSize = 200) {
        this.pool = []; this.shockwaves = [];
        for (let i = 0; i < poolSize; i++) this.pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, size: 3, color: '#fff', alpha: 1, life: 0, maxLife: 1 });
    }
    spawn(x, y, color, count = 12, speed = 180, size = 4) {
        let spawned = 0;
        for (let i = 0; i < this.pool.length && spawned < count; i++) {
            const p = this.pool[i];
            if (!p.active) {
                const angle = Math.random() * Math.PI * 2;
                const spd = (0.3 + Math.random() * 0.7) * speed;
                p.active = true; p.x = x; p.y = y; p.vx = Math.cos(angle) * spd; p.vy = Math.sin(angle) * spd;
                p.size = size * (0.6 + Math.random() * 0.8); p.color = color; p.alpha = 1; p.life = 0; p.maxLife = 0.35 + Math.random() * 0.35;
                spawned++;
            }
        }
    }
    spawnShockwave(x, y, color, maxRadius = 110) { this.shockwaves.push({ x, y, radius: 10, maxRadius, color, alpha: 0.9, lineWidth: 4 }); }
    update(dt) {
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i]; if (!p.active) continue;
            p.life += dt; if (p.life >= p.maxLife) { p.active = false; continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.alpha = 1 - (p.life / p.maxLife);
        }
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i]; sw.radius += (sw.maxRadius - sw.radius) * 8 * dt; sw.alpha -= 2.2 * dt; sw.lineWidth = Math.max(0.5, sw.lineWidth - 5 * dt);
            if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
        }
    }
    draw(ctx) {
        ctx.save();
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i]; if (!p.active) continue;
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < this.shockwaves.length; i++) {
            const sw = this.shockwaves[i]; ctx.globalAlpha = Math.max(0, sw.alpha); ctx.strokeStyle = sw.color; ctx.lineWidth = sw.lineWidth;
            ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }
    clear() { for (let i = 0; i < this.pool.length; i++) this.pool[i].active = false; this.shockwaves = []; }
}