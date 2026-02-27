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
        this.isBeingHooked = false;

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

        if (this.isArmed || this.isBeingHooked) {
            // Check for entities to explode on
            for (const entity of entityManager.entities) {
                if (entity === this) continue;
                if (entity.state !== undefined && entity.state === State.DEAD) continue;
                if (!entity.takeDamage) continue;

                // When being hooked: explode on enemies only.
                // The hook owner is excluded so the mine doesn't
                // instantly detonate as the hook chain retracts.
                const isHookOwner = entity === this._hookOwner;
                if (isHookOwner) continue;

                // Normal: explode on enemies. Hooked: explode on all except hook owner.
                if (this.isBeingHooked || entity.team !== this.team) {
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

    explode(entityManager, hookOwner) {
        this.hasExploded = true;

        // AOE Damage to all entities in explosion radius
        for (const entity of entityManager.entities) {
            if (entity === this) continue;
            if (entity.state !== undefined && entity.state === State.DEAD) continue;
            if (!entity.takeDamage) continue;

            const edx = entity.x - this.x;
            const edy = entity.y - this.y;
            const edist = Math.sqrt(edx * edx + edy * edy);

            if (edist < this.explosionRadius) {
                // WC3: Mine kills do NOT award score points.
                // Only mark killedByMine if the explosion actually kills them.
                if (entity.hp !== undefined && entity.hp - this.damage <= 0) {
                    entity.killedByMine = true;
                }
                entity.takeDamage(this.damage);
            }
        }

        entityManager.remove(this);
        this.state = State.DEAD;
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            id: this.id,
            type: 'LANDMINE',
            team: this.team,
            x: this.x,
            y: this.y,
            isArmed: this.isArmed,
        };
    }
}
