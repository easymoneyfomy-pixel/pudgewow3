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
    }

    setTarget(x, y) {
        if (this.state === State.IDLE || this.state === State.MOVING) {
            this.targetX = x;
            this.targetY = y;
            this.state = State.MOVING;
        }
    }

    castHook(targetX, targetY, entityManager) {
        if (this.state !== State.DEAD && this.state !== State.HOOKED && this.state !== State.CASTING && this.hookCooldown <= 0) {
            this.state = State.CASTING;
            this.hookCooldown = this.maxHookCooldown;

            // Спавним хук
            const hook = new Hook(this, targetX, targetY);
            entityManager.add(hook);
        }
    }

    takeDamage(amount) {
        if (this.state === State.DEAD) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
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
    }

    update(dt, map, entityManager) {
        // Обновляем кулдаун
        if (this.hookCooldown > 0) {
            this.hookCooldown -= dt;
        }

        if (this.state === State.DEAD) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return; // Мертвые не двигаются
        }

        if (this.state === State.HOOKED || this.state === State.CASTING) {
            // Во время каста или когда хукнут - цель обнуляется и не двигаемся сами
            this.targetX = this.x;
            this.targetY = this.y;
            return;
        }

        if (this.state === State.MOVING) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                const moveAmt = this.speed * dt;
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
        // Правая рука
        renderer.ctx.beginPath();
        renderer.ctx.ellipse(20, 0, 8, 12, -Math.PI / 4, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.stroke();

        renderer.ctx.restore();
    }
}
