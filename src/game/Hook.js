import { State } from '../engine/State.js';

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

        this.currentDist = 0;
        this.isReturning = false;

        // Кого зацепили
        this.hookedEntity = null;
    }

    update(dt, map, entityManager) {
        if (this.owner.state === State.DEAD) {
            // Если владелец умер - хук пропадает
            entityManager.remove(this);
            if (this.hookedEntity) {
                this.hookedEntity.state = State.IDLE;
            }
            return;
        }

        const moveAmt = this.speed * dt;

        if (!this.isReturning) {
            // Искривление хука (Hook Curving)
            // Если владелец движется, часть его вектора передается летящему хуку
            if (this.owner.state === State.MOVING) {
                const ox = this.owner.targetX - this.owner.x;
                const oy = this.owner.targetY - this.owner.y;
                const oDist = Math.sqrt(ox * ox + oy * oy);
                if (oDist > 0) {
                    const odx = ox / oDist;
                    const ody = oy / oDist;

                    // Плавно меняем вектор направления хука
                    this.dirX += odx * this.owner.hookCurvePower * dt;
                    this.dirY += ody * this.owner.hookCurvePower * dt;

                    // Нормализуем чтобы скорость не менялась
                    const nlen = Math.sqrt(this.dirX * this.dirX + this.dirY * this.dirY);
                    this.dirX /= nlen;
                    this.dirY /= nlen;
                }
            }

            // Летим вперед
            this.x += this.dirX * moveAmt;
            this.y += this.dirY * moveAmt;
            this.currentDist += moveAmt;

            // 1. Проверка на дальность
            if (this.currentDist >= this.maxDist) {
                this.isReturning = true;
            }

            // 2. Проверка столкновения со стеной (isHookable == false)
            const tile = map.getTileAt(this.x, this.y);
            if (tile && !tile.isHookable) {
                this.isReturning = true;
            }

            // 3. Столкновение с другими энтити
            if (!this.isReturning) {
                for (const entity of entityManager.entities) {
                    if (entity === this || entity === this.owner) continue;

                    if (entity instanceof Hook) {
                        // Hook BOUNCING - Хуки столкнулись!
                        if (!entity.isReturning) {
                            const edx = entity.x - this.x;
                            const edy = entity.y - this.y;
                            const edist = Math.sqrt(edx * edx + edy * edy);

                            // Расширенный хитбокс для звона хуков
                            if (edist < this.radius + entity.radius + 10) {
                                this.isReturning = true;
                                entity.isReturning = true;
                                // Эффекты/Звуки можно было бы вызывать здесь
                                break;
                            }
                        }
                    } else if (entity.state !== State.DEAD && entity.takeDamage) {
                        // Попали в пуджа
                        const edx = entity.x - this.x;
                        const edy = entity.y - this.y;
                        const edist = Math.sqrt(edx * edx + edy * edy);

                        // WC3 Hook Radius logic
                        if (edist < this.radius + entity.radius) {
                            this.isReturning = true;
                            this.hookedEntity = entity;
                            entity.state = State.HOOKED;
                            entity.takeDamage(this.owner.hookDamage);

                            // Начисляем золото за точный хук
                            this.owner.gold += 10;

                            // Если убил хуком
                            if (entity.state === State.DEAD) {
                                this.owner.gold += 50;
                            }

                            break;
                        }
                    }
                }
            }
        } else {
            // Возвращаемся к владельцу
            const rdx = this.owner.x - this.x;
            const rdy = this.owner.y - this.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);

            // Если привязанная сущность умерла в полете от чего-то еще (не от хука)
            if (this.hookedEntity && this.hookedEntity.state === State.DEAD) {
                this.hookedEntity = null;
            }

            if (rdist <= moveAmt) {
                // Хук вернулся
                this.owner.state = State.IDLE; // Владелец может двигаться дальше

                if (this.hookedEntity) {
                    this.hookedEntity.x = this.owner.x + this.dirX * (this.owner.radius + this.hookedEntity.radius + 5);
                    this.hookedEntity.y = this.owner.y + this.dirY * (this.owner.radius + this.hookedEntity.radius + 5);
                    this.hookedEntity.state = State.IDLE;
                }

                entityManager.remove(this);
            } else {
                // Движемся назад
                const rDirX = rdx / rdist;
                const rDirY = rdy / rdist;

                this.x += rDirX * moveAmt;
                this.y += rDirY * moveAmt;

                // Тащим привязанного
                if (this.hookedEntity) {
                    this.hookedEntity.x = this.x;
                    this.hookedEntity.y = this.y;
                }
            }
        }
    }

    render(renderer) {
        const pOwner = renderer.worldToScreen(this.owner.x, this.owner.y, 10);
        const pHook = renderer.worldToScreen(this.x, this.y, 10);

        // Рисуем цепь (tether)
        renderer.ctx.strokeStyle = '#888';
        renderer.ctx.lineWidth = 2;
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(pOwner.x, pOwner.y - 20); // Из центра владельца
        renderer.ctx.lineTo(pHook.x, pHook.y - 20); // В центр хука
        renderer.ctx.stroke();

        // Рисуем сам хук (головка)
        renderer.ctx.fillStyle = '#ccc';
        renderer.ctx.beginPath();
        renderer.ctx.arc(pHook.x, pHook.y - 20, 8, 0, Math.PI * 2);
        renderer.ctx.fill();
        renderer.ctx.strokeStyle = '#000';
        renderer.ctx.stroke();
    }
}
