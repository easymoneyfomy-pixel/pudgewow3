import { GameMap } from './src/engine/GameMap.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { GameRules } from './src/engine/GameRules.js';
import { Character } from './src/game/Character.js';
import { Hook } from './src/game/Hook.js';
import { TossedUnit } from './src/game/TossedUnit.js';
import { Landmine } from './src/game/Landmine.js';
import { ITEM_MAP } from './src/shared/ItemDefs.js';
import { GAME } from './src/shared/GameConstants.js';

export class ServerGame {
    constructor(roomId, roomManager) {
        this.roomId = roomId;
        this.roomManager = roomManager;

        this.map = new GameMap(GAME.MAP_WIDTH, GAME.MAP_HEIGHT, GAME.TILE_SIZE);
        this.entityManager = new EntityManager();
        this.rules = new GameRules();

        this.players = new Map();
        this.running = false;
        this.recentExplosions = [];

        this.lastTime = performance.now();
        this.tickRate = GAME.TICK_RATE;
        this.tickTimeout = null; // Changed from tickInterval
        this.expectedNextTick = 0; // Added for drift compensation
    }

    addPlayer(playerId, team) {
        // Based on 24x24 GameMap definition (spawn at grid[4][midY] and grid[19][midY])
        const spawnX = team === 'red' ? GAME.SPAWN_RED_X * GAME.TILE_SIZE : GAME.SPAWN_BLUE_X * GAME.TILE_SIZE;
        const middleY = GAME.SPAWN_MID_Y * GAME.TILE_SIZE;

        // Offset spawn slightly based on number of existing players on team
        let teamCount = 0;
        for (const p of this.players.values()) {
            if (p.team === team) teamCount++;
        }

        // Spread 5 players vertically
        const offsetY = (teamCount - 2) * GAME.TILE_SIZE;
        const spawnY = middleY + offsetY;

        const character = new Character(spawnX, spawnY, team);
        character.id = playerId;

        this.entityManager.add(character);
        this.players.set(playerId, character);
    }

    removePlayer(playerId) {
        const character = this.players.get(playerId);
        if (character) {
            this.entityManager.remove(character);
            this.players.delete(playerId);
        }
    }

    handlePlayerInput(playerId, input) {
        const character = this.players.get(playerId);
        if (!character) return;

        if (input.type === 'MOVE') {
            character.setTarget(input.x, input.y);
        } else if (input.type === 'HOOK') {
            character.castHook(input.x, input.y, this.entityManager);
        } else if (input.type === 'UPGRADE') {
            this.handleUpgrade(character, input.upgradeType);
        } else if (input.type === 'ROT') {
            character.toggleRot();
        } else if (input.type === 'BUY_ITEM') {
            this.handleBuyItem(character, input.itemId);
        } else if (input.type === 'USE_ITEM') {
            this.handleUseItem(character, input.slot, input.x, input.y);
        } else if (input.type === 'PICKUP') {
            this.handleRunePickup(character, input.runeId);
        } else if (input.type === 'BARRICADE') {
            // No-op: Barricades were removed in Phase 10
        }
    }

    handleRunePickup(character, runeId) {
        const rune = this.entityManager.entities.find(e => e.id === runeId);
        if (!rune || rune.type !== 'RUNE') return;

        const dx = rune.x - character.x;
        const dy = rune.y - character.y;
        const distSq = dx * dx + dy * dy;
        const pickupRange = 60;

        if (distSq < pickupRange * pickupRange) {
            rune.applyEffect(character);
            this.entityManager.remove(rune);
        } else {
            // Move to rune if too far
            character.setTarget(rune.x, rune.y);
        }
    }

    handleUpgrade(character, type) {
        const cost = GAME.UPGRADE_COST;
        if (character.gold >= cost) {
            switch (type) {
                case 'DAMAGE':
                    character.dmgUpgrades = (character.dmgUpgrades || 0) + 1;
                    character.gold -= cost;
                    break;
                case 'SPEED':
                    character.spdUpgrades = (character.spdUpgrades || 0) + 1;
                    character.gold -= cost;
                    break;
                case 'DISTANCE':
                    character.distUpgrades = (character.distUpgrades || 0) + 1;
                    character.gold -= cost;
                    break;
                case 'RADIUS':
                    character.radUpgrades = (character.radUpgrades || 0) + 1;
                    character.gold -= cost;
                    break;
            }
            character.recalculateStats();
        }
    }

    handleBuyItem(character, itemId) {
        // Proximity check (must be within 2 tiles of a shop)
        let nearShop = false;
        const tx = Math.floor(character.x / GAME.TILE_SIZE);
        const ty = Math.floor(character.y / GAME.TILE_SIZE);
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const cx = tx + dx;
                const cy = ty + dy;
                if (cx >= 0 && cx < this.map.width && cy >= 0 && cy < this.map.height) {
                    if (this.map.grid[cx][cy].type === 'shop') nearShop = true;
                }
            }
        }
        if (!nearShop) return;

        const itemDef = ITEM_MAP[itemId];
        if (!itemDef) return;
        if (character.gold < itemDef.cost) return;
        if (!itemDef.consumable && character.items.length >= character.maxItems) return;

        character.gold -= itemDef.cost;

        if (itemDef.consumable) {
            return;
        }

        character.items.push({
            id: itemId,
            name: itemDef.label,
            effect: itemDef.effect,
            active: itemDef.active || false,
            cooldown: 0,
            maxCooldown: itemDef.cooldown || 0
        });

        character.recalculateStats();

        // Apply passive effects
        switch (itemDef.effect) {
            case 'speed':
                character.speed += 40;
                break;
            case 'bounce':
                character.hookBounces = (character.hookBounces || 0) + 1;
                break;
        }
    }

    handleUseItem(character, slot, x, y) {
        if (!character.items || slot < 0 || slot >= character.items.length) return;

        const item = character.items[slot];
        if (!item.active || item.cooldown > 0) return;

        if (item.effect === 'blink') {
            // Blink Dagger logic (max range 400)
            const dx = x - character.x;
            const dy = y - character.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxBlink = 400;

            let targetX = x;
            let targetY = y;

            if (dist > maxBlink) {
                targetX = character.x + (dx / dist) * maxBlink;
                targetY = character.y + (dy / dist) * maxBlink;
            }

            // Check if walkable
            if (this.map.isWalkable(targetX, targetY)) {
                character.x = targetX;
                character.y = targetY;
                character.setTarget(targetX, targetY); // Stop moving immediately to new pos
                item.cooldown = item.maxCooldown;
            }
        } else if (item.effect === 'mine') {
            const mine = new Landmine(character.x, character.y, character.team);
            mine.onExplode = (ex, ey) => {
                this.recentExplosions.push({ x: ex, y: ey });
            };
            this.entityManager.add(mine);
            item.cooldown = item.maxCooldown;
        } else if (item.effect === 'toss') {
            // Find closest entity to toss that isn't the caster
            let closest = null;
            let closestDist = Infinity;
            for (const entity of this.entityManager.entities) {
                if (entity !== character && entity.takeDamage && entity.state !== 'DEAD') {
                    const dx = entity.x - character.x;
                    const dy = entity.y - character.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < closestDist && dist < 10000) { // 100 grab radius
                        closestDist = dist;
                        closest = entity;
                    }
                }
            }

            if (closest) {
                // Toss the unit to the target location
                const tossed = new TossedUnit(character, closest, x, y);
                tossed.onLanded = (ex, ey) => {
                    this.recentExplosions.push({ x: ex, y: ey });
                };
                this.entityManager.add(tossed);
                item.cooldown = item.maxCooldown;
            }
        } else if (item.effect === 'heal') {
            // Healing Salve: 10s duration
            character.salveTimer = 10;
            item.cooldown = item.maxCooldown;
        }
    }

    isPlaying() {
        return this.running;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.expectedNextTick = this.lastTime + (1000 / this.tickRate);

        // Use a drift-compensated recursive timeout instead of setInterval
        const scheduleNextFrame = () => {
            if (!this.running) return;

            const now = performance.now();
            let delay = this.expectedNextTick - now;

            // If we are lagging behind, just run immediately and reset expectation
            if (delay < 0) {
                delay = 0;
                this.expectedNextTick = now;
            }

            this.tickTimeout = setTimeout(() => {
                this.loop();
                this.expectedNextTick += (1000 / this.tickRate);
                scheduleNextFrame();
            }, delay);
        };

        scheduleNextFrame();
    }

    stop() {
        this.running = false;
        if (this.tickTimeout) {
            clearTimeout(this.tickTimeout);
        }
    }

    loop() {
        const currentTime = performance.now();
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap dt to prevent massive jumps if server hangs
        const cappedDt = Math.min(dt, 0.1);

        if (!this.rules.isGameOver) {
            for (const entity of this.entityManager.entities) {
                if (entity instanceof Character) {
                    const tile = this.map.getTileAt(entity.x, entity.y);
                    entity.isHealing = (tile && tile.type === 'rune');

                    // Tick items cooldown
                    if (entity.items) {
                        for (const item of entity.items) {
                            if (item.cooldown > 0) {
                                item.cooldown = Math.max(0, item.cooldown - dt);
                            }
                        }
                    }
                }
            }
            this.entityManager.update(dt, this.map);
            this.rules.update(dt, this.entityManager);
        }

        this.broadcastState();
    }

    broadcastState() {
        const state = {
            type: 'GAME_STATE',
            rules: {
                scoreRed: this.rules.scoreRed,
                scoreBlue: this.rules.scoreBlue,
                roundTimeLeft: this.rules.roundTimeLeft,
                isGameOver: this.rules.isGameOver,
                winner: this.rules.winner
            },
            serverTime: Date.now(),
            entities: [],
            explosions: [...this.recentExplosions]
        };
        this.recentExplosions = [];

        for (const entity of this.entityManager.entities) {
            if (entity.serialize) {
                state.entities.push(entity.serialize());
            }
        }

        // Reset one-frame flags on Characters and Hooks after serializing them
        for (const entity of this.entityManager.entities) {
            if (entity.type === 'CHARACTER') {
                entity.headshotJustHappened = false;
                entity.deniedJustHappened = false;
            } else if (entity.clashJustHappened !== undefined) {
                entity.clashJustHappened = false;
                entity.hitJustHappened = false;
            }
        }

        this.roomManager.broadcastToRoom(this.roomId, state);
    }
}
