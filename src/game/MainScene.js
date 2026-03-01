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
        // Initialize camera to center of map
        const centerX = (GAME.MAP_WIDTH * GAME.TILE_SIZE) / 2;
        const centerY = (GAME.MAP_HEIGHT * GAME.TILE_SIZE) / 2;
        this.camera = new Camera(centerX, centerY, 1.3);
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
        this._prevFleshHeapStacks = new Map(); // Track Flesh Heap stack changes
        this._prevLevels = new Map(); // Track level changes for particles
        this._prevSalveTimers = new Map(); // Track Healing Salve for particles
        this._firstBloodShown = false; // Track First Blood notification (once per game)
        this._cameraInitialized = false;

        // Active item targeting state
        this.activeItemSlot = null;

        // Interpolation
        this._serverTickMs = 1000 / GAME.TICK_RATE;
        this._lastServerTime = 0;
        this._prevEntities = new Map(); // id -> eData
        this._targetEntities = new Map(); // id -> eData
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

        // ── 0. State Interpolation Prep ──
        this._lastServerTime = performance.now();
        this._prevEntities = new Map(this._targetEntities);
        this._targetEntities = new Map();

        // ── First pass: collect all eData objects ──
        for (const eData of data.entities) {
            this.entities.push(eData);
            this._targetEntities.set(eData.id, eData);

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

                // Level up particles
                const prevLevel = this._prevLevels.get(eData.id) || 1;
                if (eData.level > prevLevel && eData.level > 1) {
                    this.particles.spawnLevelUp(eData.x, eData.y);
                    this.floatingTexts.addText(eData.x, eData.y - 60, `+${eData.level} LVL UP!`, '#ffffff', true);
                }
                this._prevLevels.set(eData.id, eData.level);

                // Haste rune particles (continuous while active)
                if (eData.hasteTimer > 0) {
                    this.particles.spawnHaste(eData.x, eData.y);
                }

                // Double Damage rune particles (continuous while active)
                if (eData.ddTimer > 0) {
                    this.particles.spawnDoubleDamage(eData.x, eData.y);
                }

                // Healing Salve particles (continuous while healing)
                const prevSalve = this._prevSalveTimers.get(eData.id) || 0;
                if (eData.salveTimer > 0 && eData.salveTimer !== prevSalve) {
                    this.particles.spawnHeal(eData.x, eData.y, 20 * (prevSalve - eData.salveTimer));
                }
                this._prevSalveTimers.set(eData.id, eData.salveTimer || 0);
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
                    console.log('[CLIENT] Deny detected for', eData.id, 'isDenied=' + eData.isDenied);
                    this.killFeed.addDeny(eData.team, victimTeam);
                } else if (eData.isHeadshot) {
                    this.killFeed.addKill(killerTeam, victimTeam, true);
                } else {
                    this.killFeed.addKill(killerTeam, victimTeam);
                }
            }

            this._prevAliveStates.set(eData.id, !isDead);
        }

        // ── First Blood notification (only once per game) ──
        if (!this._firstBloodShown) {
            for (const eData of data.entities) {
                if (eData.type === 'CHARACTER' && eData.firstBlood) {
                    const killerTeam = eData.team === 'red' ? 'blue' : 'red';
                    this.killFeed.addFirstBlood(killerTeam);
                    this._firstBloodShown = true;
                    break;
                }
            }
        }

        // ── Hook events (Clashing & Hits) ──
        for (const eData of data.entities) {
            if (eData.type === 'HOOK') {
                if (eData.hitJustHappened) {
                    this.particles.spawnBlood(eData.x, eData.y, 10);
                    this.camera.shake(6);
                }
                if (eData.clashJustHappened) {
                    this.particles.spawnClash(eData.x, eData.y);
                    this.camera.shake(4);
                }
                
                // Strygwyr's Claws: Rupture damage visual feedback
                if (eData.ruptureJustHappened) {
                    this.floatingTexts.addText(eData.ruptureX, eData.ruptureY, `-${Math.round(eData.ruptureDamage)}`, '#cc0000');
                    this.particles.spawnBlood(eData.ruptureX, eData.ruptureY, 3);
                }
            }
        }

        // ── Character events (Rot & Flesh Heap) ──
        for (const eData of data.entities) {
            if (eData.type !== 'CHARACTER') continue;

            // Rot particles
            if (eData.rotActive) {
                this.particles.spawnRot(eData.x, eData.y, eData.rotRadius || 120);
            }

            // Flesh Heap stack gain detection
            const prevStacks = this._prevFleshHeapStacks.get(eData.id) || 0;
            if (eData.fleshHeapStacks > prevStacks && eData.fleshHeapStacks > 0) {
                this.particles.spawnFleshHeap(eData.x, eData.y);
            }
            this._prevFleshHeapStacks.set(eData.id, eData.fleshHeapStacks || 0);
        }

        // ── Explosion events (Mines & Toss) ──
        if (data.explosions && data.explosions.length > 0) {
            for (const exp of data.explosions) {
                this.particles.spawnExplosion(exp.x, exp.y);
                this.camera.shake(12);
            }
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

        // Use core canvas dimensions for coordinate derivation
        const canvas = this.game.renderer.canvas;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // World coordinates derived from screen position + camera (Corrected for Zoom)
        const worldX = (mousePos.x - cx) / this.camera.zoom + this.camera.x;
        const worldY = (mousePos.y - cy) / this.camera.zoom + this.camera.y;

        // ============================================================
        // WC3 PUDGE WARS CONTROLS
        // Right-click  = Move     |  Left-click = Hook
        // Q            = Hook     |  W          = Toggle Rot
        // E            = Barricade|  B          = Toggle Shop
        // 1-4          = Stat Upgrades
        // Z,X,C,V,D,F  = Active Items
        // ============================================================

        if (this.game.input.isMouseButtonPressed(2)) {
            // Cancel targeting on right click
            if (this.activeItemSlot !== null) {
                this.activeItemSlot = null;
                this.game.canvas.style.cursor = 'default';
                return; // Early return to avoid moving immediately
            }

            // Check if clicking a rune for explicit pickup (WC3 Pudge Wars style)
            let clickedRuneId = null;
            for (const eData of this.entities) {
                if (eData.type === 'RUNE') {
                    const dx = eData.x - worldX;
                    const dy = eData.y - worldY;
                    const distSq = dx * dx + dy * dy;
                    // Click radius of 25px
                    if (distSq < 25 * 25) {
                        clickedRuneId = eData.id;
                        break;
                    }
                }
            }

            if (clickedRuneId) {
                this.game.network.sendInput({ type: 'PICKUP', runeId: clickedRuneId });
            } else {
                this.game.network.sendInput({ type: 'MOVE', x: worldX, y: worldY });
            }
        }

        if (this.game.input.isMouseButtonPressed(0) && !this.ui.shopOpen) {
            // If we are holding an active item target
            if (this.activeItemSlot !== null) {
                this.game.network.sendInput({ type: 'USE_ITEM', slot: this.activeItemSlot, x: worldX, y: worldY });
                this.activeItemSlot = null;
                this.game.canvas.style.cursor = 'default';
            } else {
                this.game.network.sendInput({ type: 'HOOK', x: worldX, y: worldY });
            }
        }

        if (this.game.input.isKeyPressed('KeyQ')) {
            this.game.network.sendInput({ type: 'HOOK', x: worldX, y: worldY });
        }

        if (this.game.input.isKeyPressed('KeyW')) {
            this.game.network.sendInput({ type: 'ROT' });
        }

        // Stat upgrades (1-5)
        if (this.game.input.isKeyPressed('Digit1')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DAMAGE' });
        if (this.game.input.isKeyPressed('Digit2')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'SPEED' });
        if (this.game.input.isKeyPressed('Digit3')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'DISTANCE' });
        if (this.game.input.isKeyPressed('Digit4')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'RADIUS' });
        if (this.game.input.isKeyPressed('Digit5')) this.game.network.sendInput({ type: 'UPGRADE', upgradeType: 'MOVE_SPEED' });

        // Active items (Z,X,C,V,D,F → slots 0-5)
        const itemKeys = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyD', 'KeyF'];
        for (let i = 0; i < 6; i++) {
            if (this.game.input.isKeyPressed(itemKeys[i])) {
                // If the player has the item and it's active
                if (this.localPlayer && this.localPlayer.items && this.localPlayer.items[i]) {
                    const item = this.localPlayer.items[i];
                    if (item.active && item.cooldown <= 0) {
                        this.activeItemSlot = i;
                        this.game.canvas.style.cursor = 'crosshair';
                    }
                }
            }
        }

        // Shop proximity & prompt
        const nearShop = this._isNearShop();
        const promptEl = document.getElementById('shop-prompt');
        if (promptEl) {
            if (nearShop) promptEl.classList.remove('hidden');
            else promptEl.classList.add('hidden');
        }

        // Toggle (B)
        if (this.game.input.isKeyPressed('KeyB')) {
            if (nearShop) {
                this.ui.shopOpen = !this.ui.shopOpen;
            }
        }

        // Force close if too far
        if (this.ui.shopOpen && !nearShop) {
            this.ui.shopOpen = false;
        }

        // Camera shake update
        this.camera.update(dt);

        this.particles.update(dt);
        this.floatingTexts.update(dt);
        this.killFeed.update(dt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    render(renderer) {
        // Calculate interpolation alpha (0-1)
        const now = performance.now();
        const elapsed = now - this._lastServerTime;
        const alpha = Math.min(1.0, elapsed / this._serverTickMs);

        // Create interpolated snapshots for rendering
        const displayEntities = [];
        let interpLocalPlayer = null;

        for (const [id, target] of this._targetEntities) {
            const prev = this._prevEntities.get(id);
            const interp = { ...target };

            if (prev && typeof target.x === 'number' && typeof target.y === 'number') {
                interp.x = prev.x + (target.x - prev.x) * alpha;
                interp.y = prev.y + (target.y - prev.y) * alpha;
            } else if (target.type === 'CHARACTER' && target.id === this.game.network.playerId) {
                // If it's a new spawn, snap immediately
                interp.x = target.x;
                interp.y = target.y;
            }

            if (id === this.game.network.playerId) {
                interpLocalPlayer = interp;
            }
            displayEntities.push(interp);
        }

        // 1. Camera Follow (Interpolated position for buttery smoothness)
        if (interpLocalPlayer) {
            if (!this._cameraInitialized) {
                this.camera.x = interpLocalPlayer.x;
                this.camera.y = interpLocalPlayer.y;
                this._cameraInitialized = true;
            } else {
                const decay = 15;
                const fdt = this.game.deltaTime;
                const lerpFactor = 1 - Math.exp(-decay * fdt);
                this.camera.x += (interpLocalPlayer.x - this.camera.x) * lerpFactor;
                this.camera.y += (interpLocalPlayer.y - this.camera.y) * lerpFactor;
            }
        }

        // 2. Transfrom world
        this.camera.apply(renderer);

        // 3. Render World
        this.map.render(renderer, this.game.deltaTime);

        // Build a display-only character map for hook owner lookups during render
        const displayCharacterMap = new Map();
        for (const e of displayEntities) {
            if (e.type === 'CHARACTER') displayCharacterMap.set(e.id, e);
        }

        // Sort interpolated entities by Y
        const sorted = displayEntities.sort((a, b) => a.y - b.y);

        // Only allies (and self) see their mines — filter here client-side
        const myTeam = this.game.network.team;

        for (const eData of sorted) {
            if (eData.type === 'LANDMINE' && eData.team !== myTeam) continue;
            EntityRenderer.draw(renderer, eData, displayCharacterMap);
        }

        this.particles.render(renderer);
        this.floatingTexts.render(renderer);

        this.camera.release(renderer);

        // UI/HUD overlay
        if (this.serverState) {
            // Passes null for player if not spawned, UIManager handles this gracefully
            this.ui.render(renderer.ctx, this.serverState.rules, this.localPlayer || null, this.enemies[0] || null, this);
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
