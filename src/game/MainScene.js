import { Camera } from '../engine/Camera.js';
import { GameMap } from '../engine/GameMap.js';
import { UIManager } from '../ui/UIManager.js';
import { Character } from './Character.js';
import { Hook } from './Hook.js';

export class MainScene {
    constructor(game) {
        this.game = game;

        this.map = new GameMap(16, 16, 64);
        this.camera = new Camera(0, 0, 1);
        this.ui = new UIManager(game);

        // State received from server
        this.serverState = null;

        // Dummy local representations for rendering
        this.localEntities = [];
        this.localPlayer = null;
        this.localEnemy = null;
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

                    // Переопределяем render для динамического радиуса
                    hook.render = function (renderer) {
                        const pOwner = renderer.worldToScreen(this.owner.x, this.owner.y, 10);
                        const pHook = renderer.worldToScreen(this.x, this.y, 10);

                        renderer.ctx.strokeStyle = '#888';
                        renderer.ctx.lineWidth = 2;
                        renderer.ctx.beginPath();
                        renderer.ctx.moveTo(pOwner.x, pOwner.y - 20);
                        renderer.ctx.lineTo(pHook.x, pHook.y - 20);
                        renderer.ctx.stroke();

                        renderer.ctx.fillStyle = '#ccc';
                        renderer.ctx.beginPath();
                        // Рисуем хук с правильным серверным радиусом
                        renderer.ctx.arc(pHook.x, pHook.y - 20, this.radius, 0, Math.PI * 2);
                        renderer.ctx.fill();
                        renderer.ctx.strokeStyle = '#000';
                        renderer.ctx.stroke();
                    };

                    this.localEntities.push(hook);
                }
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

        // Shop Upgrades
        if (this.game.input.isKeyPressed('Digit1')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DAMAGE' });
        if (this.game.input.isKeyPressed('Digit2')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'SPEED' });
        if (this.game.input.isKeyPressed('Digit3')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DISTANCE' });
        if (this.game.input.isKeyPressed('Digit4')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'RADIUS' });

        if (this.localPlayer) {
            this.camera.x += (this.localPlayer.x - this.camera.x) * 10 * dt;
            this.camera.y += (this.localPlayer.y - this.camera.y) * 10 * dt;
        }
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

        this.camera.release(renderer);

        // Render UI if state is available
        if (this.serverState && this.localPlayer) {
            // Construct a fake rules object if needed, it matches ServerGame's output
            this.ui.render(renderer.ctx, this.serverState.rules, this.localPlayer, this.localEnemy);
        }
    }
}
