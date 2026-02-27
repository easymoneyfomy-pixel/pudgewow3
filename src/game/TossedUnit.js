import { State } from '../engine/State.js';

export class TossedUnit {
    constructor(owner, targetUnit, targetX, targetY) {
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

        this.speed = 400; // Toss speed
        this.dirX = this.totalDist > 0 ? dx / this.totalDist : 0;
        this.dirY = this.totalDist > 0 ? dy / this.totalDist : 0;

        this.currentDist = 0;
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

        // Check if landed
        if (this.currentDist >= this.totalDist) {
            this.targetUnit.x = this.targetX;
            this.targetUnit.y = this.targetY;
            this.targetUnit.z = 0;
            this.targetUnit.state = State.IDLE; // Free the unit

            if (this.onLanded) this.onLanded(this.targetX, this.targetY);

            // AOE Damage on landing
            for (const entity of entityManager.entities) {
                if (entity !== this.targetUnit && entity.takeDamage && entity.state !== State.DEAD) {
                    const edx = entity.x - this.targetX;
                    const edy = entity.y - this.targetY;
                    const edist = Math.sqrt(edx * edx + edy * edy);

                    if (edist < 80) { // 80 Landing radius
                        entity.takeDamage(75); // 75 Toss damage
                    }
                }
            }

            entityManager.remove(this);
        }
    }

    render(renderer) {
        // Invisible entity, it just moves the targetUnit
    }
}
