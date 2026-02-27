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

        // Размеры и скорость
        this.radius = 16;
        this.speed = 200;

        // WC3 Апгрейды и Экономика
        this.gold = 0;

        // Характеристики хука (прокачиваемые)
        this.hookDamage = 25;
        this.hookSpeed = 800;
        this.hookMaxDist = 600;
        this.hookRadius = 16;
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
            // Self damage
            this.takeDamage(this.rotSelfDamagePerSec * dt);

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
                const actualSpeed = this.rotActive ? this.speed * this.rotSlowFactor : this.speed;
                const moveAmt = actualSpeed * dt;
                const dirX = dx / dist;
                const dirY = dy / dist;

                const nextX = this.x + dirX * moveAmt;
                const nextY = this.y + dirY * moveAmt;

                if (map && map.isWalkable(nextX, nextY)) {
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

        const screenPos = renderer.worldToScreen(this.x, this.y, this.z);

        // Тень
        const groundPos = renderer.worldToScreen(this.x, this.y, 0);
        renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(groundPos.x, groundPos.y, 22, 11, 0, 0, Math.PI * 2);
        renderer.ctx.fill();

        // Тело (WC3 Pudge Style)
        renderer.ctx.save();
        renderer.ctx.translate(screenPos.x, screenPos.y - 15);

        // Rot AOE visual (green toxic cloud)
        if (this.rotActive) {
            const rotPulse = Math.sin(Date.now() / 200) * 0.15 + 0.3;
            renderer.ctx.fillStyle = `rgba(0, 200, 0, ${rotPulse})`;
            renderer.ctx.beginPath();
            renderer.ctx.arc(0, 5, 60, 0, Math.PI * 2);
            renderer.ctx.fill();
        }

        // Healing Fountain visual (green crosses / glow)
        if (this.isHealing) {
            const healPulse = Math.sin(Date.now() / 150) * 0.2 + 0.4;
            renderer.ctx.fillStyle = `rgba(0, 255, 100, ${healPulse})`;
            renderer.ctx.font = '20px Arial';
            renderer.ctx.fillText('+', Math.sin(Date.now() / 200) * 10, -30 + Math.cos(Date.now() / 200) * 5);
            renderer.ctx.fillText('+', Math.cos(Date.now() / 300) * 12, -45 + Math.sin(Date.now() / 300) * 8);
        }

        // Invulnerability Shield (blue bubble)
        if (this.invulnerableTimer > 0) {
            const shieldPulse = Math.sin(Date.now() / 100) * 0.1 + 0.4;
            const grad = renderer.ctx.createRadialGradient(0, 0, 5, 0, 0, this.shieldRadius);
            grad.addColorStop(0, 'rgba(100, 200, 255, 0)');
            grad.addColorStop(1, `rgba(100, 200, 255, ${shieldPulse})`);

            renderer.ctx.fillStyle = grad;
            renderer.ctx.beginPath();
            renderer.ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2);
            renderer.ctx.fill();

            renderer.ctx.strokeStyle = `rgba(150, 220, 255, ${shieldPulse + 0.2})`;
            renderer.ctx.lineWidth = 2;
            renderer.ctx.stroke();
        }

        // Подсветка команды (аура под ногами)
        renderer.ctx.strokeStyle = this.team === 'red' ? 'rgba(255,0,0,0.3)' : 'rgba(0,0,255,0.3)';
        renderer.ctx.lineWidth = 3;
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(0, 15, 20, 10, 0, 0, Math.PI * 2);
        renderer.ctx.stroke();

        // Туловище (массивное)
        renderer.ctx.fillStyle = this.color;
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.strokeStyle = '#000';
        renderer.ctx.lineWidth = 1.5;
        renderer.ctx.stroke();

        // Голова
        renderer.ctx.fillStyle = '#664444';
        renderer.ctx.beginPath();
        renderer.ctx.arc(0, -20, 10, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.stroke();

        // Руки
        renderer.ctx.fillStyle = this.color;
        // Левая рука
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(-20, 0, 8, 12, Math.PI / 4, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.stroke();
        // Right arm
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(20, 0, 8, 12, -Math.PI / 4, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.stroke();

        // Butcher Cleaver (Right hand)
        renderer.ctx.save();
        renderer.ctx.translate(25, 0);
        renderer.ctx.rotate(-Math.PI / 6);
        renderer.ctx.fillStyle = '#999';
        renderer.ctx.strokeStyle = '#444';
        renderer.ctx.lineWidth = 1;

        // Blade
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(0, 0);
        renderer.ctx.lineTo(8, -25);
        renderer.ctx.lineTo(25, -22);
        renderer.ctx.lineTo(22, 5);
        renderer.ctx.closePath();
        renderer.ctx.fill();
        renderer.ctx.stroke();

        // Handle
        renderer.ctx.fillStyle = '#4a2c15';
        renderer.ctx.fillRect(-2, 0, 4, 15);
        renderer.ctx.restore();

        renderer.ctx.restore();

        // === HP Bar above character (visible for ALL players) ===
        const hpBarW = 50;
        const hpBarH = 6;
        const hpBarX = screenPos.x - hpBarW / 2;
        const hpBarY = screenPos.y - 55;

        // Background
        renderer.ctx.fillStyle = '#330000';
        renderer.ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

        // Fill
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        const hpColor = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#cccc00' : '#cc0000';
        renderer.ctx.fillStyle = hpColor;
        renderer.ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);

        // Border
        renderer.ctx.strokeStyle = '#000';
        renderer.ctx.lineWidth = 1;
        renderer.ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

        // Level badge
        renderer.ctx.fillStyle = '#ffd700';
        renderer.ctx.font = 'bold 10px Arial';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText(`Lv.${this.level}`, screenPos.x, hpBarY - 3);

        // Burn indicator
        if (this.burnTimer && this.burnTimer > 0) {
            renderer.ctx.fillStyle = '#ff4400';
            renderer.ctx.font = 'bold 9px Arial';
            renderer.ctx.fillText('🔥', screenPos.x + 30, hpBarY + 5);
        }

        // Rupture indicator
        if (this.ruptureTimer && this.ruptureTimer > 0) {
            renderer.ctx.fillStyle = '#cc0000';
            renderer.ctx.font = 'bold 9px Arial';
            renderer.ctx.fillText('🩸', screenPos.x - 30, hpBarY + 5);
        }
    }
}
