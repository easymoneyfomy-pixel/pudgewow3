import { State } from '../engine/State.js';
import { GAME } from '../shared/GameConstants.js';

export class Hook {
    constructor(owner, targetX, targetY) {
        this.owner = owner;
        this.x = owner.x;
        this.y = owner.y;

        // Вектор направления при броске
        const dx = targetX - owner.x;
        const dy = targetY - owner.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.dirX = dist > 0 ? dx / dist : 1;
        this.dirY = dist > 0 ? dy / dist : 0;

        // Состояние хука из прокачки владельца
        this.speed = owner.hookSpeed;
        this.maxDist = owner.hookMaxDist;
        this.radius = owner.hookRadius;
        this.bouncesLeft = owner.hookBounces || 0; // Ricochet Turbine

        // Item effects from owner (defaults)
        this.hasBurn = (owner.items || []).some(i => i.effect === 'burn');
        this.hasRupture = (owner.items || []).some(i => i.effect === 'rupture');
        this.hasGrapple = false; // Set explicitly by castHook
        this.hasLifesteal = (owner.items || []).some(i => i.effect === 'lifesteal');
        this.hasLantern = (owner.items || []).some(i => i.effect === 'lantern');
        this.isFlaming = this.hasBurn; // Phase 25: Visual synchronization

        this.currentDist = 0;
        this.isReturning = false;

        // Кого зацепили
        this.hookedEntity = null;

        // Position tracking for curving/delta movement
        this.ownerPrevX = owner.x;
        this.ownerPrevY = owner.y;
        this.pathNodes = []; // List of breadcrumbs {x, y} for polyline chain
    }

    update(dt, map, entityManager) {
        if (this.owner.state === State.DEAD) {
            this.owner.isPaused = false;
            if (this.hookedEntity) {
                if (this.hookedEntity.onDropped) this.hookedEntity.onDropped();
                this.hookedEntity.state = State.IDLE;
            }
            entityManager.remove(this);
            return;
        }

        const moveAmt = this.speed * dt;

        // 1. Record Pudge's path (for curved chain)
        const lastNode = this.pathNodes[this.pathNodes.length - 1];
        const lx = lastNode ? lastNode.x : this.owner.x;
        const ly = lastNode ? lastNode.y : this.owner.y;
        const distToLastSq = (this.owner.x - lx) ** 2 + (this.owner.y - ly) ** 2;

        if (distToLastSq >= GAME.HOOK_PATH_THRESHOLD_SQ) {
            this.pathNodes.push({ x: this.owner.x, y: this.owner.y });
        }

        // 2. Head movement
        if (!this.isReturning) {
            // Forward flight
            this.x += this.dirX * moveAmt;
            this.y += this.dirY * moveAmt;
            this.currentDist += moveAmt;

            // Check distance
            if (this.currentDist >= this.maxDist) {
                this.startReturning();
            }

            // Check walls
            const tile = map.getTileAt(this.x, this.y);
            if (tile && !tile.isHookable) {
                if (this.hasGrapple) {
                    this.isGrappling = true;
                    this.startReturning();
                } else if (this.bouncesLeft > 0) {
                    this.bounce(map);
                } else {
                    this.startReturning();
                }
            }

            // Check collisions with obstacles (trees) for bouncing
            if (tile && tile.type === 'obstacle' && this.bouncesLeft > 0 && !this.isReturning) {
                this.bounce(map);
            }

            // Check collisions with entities (unless already returning)
            this.checkEntityCollisions(entityManager);
        } else {
            // Retraction
            if (this.isGrappling) {
                this.updateGrapple(moveAmt, entityManager);
            } else {
                this.updateRetraction(moveAmt, entityManager);
            }
        }
    }

    startReturning() {
        this.isReturning = true;
        this.owner.isPaused = false;
    }

    bounce(map) {
        this.bouncesLeft--;
        // Reflect off nearest wall
        const checkDist = 32; // Professional Polish: half-tile detection for consistency
        const left = map.getTileAt(this.x - checkDist, this.y);
        const right = map.getTileAt(this.x + checkDist, this.y);
        const up = map.getTileAt(this.x, this.y - checkDist);
        const down = map.getTileAt(this.x, this.y + checkDist);

        const isSolid = (t) => t && (!t.isHookable || t.type === 'obstacle');

        if (isSolid(left) || isSolid(right)) this.dirX *= -1;
        if (isSolid(up) || isSolid(down)) this.dirY *= -1;

        this.x += this.dirX * 10;
        this.y += this.dirY * 10;
    }

    checkEntityCollisions(entityManager) {
        for (const entity of entityManager.entities) {
            if (entity === this || entity === this.owner) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx * dx + dy * dy;
            const rSum = this.radius + (entity.radius || 16);

            if (distSq < rSum * rSum) {
                if (entity instanceof Hook) {
                    if (!entity.isReturning) {
                        this.startReturning();
                        entity.startReturning();
                        this.clashJustHappened = true;
                        entity.clashJustHappened = true;
                        return;
                    }
                } else if (entity.takeDamage && entity.state !== State.DEAD) {
                    this.handleHit(entity, entityManager);
                    this.hitJustHappened = true;
                    return;
                }
            }
        }
    }

    handleHit(entity, entityManager) {
        this.startReturning();

        if (entity.state === State.HOOKED) {
            // HEADSHOT
            entity.takeDamage(9999, this.owner);
            entity.headshotJustHappened = true;
            return;
        }

        this.hookedEntity = entity;
        entity.state = State.HOOKED;

        const isAlly = entity.team === this.owner.team;
        let damage = this.owner.hookDamage;
        if (this.hasLantern) damage += this.speed * 0.1;
        if (this.owner.ddTimer > 0) damage *= 2;

        if (entity.type === 'LANDMINE') {
            entity.isBeingHooked = true;
            entity._hookOwner = this.owner;
        }

        entity.takeDamage(damage, this);

        // Phase 17: Apply Status Effects based on caller's items
        if (!isAlly) {
            for (const item of this.owner.items || []) {
                if (item.id === 'fire_hook' || item.effect === 'burn') {
                    entity.burnTimer = 3; // Burn for 3 seconds
                }
                if (item.id === 'claws' || item.effect === 'rupture') {
                    entity.ruptureTimer = 5; // Rupture for 5 seconds
                }
                if (item.id === 'lifesteal' || item.effect === 'lifesteal') {
                    const heal = damage * 0.4; // 40% lifesteal
                    this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + heal);
                }
            }

            this.owner.gold += GAME.GOLD_ON_HIT;
        }
    }

    updateRetraction(moveAmt, entityManager) {
        let remaining = moveAmt;

        while (remaining > 0) {
            const target = this.pathNodes.length > 0 ? this.pathNodes[this.pathNodes.length - 1] : this.owner;
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= remaining) {
                this.x = target.x;
                this.y = target.y;
                remaining -= dist;

                if (this.pathNodes.length > 0) {
                    this.pathNodes.pop();
                } else {
                    // Fully returned
                    this.finalizeRetraction(entityManager);
                    return;
                }
            } else {
                this.x += (dx / dist) * remaining;
                this.y += (dy / dist) * remaining;
                remaining = 0;
            }
        }

        if (this.hookedEntity && this.hookedEntity.state !== State.DEAD) {
            this.hookedEntity.x = this.x;
            this.hookedEntity.y = this.y;
        }
    }

    finalizeRetraction(entityManager) {
        if (this.hookedEntity) {
            // Drop target near owner
            this.hookedEntity.x = this.owner.x + this.dirX * 40;
            if (this.hookedEntity.onDropped) {
                this.hookedEntity.onDropped();
            }
            // Phase 15: Protect DEAD state. Only reset to IDLE if the unit actually survived.
            if (this.hookedEntity.state !== State.DEAD) {
                this.hookedEntity.state = State.IDLE;
            }
        }
        this.owner.isPaused = false;
        entityManager.remove(this);
    }

    updateGrapple(moveAmt, entityManager) {
        const dx = this.x - this.owner.x;
        const dy = this.y - this.owner.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= moveAmt * 2) { // Slightly larger threshold for safety
            // Final snap - try to find valid position near hook if hook is in wall
            this.owner.x = this.x;
            this.owner.y = this.y;
            this.owner.isPaused = false;

            // If we are now stuck in a wall, use the character's built-in unstuck logic
            // but we need to trigger it here since character.update is usually skipped when isPaused is true
            // but isPaused is now false.
            entityManager.remove(this);
        } else {
            const nextX = this.owner.x + (dx / dist) * moveAmt;
            const nextY = this.owner.y + (dy / dist) * moveAmt;

            // Move the owner directly (ignore collision for grapple pull to allow "jumping" over small corners)
            this.owner.x = nextX;
            this.owner.y = nextY;

            // Safety: if owner hasn't moved for some reason or is taking too long
            this.grappleLifetime = (this.grappleLifetime || 0) + 1;
            if (this.grappleLifetime > 300) { // Timeout 300 ticks (~10s)
                this.owner.isPaused = false;
                entityManager.remove(this);
            }
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            type: 'HOOK',
            x: this.x,
            y: this.y,
            dirX: this.dirX,
            dirY: this.dirY,
            isReturning: this.isReturning,
            ownerId: this.owner.id,
            radius: this.radius,
            pathNodes: this.pathNodes.map(p => ({ x: p.x, y: p.y })),
            clashJustHappened: this.clashJustHappened || false,
            hitJustHappened: this.hitJustHappened || false,
            isFlaming: this.isFlaming || false
        };
    }
}
