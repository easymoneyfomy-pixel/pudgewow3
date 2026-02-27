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
        const screenPos = renderer.worldToScreen(this.x, this.y, this.z);
        const alpha = Math.max(0, this.life / this.maxLife);

        renderer.ctx.fillStyle = this.color.replace('rgba', 'rgba').replace(')', `, ${alpha})`); // Assuming rgb or hex string is passed and converted. If hex, we do it simpler:
        // Let's just use globalAlpha
        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
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
            const life = Math.random() * 0.5 + 0.5; // 0.5 to 1.0 seconds
            this.particles.push(new Particle(
                x, y,
                '#cc0000', // Blood Red
                life,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size
            ));
        }
    }

    update(dt) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }

    render(renderer) {
        // Sort by Y for iso drawing
        this.particles.sort((a, b) => a.y - b.y);
        this.particles.forEach(p => p.render(renderer));
    }
}
