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

        // Shop Upgrades (tracked separately for recalculateStats)
        this.dmgUpgrades = 0;
        this.spdUpgrades = 0;
        this.distUpgrades = 0;
        this.radUpgrades = 0;
        this.moveSpeedUpgrades = 0;
        this.fleshHeapUpgrades = 0; // Flesh Heap upgrades (+10 HP per purchase, shows on E skill)

        // Headshot flag
        this.headshotJustHappened = false;
        // Deny flag
        this.deniedJustHappened = false;
        // Was denied (saved after death for client visualization)
        this.wasDenied = false;
        // First Blood flag (for notification)
        this.firstBlood = false;

        // Robust death processing flag (Phase 15 fix)
        this.isDeathProcessed = false;

        // WC3 Status effects
        this.invulnerableTimer = 0;
        this.isHealing = false;
        this.shieldRadius = 25;

        // Passive HP regen
        this.hpRegen = GAME.CHAR_HP_REGEN;

        // === FLESH HEAP (WC3 Pudge Wars Passive) ===
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

        // Phase 17 Status effects
        this.burnTimer = 0;
        this.ruptureTimer = 0;

        // Active Items
        this.salveTimer = 0;

        // WC3 Hook Lock
        this.isPaused = false;

        // Ensure stats are correct after all properties are initialized
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
        this.fleshHeapStacks++;
        this.recalculateStats();
        this.hp = Math.min(this.hp + this.fleshHeapHpPerStack, this.maxHp);
    }

    castHook(targetX, targetY, entityManager) {
        if (this.state !== State.DEAD && this.state !== State.HOOKED && this.hookCooldown <= 0) {
            this.hookCooldown = this.maxHookCooldown;
            const hook = new Hook(this, targetX, targetY);
            entityManager.add(hook);
        }
    }

    takeDamage(amount, attacker = null) {
        if (this.state === State.DEAD || this.invulnerableTimer > 0) return;

        this.salveTimer = 0;

        if (attacker && attacker !== this) {
            this.lastAttacker = attacker.owner || attacker;
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
        this.hp = this.maxHp;
        
        // Set callback for level up particles (called on client)
        if (this.onLevelUp) {
            this.onLevelUp(this.x, this.y);
        }
    }

    die() {
        this.state = State.DEAD;
        this.respawnTimer = this.respawnDelay;
        this.rotActive = false;
        // Save deny state for client visualization (will be reset by server after broadcast)
        this.wasDenied = this.deniedJustHappened;
        console.log(`[Character.die] Player ${this.id} died, wasDenied=${this.wasDenied}, deniedJustHappened=${this.deniedJustHappened}`);
    }

    respawn() {
        this.recalculateStats();
        this.hp = this.maxHp;
        this.state = State.IDLE;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.targetX = this.spawnX;
        this.targetY = this.spawnY;
        this.isDeathProcessed = false;
        this.wasDenied = false; // Reset wasDenied on respawn

        this.burnTimer = 0;
        this.ruptureTimer = 0;
        this.invulnerableTimer = GAME.RESPAWN_DELAY;
    }

    update(dt, map, entityManager) {
        if (this.state === State.DEAD) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        // Cache previous position for Rupture calculation
        const px = this.x;
        const py = this.y;

        // 1. Movement
        this.updateMovement(dt, map);

        // 2. Timers
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        if (this.hasteTimer > 0) this.hasteTimer -= dt;
        if (this.ddTimer > 0) this.ddTimer -= dt;
        if (this.salveTimer > 0) {
            this.salveTimer -= dt;
            this.hp = Math.min(this.maxHp, this.hp + 20 * dt);
        }

        // 3. Status Effects (Phase 17)
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.takeDamage(15 * dt, this.lastAttacker);
        }

        if (this.ruptureTimer > 0) {
            this.ruptureTimer -= dt;
            const moveDist = Math.sqrt(Math.pow(this.x - px, 2) + Math.pow(this.y - py, 2));
            if (moveDist > 0.1) {
                this.takeDamage(moveDist * 0.25, this.lastAttacker);
            }
        }

        // 4. Rot Logic
        if (this.rotActive) {
            this.updateRot(dt, entityManager);
        } else {
            let currentRegen = this.hpRegen;
            if (this.isHealing) currentRegen += 15; // Fountain healing

            if (this.hp < this.maxHp) {
                this.hp = Math.min(this.maxHp, this.hp + currentRegen * dt);
            }
        }

        // 5. Cooldowns
        if (this.hookCooldown > 0) this.hookCooldown -= dt;

        // 6. Terrain checks
        if (map) {
            this.checkUnstuck(map);
        }
    }

    updateRot(dt, entityManager) {
        const rotDamage = this.rotSelfDamagePerSec * dt;
        if (this.hp - rotDamage <= 0 && this.state !== State.DEAD) {
            this.deniedJustHappened = true;
        }
        this.takeDamage(rotDamage);

        for (const entity of entityManager.entities) {
            if (entity === this || !entity.takeDamage || entity.state === State.DEAD || entity.team === this.team) continue;
            const dist = Math.sqrt(Math.pow(entity.x - this.x, 2) + Math.pow(entity.y - this.y, 2));
            if (dist < this.rotRadius) {
                entity.takeDamage(this.rotDamagePerSec * dt, this);
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

                const pushX = nx * overlap * 1.1;
                const pushY = ny * overlap * 1.1;
                this.x -= pushX;
                this.y -= pushY;
                entity.x += pushX;
                entity.y += pushY;
            }
        }
    }

    updateMovement(dt, map) {
        if (this.isPaused || this.state === State.HOOKED) return;

        if (this.state === State.MOVING) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                let actualSpeed = this.hasteTimer > 0 ? this.speed * 1.8 : this.speed;
                if (this.rotActive) actualSpeed *= this.rotSlowFactor;

                const moveAmt = actualSpeed * dt;
                const dirX = dx / dist;
                const dirY = dy / dist;

                const nextX = this.x + dirX * moveAmt;
                const nextY = this.y + dirY * moveAmt;

                let canMove = true;
                if (map) {
                    const r = this.radius;
                    canMove = map.isWalkable(nextX - r, nextY - r) && map.isWalkable(nextX + r, nextY - r) &&
                        map.isWalkable(nextX - r, nextY + r) && map.isWalkable(nextX + r, nextY + r);
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
                    this.state = State.IDLE;
                }
            } else {
                this.state = State.IDLE;
            }
        }
    }

    checkUnstuck(map) {
        const r = this.radius;
        const isStuck = !map.isWalkable(this.x - r, this.y - r) || !map.isWalkable(this.x + r, this.y - r) ||
            !map.isWalkable(this.x - r, this.y + r) || !map.isWalkable(this.x + r, this.y + r);

        if (isStuck) {
            const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            for (let step = 16; step <= 128; step += 16) {
                for (const d of directions) {
                    const tx = this.x + d.x * step;
                    const ty = this.y + d.y * step;
                    if (map.isWalkable(tx - r, ty - r) && map.isWalkable(tx + r, ty - r) &&
                        map.isWalkable(tx - r, ty + r) && map.isWalkable(tx + r, ty + r)) {
                        this.x = tx; this.y = ty; return;
                    }
                }
            }
        }
    }

    serialize() {
        return {
            type: 'CHARACTER',
            id: this.id,
            x: this.x, y: this.y, z: this.z || 0,
            team: this.team,
            hp: this.hp, maxHp: this.maxHp,
            state: this.state,
            hookCooldown: this.hookCooldown,
            maxHookCooldown: this.maxHookCooldown,
            gold: this.gold,
            hookDamage: this.hookDamage,
            hookSpeed: this.hookSpeed,
            hookMaxDist: this.hookMaxDist,
            hookRadius: this.hookRadius,
            isHeadshot: this.headshotJustHappened,
            isDenied: this.wasDenied, // Use wasDenied (saved at death) instead of deniedJustHappened
            killedByMine: this.killedByMine || false,
            lastAttackerTeam: this.lastAttacker ? this.lastAttacker.team : null,
            firstBlood: this.firstBlood || false,
            rotActive: this.rotActive,
            fleshHeapStacks: this.fleshHeapStacks || 0,
            fleshHeapUpgrades: this.fleshHeapUpgrades || 0,
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
            salveTimer: this.salveTimer || 0,
            speed: this.speed,
        };
    }

    recalculateStats() {
        this.speed = GAME.CHAR_SPEED;
        this.maxHp = 100 + (this.level - 1) * 15;
        this.hookDamage = GAME.HOOK_DAMAGE + (this.level - 1) * 3;
        this.hookSpeed = GAME.HOOK_SPEED + (this.level - 1) * 25;
        this.hookMaxDist = GAME.HOOK_MAX_DIST + (this.level - 1) * 100;
        this.hookRadius = GAME.HOOK_RADIUS + (this.level - 1) * 2;

        // Reset Item/Upgrade stats before re-applying
        this.hookBounces = 0;
        this.hasBurn = false;
        this.hasRupture = false;
        this.hasLifesteal = false;

        this.hookDamage += (this.dmgUpgrades || 0) * 10;
        this.hookSpeed += (this.spdUpgrades || 0) * 50;
        this.hookMaxDist += (this.distUpgrades || 0) * 50;
        this.hookRadius += (this.radUpgrades || 0) * 5;
        
        // Move Speed upgrades
        this.speed += (this.moveSpeedUpgrades || 0) * 10;

        // Flesh Heap upgrades (+10 HP per purchase) + stacks from kills
        this.maxHp += (this.fleshHeapUpgrades || 0) * 10;
        this.maxHp += (this.fleshHeapStacks || 0) * (this.fleshHeapHpPerStack || 8);

        for (const item of this.items || []) {
            if (item.effect === 'speed') this.speed += 40;
            if (item.effect === 'bounce') this.hookBounces++;
            if (item.effect === 'burn') this.hasBurn = true;
            if (item.effect === 'rupture') this.hasRupture = true;
            if (item.effect === 'lifesteal') this.hasLifesteal = true;
        }
    }
}
