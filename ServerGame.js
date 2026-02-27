import { GameMap } from './src/engine/GameMap.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { GameRules } from './src/engine/GameRules.js';
import { Character } from './src/game/Character.js';
import { Hook } from './src/game/Hook.js';

export class ServerGame {
    constructor(roomId, roomManager) {
        this.roomId = roomId;
        this.roomManager = roomManager;

        this.map = new GameMap(16, 16, 64);
        this.entityManager = new EntityManager();
        this.rules = new GameRules();

        this.players = new Map(); // playerId -> Character
        this.running = false;

        this.lastTime = performance.now();
        this.tickRate = 20;
        this.tickInterval = null;
    }

    addPlayer(playerId, team) {
        const spawnX = team === 'red' ? 256 : 1024 - 256;
        const spawnY = 512;

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
                    hookRadius: entity.hookRadius
                });
            } else if (entity instanceof Hook) {
                state.entities.push({
                    type: 'HOOK',
                    x: entity.x,
                    y: entity.y,
                    ownerId: entity.owner.id,
                    radius: entity.radius
                });
            }
        }

        this.roomManager.broadcastToRoom(this.roomId, state);
    }
}
