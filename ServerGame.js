import { GameMap } from './src/engine/GameMap.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { GameRules } from './src/engine/GameRules.js';
import { Character } from './src/game/Character.js';
import { Hook } from './src/game/Hook.js';
import { Barricade } from './src/game/Barricade.js';

export class ServerGame {
    constructor(roomId, roomManager) {
        this.roomId = roomId;
        this.roomManager = roomManager;

        this.map = new GameMap(24, 24, 64);
        this.entityManager = new EntityManager();
        this.rules = new GameRules();

        this.players = new Map(); // playerId -> Character
        this.running = false;

        this.lastTime = performance.now();
        this.tickRate = 20;
        this.tickInterval = null;
    }

    addPlayer(playerId, team) {
        // Based on 24x24 GameMap definition (spawn at grid[4][midY] and grid[19][midY])
        const spawnX = team === 'red' ? 4 * 64 : 19 * 64;
        const spawnY = 12 * 64;

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
        const ITEMS = {
            'flaming_hook': { cost: 150, name: 'Flaming Hook', effect: 'burn' },
            'ricochet_turbine': { cost: 125, name: 'Ricochet Turbine', effect: 'bounce' },
            'strygwyr_claws': { cost: 175, name: "Strygwyr's Claws", effect: 'rupture' },
            'healing_salve': { cost: 50, name: 'Healing Salve', effect: 'heal', consumable: true },
            'blink_dagger': { cost: 200, name: 'Blink Dagger', effect: 'blink' },
            'lycan_paws': { cost: 100, name: "Lycan's Paws", effect: 'speed' },
        };

        const itemDef = ITEMS[itemId];
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

        character.items.push({ id: itemId, name: itemDef.name, effect: itemDef.effect });

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
