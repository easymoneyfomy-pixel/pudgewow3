import { Camera } from '../engine/Camera.js';
import { GameMap } from '../engine/GameMap.js';
import { UIManager } from '../ui/UIManager.js';
import { Character } from './Character.js';
import { Hook } from './Hook.js';
import { Barricade } from './Barricade.js';
import { ParticleSystem } from '../engine/ParticleSystem.js';
import { FloatingTextManager } from '../engine/FloatingText.js';
import { KillFeed } from '../ui/KillFeed.js';

export class MainScene {
    constructor(game) {
        this.game = game;

        this.map = new GameMap(24, 24, 64);
        this.camera = new Camera(0, 0, 1);
        this.ui = new UIManager(game);

        this.serverState = null;
        this.localEntities = [];
        this.localPlayer = null;
        this.localEnemy = null;

        this.particles = new ParticleSystem();
        this.floatingTexts = new FloatingTextManager();
        this.killFeed = new KillFeed();

        // Track previous HP states for kill detection
        this._prevAliveStates = new Map();
        this._firstBloodDone = false;
    }

    init() {
    }

    destroy() {
    }

    onServerState(data) {
        this.serverState = data;

        this.localEntities = [];
        this.localPlayer = null;
        this.localEnemy = null;

        for (const eData of data.entities) {
            if (eData.type === 'CHARACTER') {
                const char = new Character(eData.x, eData.y, eData.team);
                char.id = eData.id;
                char.hp = eData.hp;
                char.maxHp = eData.maxHp;
                char.state = eData.state;
                char.hookCooldown = eData.hookCooldown;
                char.maxHookCooldown = eData.maxHookCooldown;

                // Economics
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

                // Screen shake on hit (if local player takes damage)
                if (char.team === this.game.network.team && this.localPlayer) {
                    if (eData.hp < this.localPlayer.hp) {
                        this.camera.shake(8);
                    }
                }

                this.localEntities.push(char);

                if (char.team === this.game.network.team) {
                    this.localPlayer = char;
                } else {
                    this.localEnemy = char;
                }
            } else if (eData.type === 'HOOK') {
                const owner = this.localEntities.find(c => c.id === eData.ownerId);
                if (owner) {
                    const hook = new Hook(owner, eData.x, eData.y);
                    hook.x = eData.x;
                    hook.y = eData.y;
                    hook.radius = eData.radius; // Sync radius for drawing

                    // Переопределяем render для стилизованного хука
                    hook.render = function (renderer) {
                        const pOwner = renderer.worldToScreen(this.owner.x, this.owner.y, 20); // slightly higher
                        const pHook = renderer.worldToScreen(this.x, this.y, 10);

                        // 1. Draw Chain (segmented line with links)
                        renderer.ctx.strokeStyle = '#aaaaaa';
                        renderer.ctx.lineWidth = 3;
                        renderer.ctx.setLineDash([8, 6]); // Creates chain-link effect
                        renderer.ctx.beginPath();
                        renderer.ctx.moveTo(pOwner.x, pOwner.y);
                        renderer.ctx.lineTo(pHook.x, pHook.y);
                        renderer.ctx.stroke();
                        renderer.ctx.setLineDash([]); // Reset dash

                        // 2. Draw Hook Blade
                        renderer.ctx.fillStyle = '#666';
                        renderer.ctx.strokeStyle = '#222';
                        renderer.ctx.lineWidth = 2;

                        // Calculate angle from owner to hook
                        const angle = Math.atan2(pHook.y - pOwner.y, pHook.x - pOwner.x);

                        renderer.ctx.save();
                        renderer.ctx.translate(pHook.x, pHook.y);
                        renderer.ctx.rotate(angle);

                        // Draw a curved blade
                        renderer.ctx.beginPath();
                        renderer.ctx.moveTo(0, 0); // attachment point
                        renderer.ctx.lineTo(15, -10); // curve out
                        renderer.ctx.lineTo(25, -5); // tip
                        renderer.ctx.lineTo(15, 0); // inner curve
                        renderer.ctx.lineTo(25, 10); // tip 2 (double hook like pudge)
                        renderer.ctx.lineTo(15, 5); // inner curve 2
                        renderer.ctx.lineTo(0, 10); // back to attachment point
                        renderer.ctx.closePath();

                        renderer.ctx.fill();
                        renderer.ctx.stroke();

                        renderer.ctx.restore();
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

        // Autonomous tracking of local entities for damage/gold feedback
        this.floatingTexts.trackEntities(this.localEntities, this.particles);

        // Track kills for kill feed
        for (const eData of data.entities) {
            if (eData.type === 'CHARACTER') {
                const wasAlive = this._prevAliveStates.get(eData.id);
                const isDead = eData.state === 'dead';

                if (wasAlive && isDead) {
                    // Someone died - figure out teams
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

        const targetScreen = this.game.renderer.worldToScreen(this.camera.x, this.camera.y);
        const worldScreenX = (mousePos.x - cx) + targetScreen.x;
        const worldScreenY = (mousePos.y - cy) + targetScreen.y;
        const worldTarget = this.game.renderer.screenToWorld(worldScreenX, worldScreenY);

        // Move
        if (this.game.input.isMouseButtonPressed(2)) {
            this.game.network.sendInput({ type: 'MOVE', x: worldTarget.x, y: worldTarget.y });
        }

        // Hook
        if (this.game.input.isKeyPressed('KeyQ')) {
            this.game.network.sendInput({ type: 'HOOK', x: worldTarget.x, y: worldTarget.y });
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

        // Shop toggle (B key — like WC3)
        if (this.game.input.isKeyPressed('KeyB')) {
            this.ui.shopOpen = !this.ui.shopOpen;
        }

        // Left click — check if clicking on a shop item in the UI
        if (this.game.input.isMouseButtonPressed(0)) {
            const clickedItemId = this.ui.getClickedShopItem(mousePos.x, mousePos.y);
            if (clickedItemId) {
                this.game.network.sendInput({ type: 'BUY_ITEM', itemId: clickedItemId });
            }
        }

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

        // Render entities from server state
        const sorted = [...this.localEntities].sort((a, b) => a.y - b.y);
        for (const entity of sorted) {
            if (entity.render) {
                entity.render(renderer);
            }
        }

        this.particles.render(renderer);
        this.floatingTexts.render(renderer);

        // Fog of War (darken edges of vision around player)
        if (this.localPlayer) {
            const playerScreen = renderer.worldToScreen(this.localPlayer.x, this.localPlayer.y, 0);
            const cx = this.game.canvas.width / 2;
            const cy = this.game.canvas.height / 2;
            renderer.drawFogOfWar(cx, cy, 450);
        }

        this.camera.release(renderer);

        // Render UI
        if (this.serverState && this.localPlayer) {
            this.ui.render(renderer.ctx, this.serverState.rules, this.localPlayer, this.localEnemy);
        }

        // Kill Feed (always on top)
        this.killFeed.render(renderer.ctx, this.game.canvas.width);
    }
}
