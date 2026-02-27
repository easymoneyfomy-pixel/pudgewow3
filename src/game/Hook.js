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

        // Position tracking for curving/delta movement
        this.ownerPrevX = owner.x;
        this.ownerPrevY = owner.y;
        this.pathNodes = []; // List of breadcrumbs {x, y} for polyline chain
    }

    update(dt, map, entityManager) {
        if (this.owner.state === State.DEAD) {
            // Owner died — release any hooked entity
            this.owner.isPaused = false;
            entityManager.remove(this);
            if (this.hookedEntity) {
                if (this.hookedEntity.onDropped) {
                    this.hookedEntity.onDropped();
                } else {
                    this.hookedEntity.state = State.IDLE;
                }
            }
            return;
        }

        const moveAmt = this.speed * dt;

        // Delta shift prep
        const pdx = this.owner.x - this.ownerPrevX;
        const pdy = this.owner.y - this.ownerPrevY;
        this.ownerPrevX = this.owner.x;
        this.ownerPrevY = this.owner.y;

        const wasReturning = this.isReturning;

        if (!this.isReturning) {
            // Forward flight: Delta shift the hook head if Pudge is moved externally
            this.x += pdx;
            this.y += pdy;

            // Искривление хука (Hook Curving) - subtle influence from click direction
            if (this.owner.state === State.MOVING) {
                const ox = this.owner.targetX - this.owner.x;
                const oy = this.owner.targetY - this.owner.y;
                const oDist = Math.sqrt(ox * ox + oy * oy);
                if (oDist > 0) {
                    const odx = ox / oDist;
                    const ody = oy / oDist;

                    this.dirX += odx * this.owner.hookCurvePower * dt;
                    this.dirY += ody * this.owner.hookCurvePower * dt;

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
                this.owner.isPaused = false; // RELEASE LOCK ON RETRACTION
            }

            // 2. Проверка столкновения со стеной (isHookable == false)
            const tile = map.getTileAt(this.x, this.y);
            if (tile && !tile.isHookable) {
                this.isReturning = true;
                this.owner.isPaused = false; // RELEASE LOCK ON CLINK
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
                            const edistSq = edx * edx + edy * edy;

                            // Расширенный хитбокс для звона хуков (Optimized)
                            const rSum = this.radius + entity.radius + 10;
                            if (edistSq < rSum * rSum) {
                                this.isReturning = true;
                                this.owner.isPaused = false; // RELEASE LOCK ON CLANG
                                entity.isReturning = true;
                                entity.owner.isPaused = false;
                                // Эффекты/Звуки можно было бы вызывать здесь
                                break;
                            }
                        }
                    } else if (entity.state !== State.DEAD && entity.takeDamage) {
                        // Попали в пуджа (Optimized distance check)
                        const edx = entity.x - this.x;
                        const edy = entity.y - this.y;
                        const edistSq = edx * edx + edy * edy;

                        // WC3 Hook Radius logic
                        const rSum = this.radius + entity.radius;
                        if (edistSq < rSum * rSum) {

                            if (entity.type === 'LANDMINE') {
                                this.isReturning = true;
                                this.owner.isPaused = false; // RELEASE LOCK ON HIT
                                this.hookedEntity = entity;
                                entity.state = State.HOOKED;
                                entity.isBeingHooked = true;
                                entity._hookOwner = this.owner; // exclude owner from detonation while towing
                                break;
                            }

                            if (entity.state === State.HOOKED) {
                                // HEADSHOT! (Instakill)
                                this.isReturning = true;
                                this.owner.isPaused = false; // RELEASE LOCK ON HIT
                                entity.takeDamage(9999); // Force kill
                                // If it wasn't an ally headshot
                                if (entity.team !== this.owner.team) {
                                    this.owner.gold += GAME.GOLD_ON_HEADSHOT;
                                    if (this.owner.gainXp) this.owner.gainXp(GAME.XP_ON_HEADSHOT); // Big XP for headshot
                                }
                                entity.headshotJustHappened = true; // Flag for client
                            } else {
                                this.isReturning = true;
                                this.owner.isPaused = false; // RELEASE LOCK ON HIT
                                this.hookedEntity = entity;
                                entity.state = State.HOOKED;

                                const isAlly = entity.team === this.owner.team;

                                // Calculate total damage (including Barathrum's Lantern)
                                let totalHitDamage = this.owner.hookDamage;
                                if (this.hasLantern) {
                                    // Lantern adds 10% of hook speed as bonus damage
                                    totalHitDamage += Math.floor(this.speed * 0.1);
                                }

                                // WC3 Mechanic: Double Damage Rune
                                if (this.owner.ddTimer > 0) {
                                    totalHitDamage *= 2;
                                }

                                // WC3 Mechanic: Ally Deny via Hook
                                if (isAlly && entity.hp - totalHitDamage <= 0 && entity.state !== State.DEAD) {
                                    entity.deniedJustHappened = true;
                                }

                                entity.takeDamage(totalHitDamage, this.owner);

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

                                    // Если убил хуком (но НЕ миной — WC3 Pudge Wars)
                                    if (entity.state === State.DEAD && !entity.killedByMine) {
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
            } // End of !this.isReturning

            if (!wasReturning && this.isReturning) {
                // Hook JUST started returning! Initialize breadcrumb path
                this.pathNodes = [{ x: this.owner.x, y: this.owner.y }];
            }

            if (this.isReturning) {
                // Если привязанная сущность умерла в полете от чего-то еще
                if (this.hookedEntity && this.hookedEntity.state === State.DEAD) {
                    this.hookedEntity = null;
                }

                if (this.isGrappling) {
                    // Прямой пулл владельца к хуку (без хлебных крошек)
                    const rdx = this.x - this.owner.x;
                    const rdy = this.y - this.owner.y;
                    const rdist = Math.sqrt(rdx * rdx + rdy * rdy);

                    if (rdist <= moveAmt) {
                        this.owner.state = State.IDLE;
                        this.owner.isPaused = false;
                        this.owner.x = this.x;
                        this.owner.y = this.y;
                        this.owner.setTarget(this.x, this.y);
                        entityManager.remove(this);
                    } else {
                        this.owner.x += (rdx / rdist) * moveAmt;
                        this.owner.y += (rdy / rdist) * moveAmt;
                        this.owner.setTarget(this.owner.x, this.owner.y);
                    }
                } else {
                    // 1. Drop breadcrumbs as Pudge moves
                    const lastNode = this.pathNodes[this.pathNodes.length - 1];
                    let lx = lastNode ? lastNode.x : this.owner.x;
                    let ly = lastNode ? lastNode.y : this.owner.y;

                    const dxToLast = this.owner.x - lx;
                    const dyToLast = this.owner.y - ly;
                    if (dxToLast * dxToLast + dyToLast * dyToLast >= 144) { // 12px threshold for smooth polyline
                        this.pathNodes.push({ x: this.owner.x, y: this.owner.y });
                    }

                    // 2. Retract hook head along pathNodes
                    let currentMoveAmt = moveAmt;

                    while (currentMoveAmt > 0) {
                        let targetNode = this.pathNodes.length > 0 ? this.pathNodes[0] : this.owner;

                        let rdx = targetNode.x - this.x;
                        let rdy = targetNode.y - this.y;
                        let rdist = Math.sqrt(rdx * rdx + rdy * rdy);

                        if (rdist <= currentMoveAmt) {
                            // Достигли ноды
                            this.x = targetNode.x;
                            this.y = targetNode.y;
                            currentMoveAmt -= rdist;

                            if (this.pathNodes.length > 0) {
                                this.pathNodes.shift(); // Съедаем крошку
                            } else {
                                // Полностью вернулись к владельцу
                                this.owner.state = State.IDLE;
                                this.owner.isPaused = false;

                                if (this.hookedEntity) {
                                    // Поправка позиции жертвы (чтобы не сливалась воедино)
                                    this.hookedEntity.x = this.owner.x + this.dirX * (this.owner.radius + this.hookedEntity.radius + 5);
                                    this.hookedEntity.y = this.owner.y + this.dirY * (this.owner.radius + this.hookedEntity.radius + 5);

                                    if (this.hookedEntity.onDropped) {
                                        this.hookedEntity.onDropped();
                                    } else {
                                        this.hookedEntity.state = State.IDLE;
                                    }
                                }

                                entityManager.remove(this);
                                break; // Выход из while
                            }
                        } else {
                            // Просто летим к ноде
                            this.x += (rdx / rdist) * currentMoveAmt;
                            this.y += (rdy / rdist) * currentMoveAmt;
                            currentMoveAmt = 0;
                        }
                    }

                    // 3. Тащим привязанного
                    if (this.hookedEntity && this.hookedEntity.state !== State.DEAD) {
                        this.hookedEntity.x = this.x;
                        this.hookedEntity.y = this.y;
                    }
                }
            }
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            type: 'HOOK',
            x: this.x,
            y: this.y,
            ownerId: this.owner.id,
            ownerX: this.owner.x,
            ownerY: this.owner.y,
            radius: this.radius,
            pathNodes: this.pathNodes.map(p => ({ x: p.x, y: p.y }))
        };
    }
}
