import { State } from '../engine/State.js';
import { GAME } from '../shared/GameConstants.js';

/**
 * Landmine (Techies Barrel) — WC3 Pudge Wars mechanics:
 *
 *  • Placed by a player via item. Invisible to enemies after arming (1.5 s).
 *  • While armed, detonates on proximity to any ENEMY character.
 *  • ANY hook (ally or enemy) can grab the mine and drag it.
 *  • While being dragged (isBeingHooked), the mine detonates on contact
 *    with ANY character EXCEPT the hook caster.
 *  • When the hook returns to its owner, the mine is dropped at that
 *    location and remains armed — it does NOT keep the "being hooked" state.
 *  • Mine kills do NOT award score points.
 *  • Mines can chain-detonate other mines in their explosion radius.
 *  • Taking any damage (e.g. from another explosion) triggers detonation.
 */
export class Landmine {
    constructor(x, y, ownerTeam) {
        this.id = 'mine_' + Math.random().toString(36).substr(2, 9);
        this.type = 'LANDMINE';
        this.x = x;
        this.y = y;
        this.team = ownerTeam;

        this.radius = 16;
        this.activationDelay = 1.5;
        this.lifeTime = 120;           // 2 minutes
        this.damage = 150;
        this.explosionRadius = 100;

        this.isArmed = false;
        this.hasExploded = false;
        this.state = State.IDLE;

        /** Set to true by Hook when grabbed */
        this.isBeingHooked = false;

        /** Reference to the character that launched the hook grabbing this mine.
         *  Used to exclude that character from proximity detonation while dragged. */
        this._hookOwner = null;

        /** Cached so takeDamage() can trigger explode() without extra args. */
        this._entityManagerRef = null;
    }

    // ── External triggers ──────────────────────────────────────────────────

    /** Any incoming damage causes immediate detonation. */
    takeDamage(_amount) {
        if (!this.hasExploded && this._entityManagerRef) {
            this.explode(this._entityManagerRef);
        }
    }

    /**
     * Called by Hook when it finishes returning and drops the mine.
     * Resets the "being hooked" state so the mine behaves normally again.
     */
    onDropped() {
        this.isBeingHooked = false;
        this._hookOwner = null;
        this.state = State.IDLE;
    }

    // ── Main update ────────────────────────────────────────────────────────

    update(dt, map, entityManager) {
        if (this.hasExploded) return;

        // Cache for takeDamage
        this._entityManagerRef = entityManager;

        // Lifetime
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            entityManager.remove(this);
            return;
        }

        // Arming countdown (ticks even while being hooked)
        if (this.activationDelay > 0) {
            this.activationDelay -= dt;
            if (this.activationDelay <= 0) {
                this.isArmed = true;
            }
        }

        // ── Proximity detonation check ─────────────────────────────────
        // Active when: mine is armed OR mine is currently being dragged by a hook.
        if (!this.isArmed && !this.isBeingHooked) return;

        for (const entity of entityManager.entities) {
            if (entity === this) continue;

            // Skip dead entities
            if (entity.state !== undefined && entity.state === State.DEAD) continue;

            // Must be damageable (characters, barricades, other mines)
            if (!entity.takeDamage) continue;

            // ── Who triggers detonation? ───────────────────────────────
            let shouldCheck = false;

            if (this.isBeingHooked) {
                // While dragged: detonate on ANYONE except the hook caster
                if (entity !== this._hookOwner) {
                    shouldCheck = true;
                }
            } else {
                // While stationary & armed: detonate on ENEMY characters only
                if (entity.team !== this.team) {
                    shouldCheck = true;
                }
            }

            if (!shouldCheck) continue;

            // Distance check (Optimized: Squared distance)
            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx * dx + dy * dy;
            const rSum = this.radius + (entity.radius || 16);

            if (distSq < rSum * rSum) {
                this.explode(entityManager);
                return; // mine is gone
            }
        }
    }

    // ── Explosion ──────────────────────────────────────────────────────────

    explode(entityManager) {
        if (this.hasExploded) return;
        this.hasExploded = true;

        if (this.onExplode) this.onExplode(this.x, this.y);

        // AOE damage to everything in blast radius
        for (const entity of entityManager.entities) {
            if (entity === this) continue;
            if (entity.state !== undefined && entity.state === State.DEAD) continue;
            if (!entity.takeDamage) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < this.explosionRadius * this.explosionRadius) {
                // WC3: mine kills do NOT award score points.
                // Only flag if the damage would actually kill them.
                if (entity.hp !== undefined && entity.hp - this.damage <= 0) {
                    entity.killedByMine = true;
                }
                entity.takeDamage(this.damage);
            }
        }

        entityManager.remove(this);
        this.state = State.DEAD;
    }

    // ── Serialization ──────────────────────────────────────────────────────

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            id: this.id,
            type: 'LANDMINE',
            team: this.team,
            x: this.x,
            y: this.y,
            isArmed: this.isArmed,
            isBeingHooked: this.isBeingHooked,
        };
    }
}
