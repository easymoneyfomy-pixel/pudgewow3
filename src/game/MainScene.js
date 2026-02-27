import { Camera } from '../engine/Camera.js';
import { GameMap } from '../engine/GameMap.js';
import { UIManager } from '../ui/UIManager.js';
import { ParticleSystem } from '../engine/ParticleSystem.js';
import { FloatingTextManager } from '../engine/FloatingText.js';
import { KillFeed } from '../ui/KillFeed.js';
import { EntityRenderer } from '../client/EntityRenderer.js';
import { GAME } from '../shared/GameConstants.js';

/**
 * MainScene — client-side game scene.
 *
 * Responsibilities:
 *  - Receive plain-data server state snapshots via `onServerState(data)`.
 *  - Store entity state as plain data objects (no class instances needed).
 *  - Translate player input into network messages.
 *  - Render the world via Camera + EntityRenderer + UIManager.
 *
 * Entity class files (Character, Hook, etc.) are NOT imported here — they
 * run only on the server.  The client works exclusively with the serialized
 * eData objects that arrive over the network.
 */
export class MainScene {
    constructor(game) {
        this.game = game;

        this.map = new GameMap(GAME.MAP_WIDTH, GAME.MAP_HEIGHT, GAME.TILE_SIZE);
        this.camera = new Camera(0, 0, 1);
        this.ui = new UIManager(game);

        /** @type {object[]} — plain eData objects from the last server tick */
        this.entities = [];

        /** @type {object|null} — eData of the local player character */
        this.localPlayer = null;

        /** @type {object[]} — eData objects of enemy characters */
        this.enemies = [];

        /** Build a fast owner-lookup for hooks: ownerId → character eData */
        this.characterMap = new Map();

        this.serverState = null;
        this.particles = new ParticleSystem();
        this.floatingTexts = new FloatingTextManager();
        this.killFeed = new KillFeed();

        // One-frame tracking for camera shake and kill feed
        this._prevHp = new Map();
        this._prevAliveStates = new Map();
        this._firstBloodDone = false;
    }

    init() { }
    destroy() { }

    // ─────────────────────────────────────────────────────────────────────────
    // SERVER STATE INGESTION
    // ─────────────────────────────────────────────────────────────────────────

    onServerState(data) {
        this.serverState = data;

        this.entities = [];
        this.localPlayer = null;
        this.enemies = [];
        this.characterMap.clear();

        const myId = this.game.network.playerId;
        const myTeam = this.game.network.team;

        // ── First pass: collect all eData objects ──
        for (const eData of data.entities) {
            this.entities.push(eData);

            if (eData.type === 'CHARACTER') {
                this.characterMap.set(eData.id, eData);

                if (eData.id === myId) {
                    // Camera shake on damage
                    const prevHp = this._prevHp.get(eData.id);
                    if (prevHp !== undefined && eData.hp < prevHp) {
                        this.camera.shake(8);
                    }
                    this._prevHp.set(eData.id, eData.hp);
                    this.localPlayer = eData;
                } else if (eData.team !== myTeam) {
                    this.enemies.push(eData);
                }
            }
        }

        // ── Kill-feed tracking (second pass over characters only) ──
        for (const eData of data.entities) {
            if (eData.type !== 'CHARACTER') continue;

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

        // ── 1. Purge memory leaks (Diagnosis Fix) ──
        // Remove tracking data for entities that no longer exist on the server
        const currentEntityIds = new Set(data.entities.map(e => e.id));
        for (const [id] of this._prevHp) {
            if (!currentEntityIds.has(id)) this._prevHp.delete(id);
        }
        for (const [id] of this._prevAliveStates) {
            if (!currentEntityIds.has(id)) this._prevAliveStates.delete(id);
        }

        // Floating text system tracks entity positions and emits damage/regen numbers
        this.floatingTexts.trackEntities(this.entities, this.particles);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE (input & local systems)
    // ─────────────────────────────────────────────────────────────────────────

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

        // Convert screen coords to world coords
        const worldX = mousePos.x - cx + this.camera.x;
        const worldY = mousePos.y - cy + this.camera.y;

        // ============================================================
        // WC3 PUDGE WARS CONTROLS
        // Right-click  = Move     |  Left-click = Hook
        // Q            = Hook     |  W          = Toggle Rot
        // E            = Barricade|  B          = Toggle Shop
        // 1-4          = Stat Upgrades
        // Z,X,C,V,D,F  = Active Items
        // ============================================================

        if (this.game.input.isMouseButtonPressed(2)) {
            this.game.network.sendInput({ type: 'MOVE', x: worldX, y: worldY });
        }

        if (this.game.input.isMouseButtonPressed(0) && !this.ui.shopOpen) {
            this.game.network.sendInput({ type: 'HOOK', x: worldX, y: worldY });
        }

        if (this.game.input.isKeyPressed('KeyQ')) {
            this.game.network.sendInput({ type: 'HOOK', x: worldX, y: worldY });
        }

        if (this.game.input.isKeyPressed('KeyW')) {
            this.game.network.sendInput({ type: 'ROT' });
        }

        if (this.game.input.isKeyPressed('KeyE')) {
            this.game.network.sendInput({ type: 'BARRICADE' });
        }

        // Stat upgrades (1-4)
        if (this.game.input.isKeyPressed('Digit1')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DAMAGE' });
        if (this.game.input.isKeyPressed('Digit2')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'SPEED' });
        if (this.game.input.isKeyPressed('Digit3')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DISTANCE' });
        if (this.game.input.isKeyPressed('Digit4')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'RADIUS' });

        // Active items (Z,X,C,V,D,F → slots 0-5)
        const itemKeys = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyD', 'KeyF'];
        for (let i = 0; i < 6; i++) {
            if (this.game.input.isKeyPressed(itemKeys[i])) {
                this.game.network.sendInput({ type: 'USE_ITEM', slot: i, x: worldX, y: worldY });
            }
        }

        // Shop proximity & toggle (B)
        const nearShop = this._isNearShop();
        if (this.game.input.isKeyPressed('KeyB')) {
            this.ui.shopOpen = nearShop ? !this.ui.shopOpen : false;
        }
        if (this.ui.shopOpen && !nearShop) {
            this.ui.shopOpen = false;
        }

        // Camera follow local player (Frame-independent decay)
        if (this.localPlayer) {
            const decay = 10;
            const lerpFactor = 1 - Math.exp(-decay * dt);
            this.camera.x += (this.localPlayer.x - this.camera.x) * lerpFactor;
            this.camera.y += (this.localPlayer.y - this.camera.y) * lerpFactor;
        }

        this.particles.update(dt);
        this.floatingTexts.update(dt);
        this.killFeed.update(dt);
        this.camera.update(dt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    render(renderer) {
        this.camera.apply(renderer);

        this.map.render(renderer, this.game.deltaTime);

        // Sort entities by Y for painter's-algorithm depth ordering
        const sorted = [...this.entities].sort((a, b) => a.y - b.y);

        // Only allies (and self) see their mines — filter here client-side
        const myTeam = this.game.network.team;

        for (const eData of sorted) {
            if (eData.type === 'LANDMINE' && eData.team !== myTeam) continue; // WC3: stealth mines
            EntityRenderer.draw(renderer, eData, this.characterMap);
        }

        this.particles.render(renderer);
        this.floatingTexts.render(renderer);

        // UI/HUD overlay
        if (this.serverState && this.localPlayer) {
            this.ui.render(renderer.ctx, this.serverState.rules, this.localPlayer, this.enemies[0]);
        }

        this.killFeed.render(renderer.ctx, this.game.canvas.width);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Returns true if the local player is within 2 tiles of a shop tile. */
    _isNearShop() {
        if (!this.localPlayer) return false;
        const tx = Math.floor(this.localPlayer.x / GAME.TILE_SIZE);
        const ty = Math.floor(this.localPlayer.y / GAME.TILE_SIZE);
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const cx = tx + dx;
                const cy = ty + dy;
                if (cx >= 0 && cx < this.map.width && cy >= 0 && cy < this.map.height) {
                    if (this.map.grid[cx][cy].type === 'shop') return true;
                }
            }
        }
        return false;
    }
}
