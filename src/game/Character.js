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

        // Barricade ability
        this.barricadeCooldown = 0;
        this.maxBarricadeCooldown = 15; // 15 seconds

        // Passive HP regen
        this.hpRegen = 2; // HP per second

        // XP / Level system
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = 100;
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

    castBarricade(entityManager, BarricadeClass) {
        if (this.state !== State.DEAD && this.barricadeCooldown <= 0) {
            this.barricadeCooldown = this.maxBarricadeCooldown;
            // Place barricade 40 pixels in front of the character based on current movement or just at coordinates
            // Since we don't have mouse pos here without targetX, we just place it at (x, y)
            const barricade = new BarricadeClass(this.x, this.y, this.team);
            entityManager.add(barricade);
        }
    }

    castHook(targetX, targetY, entityManager) {
        if (this.state !== State.DEAD && this.state !== State.HOOKED && this.hookCooldown <= 0) {
            // Don't lock state to CASTING — allow movement while hook flies
            this.hookCooldown = this.maxHookCooldown;

            const hook = new Hook(this, targetX, targetY);
            entityManager.add(hook);
        }
    }

    takeDamage(amount) {
        if (this.state === State.DEAD || this.invulnerableTimer > 0) return;

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

        // 3 sec of invulnerability after respawn
        this.invulnerableTimer = 3;
    }

    update(dt, map, entityManager) {
        // Обновляем кулдауны
        if (this.hookCooldown > 0) {
            this.hookCooldown -= dt;
        }
        if (this.barricadeCooldown > 0) {
            this.barricadeCooldown -= dt;
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

    render(renderer) {
        if (this.state === State.DEAD) return;

        const ctx = renderer.ctx;
        const sx = this.x;
        const sy = this.y;

        ctx.save();
        ctx.translate(sx, sy);

        // Rot AOE visual (green toxic cloud, top-down circle)
        if (this.rotActive) {
            const rotPulse = Math.sin(Date.now() / 200) * 0.15 + 0.25;
            ctx.fillStyle = `rgba(0, 180, 0, ${rotPulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        // WC3 Selection circle (team color)
        ctx.strokeStyle = this.team === 'red' ? 'rgba(255,50,50,0.7)' : 'rgba(50,50,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Body (top-down circle with team color)
        ctx.fillStyle = this.team === 'red' ? '#993333' : '#333399';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner body detail (flesh color for Pudge)
        ctx.fillStyle = '#886655';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Head (small darker circle on top)
        ctx.fillStyle = '#664444';
        ctx.beginPath();
        ctx.arc(0, -6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Arms/Shoulders
        ctx.fillStyle = this.team === 'red' ? '#884444' : '#444488';
        ctx.fillRect(-18, -4, 8, 8);
        ctx.fillRect(10, -4, 8, 8);

        // Cleaver in right hand
        ctx.save();
        ctx.translate(16, -3);
        ctx.rotate(-0.5);
        ctx.fillStyle = '#aaa';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(4, -12);
        ctx.lineTo(12, -10);
        ctx.lineTo(10, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4a2c15';
        ctx.fillRect(-1, 0, 3, 8);
        ctx.restore();

        // Healing visual
        if (this.isHealing) {
            const hPulse = Math.sin(Date.now() / 150) * 0.2 + 0.5;
            ctx.fillStyle = `rgba(0, 255, 100, ${hPulse})`;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('+', Math.sin(Date.now() / 200) * 6, -18);
        }

        // Invulnerability Shield
        if (this.invulnerableTimer > 0) {
            const sp = Math.sin(Date.now() / 100) * 0.1 + 0.35;
            ctx.strokeStyle = `rgba(100, 200, 255, ${sp + 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // === HP Bar above character ===
        const hpBarW = 40;
        const hpBarH = 5;
        const hpBarX = sx - hpBarW / 2;
        const hpBarY = sy - 28;

        ctx.fillStyle = '#330000';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

        const hpRatio = Math.max(0, this.hp / this.maxHp);
        const hpColor = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#cccc00' : '#cc0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

        // Level badge
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${this.level}`, sx, hpBarY - 2);

        // Burn indicator
        if (this.burnTimer && this.burnTimer > 0) {
            ctx.fillStyle = '#ff4400';
            ctx.font = '9px Arial';
            ctx.fillText('🔥', sx + 24, hpBarY + 4);
        }

        // Rupture indicator
        if (this.ruptureTimer && this.ruptureTimer > 0) {
            ctx.fillStyle = '#cc0000';
            ctx.font = '9px Arial';
            ctx.fillText('🩸', sx - 24, hpBarY + 4);
        }
    }
}
