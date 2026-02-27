import { State } from '../engine/State.js';

export class Barricade {
    constructor(x, y, team) {
        this.id = 'barricade_' + Math.random().toString(36).substr(2, 9);
        this.type = 'BARRICADE';
        this.x = x;
        this.y = y;
        this.z = 0;
        this.team = team;

        this.radius = 20;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.state = State.IDLE;

        this.lifeTimer = 15; // Lasts 15 seconds
        this.isBarricade = true;
    }

    takeDamage(amount) {
        if (this.state === State.DEAD) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = State.DEAD;
        }
    }

    update(dt, map, entityManager) {
        if (this.state === State.DEAD) return;

        this.lifeTimer -= dt;
        if (this.lifeTimer <= 0) {
            this.state = State.DEAD;
        }
    }

    render(renderer) {
        if (this.state === State.DEAD) return;

        const screenPos = renderer.worldToScreen(this.x, this.y, 0);

        renderer.ctx.save();
        renderer.ctx.translate(screenPos.x, screenPos.y);

        // Base shadow
        renderer.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
        renderer.ctx.fill();

        // Concrete / Metal posts
        renderer.ctx.fillStyle = '#666';
        renderer.ctx.strokeStyle = '#222';
        renderer.ctx.lineWidth = 1;

        renderer.ctx.fillRect(-15, -25, 8, 25);
        renderer.ctx.strokeRect(-15, -25, 8, 25);

        renderer.ctx.fillRect(7, -25, 8, 25);
        renderer.ctx.strokeRect(7, -25, 8, 25);

        // Energy shield between posts
        const energyPulse = Math.sin(Date.now() / 150) * 0.3 + 0.5;
        renderer.ctx.fillStyle = this.team === 'red' ? `rgba(255, 50, 50, ${energyPulse})` : `rgba(50, 50, 255, ${energyPulse})`;
        renderer.ctx.fillRect(-10, -20, 20, 20);

        // HP Bar
        const hpRatio = this.hp / this.maxHp;
        renderer.ctx.fillStyle = '#f00';
        renderer.ctx.fillRect(-15, -30, 30, 4);
        renderer.ctx.fillStyle = '#0f0';
        renderer.ctx.fillRect(-15, -30, 30 * hpRatio, 4);
        renderer.ctx.strokeRect(-15, -30, 30, 4);

        renderer.ctx.restore();
    }
}
