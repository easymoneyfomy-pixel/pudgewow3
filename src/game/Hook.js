import { State } from '../engine/State.js';
import { TileType } from '../engine/Tile.js';
import { GAME } from '../shared/GameConstants.js';

export class Hook {
    constructor(owner, targetX, targetY) {
        this.id = 'hook_' + owner.id + '_' + Date.now();
        this.type = 'HOOK';
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
        this.pathNodes = [{ x: owner.x, y: owner.y }]; // Start with owner position
        
        // One-frame flags for visual effects
        this.clashJustHappened = false;
        this.hitJustHappened = false;
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

            // 3. Tile Collision (Walls & Obstacles)
            const tile = map.getTileAt(this.x, this.y);
            
            // Grapple ignores water - only stops at real obstacles
            const isWater = tile && tile.type === TileType.WATER;
            const isSolid = tile && (!tile.isHookable || tile.type === 'obstacle') && !isWater;

            if (isSolid) {
                if (this.hasGrapple || this.isGrappling) {
                    this.isGrappling = true;
                    this.startReturning();
                } else if (this.bouncesLeft > 0) {
                    this.bounce(map);
                } else {
                    this.startReturning();
                }
            }

            // Check collisions with entities (unless already returning)
            this.checkEntityCollisions(entityManager);
        } else {
            // Retraction
            if (this.isGrappling) {
                this.updateGrapple(moveAmt, entityManager, map);
            } else {
                this.updateRetraction(moveAmt, dt, entityManager);
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
        // Grapple hook ignores entities - only collides with walls
        if (this.hasGrapple) return;
        
        for (const entity of entityManager.entities) {
            if (entity === this || entity === this.owner) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx * dx + dy * dy;
            const rSum = this.radius + (entity.radius || 16);

            if (distSq < rSum * rSum) {
                if (entity instanceof Hook) {
                    // Hook clash - hooks bounce off each other
                    if (!entity.isReturning) {
                        this.clashJustHappened = true;
                        entity.clashJustHappened = true;
                        
                        // Bounce logic - deflect hooks perpendicular to collision
                        const collisionAngle = Math.atan2(dy, dx);
                        const bounceForce = 150; // Bounce strength
                        
                        // Bounce this hook
                        this.dirX = Math.cos(collisionAngle + Math.PI) * 0.5 + (Math.random() - 0.5) * 0.5;
                        this.dirY = Math.sin(collisionAngle + Math.PI) * 0.5 + (Math.random() - 0.5) * 0.5;
                        this.x += this.dirX * bounceForce;
                        this.y += this.dirY * bounceForce;
                        
                        // Bounce other hook
                        entity.dirX = Math.cos(collisionAngle) * 0.5 + (Math.random() - 0.5) * 0.5;
                        entity.dirY = Math.sin(collisionAngle) * 0.5 + (Math.random() - 0.5) * 0.5;
                        entity.x += entity.dirX * bounceForce;
                        entity.y += entity.dirY * bounceForce;
                        
                        // Reset distance tracking so hook doesn't immediately return
                        this.currentDist = Math.min(this.currentDist, this.maxDist * 0.5);
                        entity.currentDist = Math.min(entity.currentDist, entity.maxDist * 0.5);
                        
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
        // Barathrum's Lantern: +Damage based on speed exceeding base 750 (10% of speed bonus)
        if (this.hasLantern) {
            const speedBonus = Math.max(0, this.speed - 750);
            damage += speedBonus * 0.1;
        }
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
                // Rupture removed from here - now applied in updateRetraction while enemy is hooked
                if (item.id === 'lifesteal' || item.effect === 'lifesteal') {
                    const heal = damage * 0.4; // 40% lifesteal
                    this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + heal);
                }
            }

            this.owner.gold += GAME.GOLD_ON_HIT;
            console.log(`[GOLD] Hit reward: Player ${this.owner.id} +${GAME.GOLD_ON_HIT} (Total: ${this.owner.gold})`);
        }
    }

    updateRetraction(moveAmt, dt, entityManager) {
        let remaining = moveAmt;

        // Apply Rupture damage while enemy is hooked (Strygwyr's Claws logic)
        if (this.hookedEntity && this.hookedEntity.state === State.HOOKED && this.hookedEntity.type !== 'LANDMINE') {
            const hasRupture = (this.owner.items || []).some(i => i.id === 'claws' || i.effect === 'rupture');
            if (hasRupture) {
                // Deal damage per second while hooked (5 DPS)
                this.hookedEntity.takeDamage(5 * dt, this.owner);
            }
        }

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

    updateGrapple(moveAmt, entityManager, map) {
        const dx = this.x - this.owner.x;
        const dy = this.y - this.owner.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Grapple pulls at normal hook speed (x1)
        const grappleSpeed = moveAmt;

        // Check if owner reached the hook position
        if (dist <= grappleSpeed || dist < 5) {
            // Owner reached hook - stop grappling
            this.owner.x = this.x;
            this.owner.y = this.y;
            this.owner.isPaused = false;
            
            // Reset grapple flag
            this.hasGrapple = false;
            this.isGrappling = false;

            // Remove hook
            entityManager.remove(this);
            return;
        }
        
        // Check if owner is stuck in wall
        if (map) {
            const tile = map.getTileAt(this.owner.x, this.owner.y);
            if (tile && !tile.isWalkable) {
                // Owner hit wall - stop grappling
                this.owner.isPaused = false;
                this.hasGrapple = false;
                this.isGrappling = false;
                entityManager.remove(this);
                return;
            }
        }

        const nextX = this.owner.x + (dx / dist) * grappleSpeed;
        const nextY = this.owner.y + (dy / dist) * grappleSpeed;

        // Move the owner directly (ignore collision for grapple pull to allow "jumping" over small corners)
        this.owner.x = nextX;
        this.owner.y = nextY;

        // Safety timeout
        this.grappleLifetime = (this.grappleLifetime || 0) + 1;
        if (this.grappleLifetime > 300) { // Timeout 300 ticks (~10s)
            this.owner.isPaused = false;
            this.hasGrapple = false;
            this.isGrappling = false;
            entityManager.remove(this);
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            id: this.id,
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
