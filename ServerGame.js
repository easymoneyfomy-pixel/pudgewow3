import { GameMap } from './src/engine/GameMap.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { GameRules } from './src/engine/GameRules.js';
import { Character } from './src/game/Character.js';
import { Hook } from './src/game/Hook.js';
import { Barricade } from './src/game/Barricade.js';
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

        this.lastTime = performance.now();
        this.tickRate = GAME.TICK_RATE;
        this.tickInterval = null;
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
        } else if (input.type === 'BARRICADE') {
            character.castBarricade(this.entityManager, Barricade);
        } else if (input.type === 'BUY_ITEM') {
            this.handleBuyItem(character, input.itemId);
        }
    }

    handleUpgrade(character, type) {
        const cost = 50;
        if (character.gold >= cost) {
            switch (type) {
                case 'DAMAGE':
                    character.hookDamage += 10;
                    character.gold -= cost;
                    break;
                case 'SPEED':
                    character.hookSpeed += 50;
                    character.gold -= cost;
                    break;
                case 'DISTANCE':
                    character.hookMaxDist += 100;
                    character.gold -= cost;
                    break;
                case 'RADIUS':
                    character.hookRadius += 4;
                    character.gold -= cost;
                    break;
            }
        }
    }

    handleBuyItem(character, itemId) {
        const itemDef = ITEM_MAP[itemId];
        if (!itemDef) return;
        if (character.gold < itemDef.cost) return;
        if (!itemDef.consumable && character.items.length >= character.maxItems) return;

        character.gold -= itemDef.cost;

        if (itemDef.consumable) {
            // Apply immediately
            if (itemDef.effect === 'heal') {
                character.hp = Math.min(character.hp + 50, character.maxHp);
            }
            return;
        }

        character.items.push({ id: itemId, name: itemDef.label, effect: itemDef.effect });

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

    isPlaying() {
        return this.running;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();

        this.tickInterval = setInterval(() => this.loop(), 1000 / this.tickRate);
    }

    stop() {
        this.running = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
        }
    }

    loop() {
        const currentTime = performance.now();
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.rules.isGameOver) {
            for (const entity of this.entityManager.entities) {
                if (entity instanceof Character) {
                    const tile = this.map.getTileAt(entity.x, entity.y);
                    entity.isHealing = (tile && tile.type === 'rune');
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
            entities: []
        };

        for (const entity of this.entityManager.entities) {
            if (entity instanceof Character) {
                state.entities.push({
                    type: 'CHARACTER',
                    id: entity.id,
                    x: entity.x,
                    y: entity.y,
                    team: entity.team,
                    hp: entity.hp,
                    maxHp: entity.maxHp,
                    state: entity.state,
                    hookCooldown: entity.hookCooldown,
                    maxHookCooldown: entity.maxHookCooldown,
                    gold: entity.gold,
                    hookDamage: entity.hookDamage,
                    hookSpeed: entity.hookSpeed,
                    hookMaxDist: entity.hookMaxDist,
                    hookRadius: entity.hookRadius,
                    isHeadshot: entity.headshotJustHappened,
                    isDenied: entity.deniedJustHappened,
                    rotActive: entity.rotActive,
                    items: entity.items || [],
                    level: entity.level || 1,
                    xp: entity.xp || 0,
                    xpToLevel: entity.xpToLevel || 100,
                    burnTimer: entity.burnTimer || 0,
                    ruptureTimer: entity.ruptureTimer || 0,
                    invulnerableTimer: entity.invulnerableTimer || 0,
                    isHealing: entity.isHealing || false
                });
                entity.headshotJustHappened = false; // Reset after sending
                entity.deniedJustHappened = false; // Reset after sending
            } else if (entity instanceof Hook) {
                state.entities.push({
                    type: 'HOOK',
                    x: entity.x,
                    y: entity.y,
                    ownerId: entity.owner.id,
                    radius: entity.radius
                });
            } else if (entity instanceof Barricade) {
                state.entities.push({
                    type: 'BARRICADE',
                    id: entity.id,
                    x: entity.x,
                    y: entity.y,
                    team: entity.team,
                    hp: entity.hp,
                    maxHp: entity.maxHp,
                    state: entity.state
                });
            }
        }

        this.roomManager.broadcastToRoom(this.roomId, state);
    }
}
