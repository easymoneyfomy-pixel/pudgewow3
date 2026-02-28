import { GAME } from '../shared/GameConstants.js';

export class Particle {
    constructor(x, y, color, life, speedX, speedY, size) {
        this.x = x;
        this.y = y;
        this.z = 10; // start height above ground
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.speedX = speedX;
        this.speedY = speedY;
        this.speedZ = (Math.random() * 50) + 50; // Initial upward burst
        this.size = size;
        this.gravity = -200; // Pulls z down
    }

    update(dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;

        // Parabolic arc for blood
        this.z += this.speedZ * dt;
        this.speedZ += this.gravity * dt;

        if (this.z < 0) this.z = 0; // Hit ground

        this.life -= dt;
    }

    render(renderer) {
        // Top-down: use direct coords, z offsets upward
        const screenX = this.x;
        const screenY = this.y - this.z;
        const alpha = Math.max(0, this.life / this.maxLife);

        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = GAME.MAX_PARTICLES || 500;
    }

    spawnBlood(x, y, amount) {
        if (this.particles.length >= this.maxParticles) return;
        const available = Math.min(amount, this.maxParticles - this.particles.length);
        for (let i = 0; i < available; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100;
            const size = Math.random() * 3 + 2;
            const life = Math.random() * 0.5 + 0.5;
            this.particles.push(new Particle(x, y, '#cc0000', life, Math.cos(angle) * speed, Math.sin(angle) * speed, size));
        }
    }

    spawnExplosion(x, y) {
        if (this.particles.length >= this.maxParticles) return;
        const available = Math.min(35, this.maxParticles - this.particles.length);
        // Fire particles
        for (let i = 0; i < available * 0.6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 200 + 50;
            const life = Math.random() * 0.4 + 0.3;
            const color = ['#ff4400', '#ffaa00', '#ffff00'][Math.floor(Math.random() * 3)];
            this.particles.push(new Particle(x, y, color, life, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 6 + 4));
        }
        // Smoke particles
        for (let i = 0; i < available * 0.4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 80 + 20;
            const life = Math.random() * 1.0 + 0.5;
            this.particles.push(new Particle(x, y, '#555555', life, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 10 + 5));
        }
    }

    spawnClash(x, y) {
        if (this.particles.length >= this.maxParticles) return;
        const available = Math.min(12, this.maxParticles - this.particles.length);
        // Bright sparks for hook vs hook
        for (let i = 0; i < available; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 250 + 100;
            const life = Math.random() * 0.2 + 0.1;
            this.particles.push(new Particle(x, y, '#ffffff', life, Math.cos(angle) * speed, Math.sin(angle) * speed, 2));
        }
    }

    spawnDebris(x, y) {
        if (this.particles.length >= this.maxParticles) return;
        const available = Math.min(10, this.maxParticles - this.particles.length);
        // Brown wood chunks
        for (let i = 0; i < available; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 40;
            const life = Math.random() * 0.8 + 0.4;
            this.particles.push(new Particle(x, y, '#5d4037', life, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 4 + 2));
        }
    }

    spawnRot(x, y, radius) {
        // Toxic green cloud for Rot ability
        if (this.particles.length >= this.maxParticles) return;
        const available = Math.min(8, this.maxParticles - this.particles.length);
        for (let i = 0; i < available; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const speed = Math.random() * 30 + 10;
            const life = Math.random() * 0.3 + 0.2;
            const size = Math.random() * 8 + 4;
            const color = `rgba(0, ${150 + Math.random() * 100}, 0, ${0.3 + Math.random() * 0.3})`;
            this.particles.push(new Particle(px, py, color, life, (Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed, size));
        }
    }

    spawnFleshHeap(x, y) {
        // Visual growth effect for Flesh Heap stacks
        if (this.particles.length >= this.maxParticles) return;
        const available = Math.min(5, this.maxParticles - this.particles.length);
        for (let i = 0; i < available; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 30;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const life = Math.random() * 0.4 + 0.3;
            const size = Math.random() * 4 + 2;
            const color = `rgba(139, 0, 0, ${0.4 + Math.random() * 0.3})`;
            this.particles.push(new Particle(px, py, color, life, 0, 0, size));
        }
    }

    update(dt) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }

    render(renderer) {
        this.particles.forEach(p => p.render(renderer));
    }
}
