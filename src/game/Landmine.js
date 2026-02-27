import { State } from '../engine/State.js';

export class Landmine {
    constructor(x, y, ownerTeam) {
        this.id = 'mine_' + Math.random().toString(36).substr(2, 9);
        this.type = 'LANDMINE';
        this.x = x;
        this.y = y;
        this.team = ownerTeam;

        this.radius = 16;
        this.activationDelay = 1.5; // Starts armed after 1.5 seconds
        this.lifeTime = 120; // Lasts 2 minutes
        this.damage = 150;
        this.explosionRadius = 100;

        this.isArmed = false;
        this.hasExploded = false;
        this.state = State.IDLE;

        // Needed so explode can remove itself from entityManager
        this._entityManagerRef = null;
    }

    takeDamage(amount) {
        if (!this.hasExploded && this._entityManagerRef) {
            this.explode(this._entityManagerRef);
        }
    }

    update(dt, map, entityManager) {
        if (this.hasExploded) return;

        // Save ref for takeDamage triggered by Hook
        this._entityManagerRef = entityManager;

        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            entityManager.remove(this);
            return;
        }

        if (this.activationDelay > 0) {
            this.activationDelay -= dt;
            if (this.activationDelay <= 0) {
                this.isArmed = true;
            }
            return;
        }

        if (this.isArmed) {
            // Check for enemies stepping on it
            for (const entity of entityManager.entities) {
                if (entity.state !== State.DEAD && entity.takeDamage && entity.team !== this.team) {
                    const edx = entity.x - this.x;
                    const edy = entity.y - this.y;
                    const edist = Math.sqrt(edx * edx + edy * edy);

                    if (edist < this.radius + (entity.radius || 16)) {
                        this.explode(entityManager);
                        break;
                    }
                }
            }
        }
    }

    explode(entityManager) {
        this.hasExploded = true;

        // AOE Damage
        for (const entity of entityManager.entities) {
            if (entity.state !== State.DEAD && entity.takeDamage) {
                const edx = entity.x - this.x;
                const edy = entity.y - this.y;
                const edist = Math.sqrt(edx * edx + edy * edy);

                if (edist < this.explosionRadius) {
                    // Deal full damage to enemies, half damage to allies/self
                    const dmg = entity.team === this.team ? this.damage / 2 : this.damage;
                    entity.takeDamage(dmg);
                }
            }
        }

        entityManager.remove(this);

        // Visual hook for the client-side particle system later
        this.state = State.DEAD;
    }

    render(renderer) {
        // Let's render it as a small barrel, maybe slightly transparent if armed (stealthy)
        const ctx = renderer.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.globalAlpha = this.isArmed ? 0.3 : 1.0;

        ctx.fillStyle = '#8B4513'; // Brown barrel
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
