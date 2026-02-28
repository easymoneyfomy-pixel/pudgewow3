import { State } from '../engine/State.js';
import { GAME } from '../shared/GameConstants.js';

export class TossedUnit {
    constructor(owner, targetUnit, targetX, targetY) {
        this.id = 'tossed_' + Math.random().toString(36).substr(2, 9);
        this.type = 'TOSSED_UNIT';
        this.owner = owner;
        this.targetUnit = targetUnit;
        this.targetX = targetX;
        this.targetY = targetY;

        // Disable target unit movement while tossed
        this.targetUnit.state = State.HOOKED; // Reusing hooked state for stun/disable

        // Calculate velocity
        const dx = targetX - targetUnit.x;
        const dy = targetY - targetUnit.y;
        this.totalDist = Math.sqrt(dx * dx + dy * dy);

        this.speed = GAME.TOSS_SPEED; // Toss speed
        this.dirX = this.totalDist > 0 ? dx / this.totalDist : 0;
        this.dirY = this.totalDist > 0 ? dy / this.totalDist : 0;

        this.currentDist = 0;
        
        // Visual effects
        this.particles = [];
        this.spawnDustCloud(targetUnit.x, targetUnit.y);
    }

    spawnDustCloud(x, y) {
        // Spawn initial dust cloud when toss starts
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 80 + 40;
            const life = Math.random() * 0.4 + 0.3;
            const size = Math.random() * 5 + 3;
            this.particles.push({
                x: x,
                y: y,
                z: Math.random() * 20,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                speedZ: Math.random() * 30 + 20,
                life: life,
                maxLife: life,
                size: size,
                color: '#8B7355' // Dust brown color
            });
        }
    }

    spawnLandingEffect(x, y, entityManager) {
        // Spawn dust cloud on landing
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 60;
            const life = Math.random() * 0.5 + 0.4;
            const size = Math.random() * 6 + 4;
            this.particles.push({
                x: x,
                y: y,
                z: 0,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                speedZ: Math.random() * 40 + 30,
                life: life,
                maxLife: life,
                size: size,
                color: '#8B7355'
            });
        }
        
        // Spawn debris particles
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 80;
            const life = Math.random() * 0.6 + 0.4;
            const size = Math.random() * 4 + 2;
            this.particles.push({
                x: x,
                y: y,
                z: 0,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                speedZ: Math.random() * 60 + 40,
                life: life,
                maxLife: life,
                size: size,
                color: '#5d4037'
            });
        }

        // Trigger explosion event for visual/sound
        if (this.onLanded) {
            this.onLanded(this.targetX, this.targetY);
        }
    }

    update(dt, map, entityManager) {
        if (!this.targetUnit || this.targetUnit.state === State.DEAD) {
            entityManager.remove(this);
            return;
        }

        const moveAmt = this.speed * dt;
        this.currentDist += moveAmt;

        // Move the unit
        this.targetUnit.x += this.dirX * moveAmt;
        this.targetUnit.y += this.dirY * moveAmt;

        // Arc calculation (just for visual Z-height, though we only have 2D logic mostly)
        // A simple parabola: z = maxZ * (1 - (2x/d - 1)^2)
        const progress = this.currentDist / this.totalDist;
        const maxZ = 150;
        this.targetUnit.z = maxZ * (1 - Math.pow(2 * progress - 1, 2));

        // Update particles
        for (const p of this.particles) {
            p.x += p.speedX * dt;
            p.y += p.speedY * dt;
            p.z += p.speedZ * dt;
            p.speedZ += -200 * dt; // Gravity
            if (p.z < 0) p.z = 0;
            p.life -= dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);

        // Spawn trail particles during flight
        if (this.currentDist < this.totalDist && Math.random() < 0.3) {
            this.particles.push({
                x: this.targetUnit.x,
                y: this.targetUnit.y,
                z: this.targetUnit.z * 0.5,
                speedX: (Math.random() - 0.5) * 30,
                speedY: (Math.random() - 0.5) * 30,
                speedZ: Math.random() * 20,
                life: Math.random() * 0.2 + 0.1,
                maxLife: 0.3,
                size: Math.random() * 3 + 2,
                color: 'rgba(200, 200, 200, 0.5)'
            });
        }

        // Check if landed
        if (this.currentDist >= this.totalDist) {
            this.targetUnit.x = this.targetX;
            this.targetUnit.y = this.targetY;
            this.targetUnit.z = 0;
            this.targetUnit.state = State.IDLE; // Free the unit

            // Landing effect
            this.spawnLandingEffect(this.targetX, this.targetY, entityManager);

            // AOE Damage on landing
            for (const entity of entityManager.entities) {
                if (entity !== this.targetUnit && entity.takeDamage && entity.state !== State.DEAD) {
                    const edx = entity.x - this.targetX;
                    const edy = entity.y - this.targetY;
                    const edist = Math.sqrt(edx * edx + edy * edy);

                    if (edist < GAME.TOSS_RADIUS) {
                        entity.takeDamage(GAME.TOSS_DAMAGE);
                    }
                }
            }

            entityManager.remove(this);
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        
        // Render particles
        for (const p of this.particles) {
            const screenX = p.x;
            const screenY = p.y - p.z;
            const alpha = Math.max(0, p.life / p.maxLife);
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            id: this.id,
            type: 'TOSSED_UNIT',
            targetUnitId: this.targetUnit ? this.targetUnit.id : null,
            targetX: this.targetX,
            targetY: this.targetY,
            currentDist: this.currentDist,
            totalDist: this.totalDist,
            dirX: this.dirX,
            dirY: this.dirY
        };
    }
}
