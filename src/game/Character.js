import { Hook } from './Hook.js';
import { State } from '../engine/State.js';
import { GAME } from '../shared/GameConstants.js';

export class Character {
    constructor(x, y, team = 'red') {
        this.x = x;
        this.y = y;
        this.z = 0;

        // Здоровье и характеристики
        this.maxHp = 100;
        this.hp = this.maxHp;

        // Размеры и скорость
        this.radius = GAME.CHAR_RADIUS;
        this.speed = GAME.CHAR_SPEED;

        // WC3 Апгрейды и Экономика
        this.gold = 0;

        // Характеристики хука (прокачиваемые)
        this.hookDamage = GAME.HOOK_DAMAGE;
        this.hookSpeed = GAME.HOOK_SPEED;
        this.hookMaxDist = GAME.HOOK_MAX_DIST;
        this.hookRadius = GAME.HOOK_RADIUS;
        this.hookCurvePower = GAME.HOOK_CURVE_POWER;

        // Состояние
        this.state = State.IDLE;

        // Спавн и команды
        this.team = team;
        this.color = team === 'red' ? '#880000' : '#000088';
        this.spawnX = x;
        this.spawnY = y;

        // Цель перемещения
        this.targetX = x;
        this.targetY = y;

        // Таймеры
        this.respawnTimer = 0;
        this.respawnDelay = GAME.RESPAWN_DELAY;

        // Кулдаун хука
        this.hookCooldown = 0;
        this.maxHookCooldown = GAME.HOOK_COOLDOWN;

        // Rot (W) - AOE toggle skill
        this.rotActive = false;
        this.rotDamagePerSec = GAME.ROT_DAMAGE_PER_SEC;
        this.rotSelfDamagePerSec = GAME.ROT_SELF_DAMAGE_PER_SEC;
        this.rotRadius = GAME.ROT_RADIUS;
        this.rotSlowFactor = GAME.ROT_SLOW_FACTOR;

        // Items inventory
        this.items = [];
        this.maxItems = 6;

        // Headshot flag
        this.headshotJustHappened = false;
        // Deny flag
        this.deniedJustHappened = false;

        // WC3 Status effects
        this.invulnerableTimer = 0;
        this.isHealing = false;
        this.shieldRadius = 25;

        // Barricade ability — REMOVED (replaced by Flesh Heap passive)

        // Passive HP regen
        this.hpRegen = GAME.CHAR_HP_REGEN;

        // === FLESH HEAP (WC3 Pudge Wars Passive) ===
        // Each kill permanently increases max HP by FLESH_HEAP_HP_PER_KILL
        this.fleshHeapStacks = 0;
        this.fleshHeapHpPerStack = GAME.FLESH_HEAP_HP;

        // XP / Level system
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = 100;

        // Buff timers
        this.hasteTimer = 0;
        this.ddTimer = 0;
        this.lastAttacker = null;

        // Active Items
        this.salveTimer = 0;

        // WC3 Hook Lock
        this.isPaused = false;

        // Ensure stats are correct after all properties (level, items, etc.) are initialized
        this.recalculateStats();
    }

    setTarget(x, y) {
        if (this.state === State.IDLE || this.state === State.MOVING || this.state === State.CASTING) {
            this.targetX = x;
            this.targetY = y;
            this.state = State.MOVING;
        }
    }

    toggleRot() {
        if (this.state === State.DEAD) return;
        this.rotActive = !this.rotActive;
    }

    gainFleshHeap() {
        // Flesh Heap: killed an enemy — permanently gain stacks
        this.fleshHeapStacks++;
        this.recalculateStats();
        // Restore amount immediately
        this.hp = Math.min(this.hp + this.fleshHeapHpPerStack, this.maxHp);
    }

    castHook(targetX, targetY, entityManager) {
        if (this.state !== State.DEAD && this.state !== State.HOOKED && this.hookCooldown <= 0) {
            // Disabled: Lock movements during forward hook (per user request)
            // this.isPaused = true;
            this.hookCooldown = this.maxHookCooldown;

            const hook = new Hook(this, targetX, targetY);
            entityManager.add(hook);
        }
    }

    takeDamage(amount, attacker = null) {
        if (this.state === State.DEAD || this.invulnerableTimer > 0) return;

        // Taking damage breaks Healing Salve effect
        this.salveTimer = 0;

        if (attacker && attacker !== this) {
            this.lastAttacker = attacker;
        }

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }


    gainXp(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToLevel) {
            this.xp -= this.xpToLevel;
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xpToLevel = Math.floor(this.xpToLevel * 1.5);
        this.recalculateStats();
        // Fully restore HP on level up
        this.hp = this.maxHp;
    }

    die() {
        this.state = State.DEAD;
        this.respawnTimer = this.respawnDelay;
    }

    respawn() {
        // 1. Re-calculate stats first to ensure maxHp is current
        this.recalculateStats();

        // 2. Set HP to correctly calculated maxHp
        this.hp = this.maxHp;

        this.state = State.IDLE;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.targetX = this.spawnX;
        this.targetY = this.spawnY;

        // Reset per-life flags
        this.killedByMine = false;
        this.burnTimer = 0;
        this.ruptureTimer = 0;

        // 3 sec of invulnerability after respawn
        this.invulnerableTimer = GAME.RESPAWN_DELAY; // Use respawn delay for post-spawn protection too
    }

    update(dt, map, entityManager) {
        // Обновляем кулдауны
        if (this.hookCooldown > 0) {
            this.hookCooldown -= dt;
        }

        // Tick invulnerability
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }

        if (this.state === State.DEAD) {
            this.rotActive = false;
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        // Passive HP regen
        let currentRegen = this.hpRegen;
        if (this.isHealing) {
            currentRegen += 10; // Healing fountain bonus
        }

        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + currentRegen * dt);
        }

        // ROT AOE damage
        if (this.rotActive && entityManager) {
            // Self damage (can deny)
            const rotDamage = this.rotSelfDamagePerSec * dt;
            if (this.hp - rotDamage <= 0 && this.state !== State.DEAD) {
                this.deniedJustHappened = true; // WC3 Mechanic: Rot Deny
            }
            this.takeDamage(rotDamage);

            // Damage nearby enemies
            for (const entity of entityManager.entities) {
                if (entity === this) continue;
                if (!entity.takeDamage || entity.state === State.DEAD) continue;
                if (entity.team === this.team) continue; // Don't hurt allies

                const edx = entity.x - this.x;
                const edy = entity.y - this.y;
                const edist = Math.sqrt(edx * edx + edy * edy);

                if (edist < this.rotRadius) {
                    entity.takeDamage(this.rotDamagePerSec * dt);
                }
            }
        }

        // Burn DOT (Flaming Hook effect)
        if (this.burnTimer && this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.takeDamage(this.burnDps * dt);
        }

        // Rupture DOT (Strygwyr's Claws effect - damage while moving)
        if (this.ruptureTimer && this.ruptureTimer > 0) {
            this.ruptureTimer -= dt;
            if (this.state === State.MOVING) {
                this.takeDamage(this.ruptureDps * dt);
            }
        }

        // Tick rune buffs
        if (this.hasteTimer > 0) {
            this.hasteTimer -= dt;
        }
        if (this.ddTimer > 0) {
            this.ddTimer -= dt;
        }

        // Healing Salve tick
        if (this.salveTimer > 0) {
            this.salveTimer -= dt;
            this.hp = Math.min(this.maxHp, this.hp + 10 * dt); // 100 HP over 10s (Salves are hardcoded in ItemDefs but this is fine for now)
        }

        // CHARACTER COLLISION & UNSTUCK
        if (entityManager) {
            this.handleCharacterCollisions(entityManager);
        }
        if (map) {
            this.checkUnstuck(map);
        }

        if (this.state === State.HOOKED) {
            this.targetX = this.x;
            this.targetY = this.y;
            return;
        }

        if (this.state === State.MOVING) {
            if (this.isPaused) {
                return; // Movement locked
            }
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                let actualSpeed = this.rotActive ? this.speed * this.rotSlowFactor : this.speed;
                // WC3 Mechanic: Haste Rune makes you run very fast
                if (this.hasteTimer > 0) {
                    actualSpeed *= 1.8;
                }

                const moveAmt = actualSpeed * dt;
                const dirX = dx / dist;
                const dirY = dy / dist;

                const nextX = this.x + dirX * moveAmt;
                const nextY = this.y + dirY * moveAmt;

                let canMove = false;
                if (map) {
                    // Check if the entire bounding box is walkable to prevent wall clipping
                    const r = this.radius;
                    canMove = map.isWalkable(nextX - r, nextY - r) &&
                        map.isWalkable(nextX + r, nextY - r) &&
                        map.isWalkable(nextX - r, nextY + r) &&
                        map.isWalkable(nextX + r, nextY + r);
                }

                if (canMove) {
                    if (moveAmt >= dist) {
                        this.x = this.targetX;
                        this.y = this.targetY;
                        this.state = State.IDLE;
                    } else {
                        this.x = nextX;
                        this.y = nextY;
                    }
                } else {
                    this.targetX = this.x;
                    this.targetY = this.y;
                    this.state = State.IDLE;
                }
            } else {
                this.state = State.IDLE;
            }
        }
    }

    handleCharacterCollisions(entityManager) {
        if (this.state === State.DEAD) return;

        for (const entity of entityManager.entities) {
            if (entity === this || entity.type !== 'CHARACTER' || entity.state === State.DEAD) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx * dx + dy * dy;
            const minDist = this.radius + entity.radius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 1;
                const overlap = (minDist - dist) / 2;
                const nx = dx / dist;
                const ny = dy / dist;

                // Push both away (Firmer resolution)
                const pushX = nx * overlap * 1.1; // 10% extra to prevent jitter
                const pushY = ny * overlap * 1.1;
                this.x -= pushX;
                this.y -= pushY;
                entity.x += pushX;
                entity.y += pushY;
            }
        }
    }

    checkUnstuck(map) {
        if (this.state === State.DEAD || this.state === State.HOOKED) return;

        const r = this.radius;
        const isStuck = !map.isWalkable(this.x - r, this.y - r) ||
            !map.isWalkable(this.x + r, this.y - r) ||
            !map.isWalkable(this.x - r, this.y + r) ||
            !map.isWalkable(this.x + r, this.y + r);

        if (isStuck) {
            // Find nearest walkable direction
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
                { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
            ];

            for (let step = 4; step <= 200; step += 16) {
                for (const d of directions) {
                    const tx = this.x + d.x * step;
                    const ty = this.y + d.y * step;
                    if (map.isWalkable(tx - r, ty - r) &&
                        map.isWalkable(tx + r, ty - r) &&
                        map.isWalkable(tx - r, ty + r) &&
                        map.isWalkable(tx + r, ty + r)) {
                        this.x = tx;
                        this.y = ty;
                        return;
                    }
                }
            }
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast and client-side reconstruction. */
    serialize() {
        return {
            type: 'CHARACTER',
            id: this.id,
            x: this.x,
            y: this.y,
            team: this.team,
            hp: this.hp,
            maxHp: this.maxHp,
            state: this.state,
            hookCooldown: this.hookCooldown,
            maxHookCooldown: this.maxHookCooldown,
            gold: this.gold,
            hookDamage: this.hookDamage,
            hookSpeed: this.hookSpeed,
            hookMaxDist: this.hookMaxDist,
            hookRadius: this.hookRadius,
            isHeadshot: this.headshotJustHappened,
            isDenied: this.deniedJustHappened,
            rotActive: this.rotActive,
            fleshHeapStacks: this.fleshHeapStacks || 0,
            items: this.items || [],
            level: this.level || 1,
            xp: this.xp || 0,
            xpToLevel: this.xpToLevel || 100,
            burnTimer: this.burnTimer || 0,
            ruptureTimer: this.ruptureTimer || 0,
            invulnerableTimer: this.invulnerableTimer || 0,
            isHealing: this.isHealing || false,
            hasteTimer: this.hasteTimer || 0,
            ddTimer: this.ddTimer || 0,
            speed: this.speed,
        };
    }

    recalculateStats() {
        // 1. Reset base values and apply scaling
        // Base stats from constants
        this.speed = GAME.CHAR_SPEED;
        this.hookRadius = GAME.HOOK_RADIUS;
        this.hookMaxDist = GAME.HOOK_MAX_DIST;

        // Core scaling (Level based)
        this.maxHp = 100 + (this.level - 1) * 15;
        this.hookDamage = GAME.HOOK_DAMAGE + (this.level - 1) * 3;
        this.hookSpeed = GAME.HOOK_SPEED + (this.level - 1) * 25;

        // 2. Apply Flesh Heap stacks
        this.maxHp += (this.fleshHeapStacks || 0) * (this.fleshHeapHpPerStack || 8);

        // 3. Apply items bonuses
        for (const item of this.items || []) {
            if (item.effect === 'speed') this.speed += 40;
            // Expansion point: add more item effects here
        }
    }
}
