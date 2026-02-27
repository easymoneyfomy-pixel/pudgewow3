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

        // Item effects from owner
        this.hasBurn = (owner.items || []).some(i => i.effect === 'burn');
        this.hasRupture = (owner.items || []).some(i => i.effect === 'rupture');
        this.hasGrapple = (owner.items || []).some(i => i.effect === 'grapple');
        this.hasLifesteal = (owner.items || []).some(i => i.effect === 'lifesteal');
        this.hasLantern = (owner.items || []).some(i => i.effect === 'lantern');

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
                if (this.hasGrapple) {
                    // GRAPPLING HOOK: Hook anchors to the wall and pulls the owner
                    this.isReturning = true;
                    this.isGrappling = true; // Special flag to pull owner
                    this.hookedEntity = null; // Can't hook entities while grappling
                } else if (this.bouncesLeft > 0) {
                    // WALL BOUNCE (Ricochet Turbine effect)
                    this.bouncesLeft--;

                    // Simple reflection: try to determine which axis to reflect
                    const tileLeft = map.getTileAt(this.x - 20, this.y);
                    const tileRight = map.getTileAt(this.x + 20, this.y);
                    const tileUp = map.getTileAt(this.x, this.y - 20);
                    const tileDown = map.getTileAt(this.x, this.y + 20);

                    // Reflect X if horizontal wall, else reflect Y
                    if ((tileLeft && !tileLeft.isHookable) || (tileRight && !tileRight.isHookable)) {
                        this.dirX = -this.dirX;
                    }
                    if ((tileUp && !tileUp.isHookable) || (tileDown && !tileDown.isHookable)) {
                        this.dirY = -this.dirY;
                    }

                    // Push slightly out of wall
                    this.x += this.dirX * 10;
                    this.y += this.dirY * 10;
                } else {
                    this.isReturning = true;
                }
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
                            if (entity.isBarricade) {
                                // Hit a barricade - bounce or return
                                if (this.bouncesLeft > 0) {
                                    this.bouncesLeft--;
                                    // Simple reflection based on relative position
                                    if (Math.abs(edx) > Math.abs(edy)) {
                                        this.dirX = -this.dirX;
                                    } else {
                                        this.dirY = -this.dirY;
                                    }

                                    this.x += this.dirX * 10;
                                    this.y += this.dirY * 10;
                                } else {
                                    this.isReturning = true;
                                }
                                entity.takeDamage(this.owner.hookDamage);
                                break;
                            }

                            if (entity.type === 'LANDMINE') {
                                this.isReturning = true;
                                this.hookedEntity = entity;
                                entity.state = State.HOOKED;
                                entity.isBeingHooked = true;
                                break;
                            }

                            if (entity.state === State.HOOKED) {
                                // HEADSHOT! (Instakill)
                                this.isReturning = true;
                                entity.takeDamage(9999); // Force kill
                                // If it wasn't an ally headshot
                                if (entity.team !== this.owner.team) {
                                    this.owner.gold += GAME.GOLD_ON_HEADSHOT;
                                    if (this.owner.gainXp) this.owner.gainXp(GAME.XP_ON_HEADSHOT); // Big XP for headshot
                                }
                                entity.headshotJustHappened = true; // Flag for client
                            } else {
                                this.isReturning = true;
                                this.hookedEntity = entity;
                                entity.state = State.HOOKED;

                                const isAlly = entity.team === this.owner.team;

                                // Calculate total damage (including Barathrum's Lantern)
                                let totalHitDamage = this.owner.hookDamage;
                                if (this.hasLantern) {
                                    // Lantern adds 10% of hook speed as bonus damage
                                    totalHitDamage += Math.floor(this.speed * 0.1);
                                }

                                entity.takeDamage(totalHitDamage);

                                if (!isAlly) {
                                    // Flaming Hook: Apply burn DOT
                                    if (this.hasBurn) {
                                        entity.burnTimer = 3; // 3 seconds of burn
                                        entity.burnDps = 8; // 8 DPS burn
                                    }

                                    // Strygwyr's Claws: Apply rupture
                                    if (this.hasRupture) {
                                        entity.ruptureTimer = 4; // 4 seconds
                                        entity.ruptureDps = 12; // DPS when moving
                                    }

                                    // Naix Jaws: Lifesteal
                                    if (this.hasLifesteal) {
                                        this.owner.hp = Math.min(this.owner.hp + 20, this.owner.maxHp);
                                    }

                                    // Начисляем золото за точный хук
                                    this.owner.gold += GAME.GOLD_ON_HIT;
                                    if (this.owner.gainXp) this.owner.gainXp(GAME.XP_ON_HIT); // XP for hit

                                    // Если убил хуком
                                    if (entity.state === State.DEAD) {
                                        this.owner.gold += GAME.GOLD_ON_KILL;
                                        if (this.owner.gainXp) this.owner.gainXp(GAME.XP_ON_KILL); // Bonus XP for kill
                                    }
                                } else {
                                    // Ally block/deny
                                    if (entity.state === State.DEAD) {
                                        // DENY!
                                        entity.deniedJustHappened = true;
                                    }
                                }
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
                // Хук вернулся (или мы притянулись)
                this.owner.state = State.IDLE; // Владелец может двигаться дальше

                if (this.isGrappling) {
                    // Owner arrived at the grapple point
                    this.owner.x = this.x;
                    this.owner.y = this.y;
                    this.owner.setTarget(this.x, this.y);
                }

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

                if (this.isGrappling) {
                    // Pull the owner to the hook
                    this.owner.x -= rDirX * moveAmt;
                    this.owner.y -= rDirY * moveAmt;
                    this.owner.setTarget(this.owner.x, this.owner.y); // lock position
                } else {
                    // Hook returns to owner
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
    }

    render(renderer) {
        const ctx = renderer.ctx;

        // Chain
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.owner.x, this.owner.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        // Hook head
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }
}
