import { Camera } from '../engine/Camera.js';
import { GameMap } from '../engine/GameMap.js';
import { UIManager } from '../ui/UIManager.js';
import { Character } from './Character.js';
import { Hook } from './Hook.js';
import { Barricade } from './Barricade.js';
import { ParticleSystem } from '../engine/ParticleSystem.js';
import { FloatingTextManager } from '../engine/FloatingText.js';
import { KillFeed } from '../ui/KillFeed.js';
import { GAME } from '../shared/GameConstants.js';

export class MainScene {
    constructor(game) {
        this.game = game;

        this.map = new GameMap(GAME.MAP_WIDTH, GAME.MAP_HEIGHT, GAME.TILE_SIZE);
        this.camera = new Camera(0, 0, 1);
        this.ui = new UIManager(game);

        this.serverState = null;
        this.localEntities = [];
        this.localPlayer = null;
        this.enemies = []; // All enemy characters (for 5v5)

        this.particles = new ParticleSystem();
        this.floatingTexts = new FloatingTextManager();
        this.killFeed = new KillFeed();

        // Track previous states
        this._prevAliveStates = new Map();
        this._prevHp = new Map();
        this._firstBloodDone = false;
    }

    init() { }
    destroy() { }

    onServerState(data) {
        this.serverState = data;

        this.localEntities = [];
        this.localPlayer = null;
        this.enemies = [];

        const myTeam = this.game.network.team;

        for (const eData of data.entities) {
            if (eData.type === 'CHARACTER') {
                const char = new Character(eData.x, eData.y, eData.team);
                char.id = eData.id;
                char.hp = eData.hp;
                char.maxHp = eData.maxHp;
                char.state = eData.state;
                char.hookCooldown = eData.hookCooldown;
                char.maxHookCooldown = eData.maxHookCooldown;
                char.gold = eData.gold;
                char.hookDamage = eData.hookDamage;
                char.hookSpeed = eData.hookSpeed;
                char.hookMaxDist = eData.hookMaxDist;
                char.hookRadius = eData.hookRadius;
                char.isHeadshot = eData.isHeadshot;
                char.rotActive = eData.rotActive;
                char.items = eData.items || [];
                char.level = eData.level || 1;
                char.xp = eData.xp || 0;
                char.xpToLevel = eData.xpToLevel || 100;
                char.burnTimer = eData.burnTimer || 0;
                char.ruptureTimer = eData.ruptureTimer || 0;
                char.invulnerableTimer = eData.invulnerableTimer || 0;
                char.isHealing = eData.isHealing || false;

                this.localEntities.push(char);

                // Match local player by ID (in 5v5, multiple chars share a team)
                if (eData.id === this.game.network.ws?.playerId || char.team === myTeam) {
                    // Screen shake: compare HP to previous frame
                    const prevHp = this._prevHp.get(eData.id);
                    if (prevHp !== undefined && eData.hp < prevHp && !this.localPlayer) {
                        this.camera.shake(8);
                    }
                    if (!this.localPlayer) {
                        this.localPlayer = char;
                    }
                    this._prevHp.set(eData.id, eData.hp);
                } else {
                    this.enemies.push(char);
                }
            } else if (eData.type === 'HOOK') {
                const owner = this.localEntities.find(c => c.id === eData.ownerId);
                if (owner) {
                    const hook = new Hook(owner, eData.x, eData.y);
                    hook.x = eData.x;
                    hook.y = eData.y;
                    hook.radius = eData.radius;

                    // Top-down hook rendering
                    hook.render = function (renderer) {
                        const ctx = renderer.ctx;
                        const ox = this.owner.x;
                        const oy = this.owner.y;
                        const hx = this.x;
                        const hy = this.y;

                        // Chain
                        ctx.strokeStyle = '#aaaaaa';
                        ctx.lineWidth = 3;
                        ctx.setLineDash([8, 6]);
                        ctx.beginPath();
                        ctx.moveTo(ox, oy);
                        ctx.lineTo(hx, hy);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // Hook blade
                        ctx.fillStyle = '#666';
                        ctx.strokeStyle = '#222';
                        ctx.lineWidth = 2;

                        const angle = Math.atan2(hy - oy, hx - ox);

                        ctx.save();
                        ctx.translate(hx, hy);
                        ctx.rotate(angle);

                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(15, -10);
                        ctx.lineTo(25, -5);
                        ctx.lineTo(15, 0);
                        ctx.lineTo(25, 10);
                        ctx.lineTo(15, 5);
                        ctx.lineTo(0, 10);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();

                        ctx.restore();
                    };

                    this.localEntities.push(hook);
                }
            } else if (eData.type === 'BARRICADE') {
                const barricade = new Barricade(eData.x, eData.y, eData.team);
                barricade.id = eData.id;
                barricade.hp = eData.hp;
                barricade.maxHp = eData.maxHp;
                barricade.state = eData.state;
                this.localEntities.push(barricade);
            }
        }

        // Floating text tracking
        this.floatingTexts.trackEntities(this.localEntities, this.particles);

        // Kill feed tracking
        for (const eData of data.entities) {
            if (eData.type === 'CHARACTER') {
                const wasAlive = this._prevAliveStates.get(eData.id);
                const isDead = eData.state === 'dead';

                if (wasAlive && isDead) {
                    const victimTeam = eData.team;
                    const killerTeam = victimTeam === 'red' ? 'blue' : 'red';

                    if (eData.isDenied) {
                        this.killFeed.addDeny(eData.team, victimTeam);
                    } else if (!this._firstBloodDone) {
                        this.killFeed.addFirstBlood(killerTeam);
                        this._firstBloodDone = true;
                    } else if (eData.isHeadshot) {
                        this.killFeed.addKill(killerTeam, victimTeam, true);
                    } else {
                        this.killFeed.addKill(killerTeam, victimTeam);
                    }
                }

                this._prevAliveStates.set(eData.id, !isDead);
            }
        }
    }

    update(dt) {
        if (this.serverState && this.serverState.rules.isGameOver) {
            if (this.game.input.isKeyPressed('KeyR')) {
                location.reload();
            }
            return;
        }

        const mousePos = this.game.input.getMousePosition();
        const cx = this.game.canvas.width / 2;
        const cy = this.game.canvas.height / 2;

        // Top-down mouse-to-world
        const worldX = mousePos.x - cx + this.camera.x;
        const worldY = mousePos.y - cy + this.camera.y;

        // ============================================
        // WC3 PUDGE WARS CONTROLS
        // Left-click  = Hook (throw toward cursor)
        // Right-click  = Move (walk to cursor)
        // Q            = Hook (alternative)
        // W            = Toggle Rot
        // E            = Barricade
        // B            = Toggle Shop
        // 1-4          = Stat Upgrades
        // Z,X,C,V,D,F  = Active Items
        // ============================================

        // Move (right-click — WC3 standard)
        if (this.game.input.isMouseButtonPressed(2)) {
            this.game.network.sendInput({ type: 'MOVE', x: worldX, y: worldY });
        }

        // Left-click: Hook OR shop buy
        if (this.game.input.isMouseButtonPressed(0)) {
            if (this.ui.shopOpen) {
                // If shop is open, try to buy the clicked item
                const clickedItemId = this.ui.getClickedShopItem(mousePos.x, mousePos.y);
                if (clickedItemId) {
                    this.game.network.sendInput({ type: 'BUY_ITEM', itemId: clickedItemId });
                }
            } else {
                // Otherwise — HOOK! (WC3 Pudge Wars: left-click = hook)
                this.game.network.sendInput({ type: 'HOOK', x: worldX, y: worldY });
            }
        }

        // Hook alternative (Q key — for accessibility)
        if (this.game.input.isKeyPressed('KeyQ')) {
            this.game.network.sendInput({ type: 'HOOK', x: worldX, y: worldY });
        }

        // Rot Toggle (W)
        if (this.game.input.isKeyPressed('KeyW')) {
            this.game.network.sendInput({ type: 'ROT' });
        }

        // Barricade (E)
        if (this.game.input.isKeyPressed('KeyE')) {
            this.game.network.sendInput({ type: 'BARRICADE' });
        }

        // Shop Upgrades (1-4)
        if (this.game.input.isKeyPressed('Digit1')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DAMAGE' });
        if (this.game.input.isKeyPressed('Digit2')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'SPEED' });
        if (this.game.input.isKeyPressed('Digit3')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DISTANCE' });
        if (this.game.input.isKeyPressed('Digit4')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'RADIUS' });

        // Item Usage (Z, X, C, V, D, F)
        const itemKeys = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyD', 'KeyF'];
        for (let i = 0; i < 6; i++) {
            if (this.game.input.isKeyPressed(itemKeys[i])) {
                this.game.network.sendInput({ type: 'USE_ITEM', slot: i, x: worldX, y: worldY });
            }
        }

        // Shop toggle (B key)
        if (this.game.input.isKeyPressed('KeyB')) {
            this.ui.shopOpen = !this.ui.shopOpen;
        }

        // Camera follow
        if (this.localPlayer) {
            this.camera.x += (this.localPlayer.x - this.camera.x) * 10 * dt;
            this.camera.y += (this.localPlayer.y - this.camera.y) * 10 * dt;
        }

        this.particles.update(dt);
        this.floatingTexts.update(dt);
        this.killFeed.update(dt);
        this.camera.update(dt);
    }

    render(renderer) {
        this.camera.apply(renderer);

        this.map.render(renderer);

        // Render entities sorted by Y
        const sorted = [...this.localEntities].sort((a, b) => a.y - b.y);
        for (const entity of sorted) {
            if (entity.render) {
                entity.render(renderer);
            }
        }

        this.particles.render(renderer);
        this.floatingTexts.render(renderer);

        // Release camera BEFORE fog of war (fog must be in screen coords)
        this.camera.release(renderer);

        // Fog of War — drawn in screen space after camera release
        if (this.localPlayer) {
            const cx = this.game.canvas.width / 2;
            const cy = this.game.canvas.height / 2;
            renderer.drawFogOfWar(cx, cy, 450);
        }

        // UI (screen space)
        if (this.serverState && this.localPlayer) {
            this.ui.render(renderer.ctx, this.serverState.rules, this.localPlayer, this.enemies[0]);
        }

        // Kill Feed (always on top)
        this.killFeed.render(renderer.ctx, this.game.canvas.width);
    }
}
