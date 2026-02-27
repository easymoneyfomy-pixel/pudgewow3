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

        this.lifeTimer = 15;
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

        const ctx = renderer.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-12, -12, 24, 24);

        // Posts
        ctx.fillStyle = '#666';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.fillRect(-10, -10, 6, 20);
        ctx.strokeRect(-10, -10, 6, 20);
        ctx.fillRect(4, -10, 6, 20);
        ctx.strokeRect(4, -10, 6, 20);

        // Energy shield
        const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.5;
        ctx.fillStyle = this.team === 'red' ? `rgba(255, 50, 50, ${pulse})` : `rgba(50, 50, 255, ${pulse})`;
        ctx.fillRect(-6, -8, 12, 16);

        // HP Bar
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = '#f00';
        ctx.fillRect(-12, -16, 24, 3);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-12, -16, 24 * hpRatio, 3);
        ctx.strokeRect(-12, -16, 24, 3);

        ctx.restore();
    }
}
