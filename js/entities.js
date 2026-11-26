class PlayerSpark {
    constructor() {
        this.angle = -Math.PI / 2;
        this.orbitRadius = 95;
        this.radialVelocity = 0;
        this.angularSpeed = 2.6;
        this.baseRadius = 9;
        this.x = 0; this.y = 0;
        this.trail = [];
        this.maxTrail = 22;
        this.squash = 1;
        this.isSupernova = false;
        this.supernovaTimer = 0;
    }
    reset(minOrbit, maxOrbit) {
        this.angle = -Math.PI / 2;
        this.orbitRadius = (minOrbit + maxOrbit) * 0.45;
        this.radialVelocity = 0;
        this.angularSpeed = 2.65;
        this.trail = [];
        this.squash = 1;
        this.isSupernova = false;
        this.supernovaTimer = 0;
    }
    update(dt, isThrusting, centerX, centerY, difficultyMult) {
        const accel = isThrusting ? 680 : -580;
        this.radialVelocity += accel * dt;
        this.radialVelocity *= Math.pow(0.04, dt);
        this.orbitRadius += this.radialVelocity * dt;
        const radiusFactor = 110 / Math.max(55, this.orbitRadius);
        const speedMult = this.isSupernova ? 1.35 : 1.0;
        this.angle += (this.angularSpeed * (0.75 + radiusFactor * 0.25) * difficultyMult * speedMult) * dt;
        this.x = centerX + Math.cos(this.angle) * this.orbitRadius;
        this.y = centerY + Math.sin(this.angle) * this.orbitRadius;
        const targetSquash = 1 + Math.min(0.35, Math.abs(this.radialVelocity) / 900);
        this.squash += (targetSquash - this.squash) * 15 * dt;
        if (this.isSupernova) {
            this.supernovaTimer -= dt;
            if (this.supernovaTimer <= 0) this.isSupernova = false;
        }
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.pop();
    }
    draw(ctx, skin) {
        const mainColor = this.isSupernova ? '#ffd700' : skin.color;
        const trailColor = this.isSupernova ? '#ff6b00' : skin.trail;
        if (this.trail.length > 1) {
            ctx.save();
            for (let i = 0; i < this.trail.length - 1; i++) {
                const ratio = 1 - i / this.trail.length;
                ctx.strokeStyle = trailColor;
                ctx.globalAlpha = ratio * 0.65;
                ctx.lineWidth = this.baseRadius * 1.6 * ratio;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.scale(1 / Math.sqrt(this.squash), this.squash);
        ctx.shadowBlur = this.isSupernova ? 28 : 18;
        ctx.shadowColor = mainColor;
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.isSupernova ? this.baseRadius * 1.35 : this.baseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.baseRadius * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class CrystalItem {
    constructor(angle, orbitRadius) {
        this.angle = angle; this.orbitRadius = orbitRadius;
        this.radius = 10; this.pulse = Math.random() * Math.PI * 2;
        this.x = 0; this.y = 0;
    }
    update(dt, centerX, centerY) {
        this.pulse += 5 * dt;
        this.x = centerX + Math.cos(this.angle) * this.orbitRadius;
        this.y = centerY + Math.sin(this.angle) * this.orbitRadius;
    }
    draw(ctx) {
        const scale = 1 + Math.sin(this.pulse) * 0.16;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.pulse * 0.5);
        ctx.scale(scale, scale);
        ctx.shadowBlur = 15; ctx.shadowColor = '#ffd700'; ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.2);
        ctx.lineTo(this.radius * 0.9, 0);
        ctx.lineTo(0, this.radius * 1.2);
        ctx.lineTo(-this.radius * 0.9, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class DarkObstacle {
    constructor(angle, orbitRadius, angularVel = 0, radialVel = 0) {
        this.angle = angle; this.orbitRadius = orbitRadius;
        this.angularVel = angularVel; this.radialVel = radialVel;
        this.radius = 11; this.rot = 0; this.nearMissed = false;
        this.x = 0; this.y = 0;
    }
    update(dt, centerX, centerY, minOrbit, maxOrbit) {
        this.angle += this.angularVel * dt;
        this.orbitRadius += this.radialVel * dt;
        this.rot -= 3 * dt;
        if (this.radialVel !== 0 && (this.orbitRadius < minOrbit + 18 || this.orbitRadius > maxOrbit - 18)) {
            this.radialVel *= -1;
        }
        this.x = centerX + Math.cos(this.angle) * this.orbitRadius;
        this.y = centerY + Math.sin(this.angle) * this.orbitRadius;
    }
    draw(ctx, dangerColor) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.shadowBlur = 14; ctx.shadowColor = dangerColor; ctx.fillStyle = dangerColor;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const r = i % 2 === 0 ? this.radius * 1.25 : this.radius * 0.55;
            const a = (i * Math.PI) / 3;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#070913';
        ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}