import { State } from '../engine/State.js';
import { Hook } from './Hook.js';

export class Character {
    constructor(x, y, team = 'red') {
        this.x = x;
        this.y = y;
        this.z = 0;

        // Здоровье и характеристики
        this.maxHp = 100;
        this.hp = this.maxHp;

        // Размеры и скорость (увеличены для открытой карты)
        this.radius = 20;
        this.speed = 280;

        // WC3 Апгрейды и Экономика
        this.gold = 0;

        // Характеристики хука (прокачиваемые)
        this.hookDamage = 25;
        this.hookSpeed = 1100; // Быстрее летит
        this.hookMaxDist = 800; // Дальше летит через широкую реку
        this.hookRadius = 20; // Чуть шире хитбокс
        this.hookCurvePower = 0.5; // Сила закругления при движении

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
        this.respawnDelay = 3; // 3 секунды респавна

        // Кулдаун хука
        this.hookCooldown = 0;
        this.maxHookCooldown = 3; // 3 секунды

        // Rot (W) - AOE toggle skill
        this.rotActive = false;
        this.rotDamagePerSec = 10; // DPS to nearby enemies
        this.rotSelfDamagePerSec = 5; // DPS to self
        this.rotRadius = 120; // AOE radius
        this.rotSlowFactor = 0.6; // Move speed multiplier when rot is on

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
        this.hpRegen = 2; // HP per second

        // === FLESH HEAP (WC3 Pudge Wars Passive) ===
        // Each kill permanently increases max HP by FLESH_HEAP_HP_PER_KILL
        this.fleshHeapStacks = 0;
        this.fleshHeapHpPerStack = 8; // +8 max HP per kill

        // XP / Level system
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = 100;

        // Buff timers
        this.hasteTimer = 0;
        this.ddTimer = 0;
        this.lastAttacker = null;
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
        // Flesh Heap: killed an enemy — permanently gain max HP
        this.fleshHeapStacks++;
        this.maxHp += this.fleshHeapHpPerStack;
        // Also restore that amount immediately (generous WC3 feel)
        this.hp = Math.min(this.hp + this.fleshHeapHpPerStack, this.maxHp);
    }

    castHook(targetX, targetY, entityManager) {
        if (this.state !== State.DEAD && this.state !== State.HOOKED && this.hookCooldown <= 0) {
            // Don't lock state to CASTING — allow movement while hook flies
            this.hookCooldown = this.maxHookCooldown;

            const hook = new Hook(this, targetX, targetY);
            entityManager.add(hook);
        }
    }

    takeDamage(amount, attacker = null) {
        if (this.state === State.DEAD || this.invulnerableTimer > 0) return;

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
        this.maxHp += 15;
        this.hp = this.maxHp; // Full heal on level up
        this.hookDamage += 3;
    }

    die() {
        this.state = State.DEAD;
        this.respawnTimer = this.respawnDelay;
    }

    respawn() {
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
        this.invulnerableTimer = 3;
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

                // Push both away gently
                this.x -= nx * overlap;
                this.y -= ny * overlap;
                entity.x += nx * overlap;
                entity.y += ny * overlap;
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
        };
    }
}
