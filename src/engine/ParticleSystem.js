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
    }

    spawnBlood(x, y, amount) {
        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100;
            const size = Math.random() * 3 + 2;
            const life = Math.random() * 0.5 + 0.5;
            this.particles.push(new Particle(x, y, '#cc0000', life, Math.cos(angle) * speed, Math.sin(angle) * speed, size));
        }
    }

    spawnExplosion(x, y) {
        // Fire particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 200 + 50;
            const life = Math.random() * 0.4 + 0.3;
            const color = ['#ff4400', '#ffaa00', '#ffff00'][Math.floor(Math.random() * 3)];
            this.particles.push(new Particle(x, y, color, life, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 6 + 4));
        }
        // Smoke particles
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 80 + 20;
            const life = Math.random() * 1.0 + 0.5;
            this.particles.push(new Particle(x, y, '#555555', life, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 10 + 5));
        }
    }

    spawnClash(x, y) {
        // Bright sparks for hook vs hook
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 250 + 100;
            const life = Math.random() * 0.2 + 0.1;
            this.particles.push(new Particle(x, y, '#ffffff', life, Math.cos(angle) * speed, Math.sin(angle) * speed, 2));
        }
    }

    spawnDebris(x, y) {
        // Brown wood chunks
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 40;
            const life = Math.random() * 0.8 + 0.4;
            this.particles.push(new Particle(x, y, '#5d4037', life, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 4 + 2));
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
