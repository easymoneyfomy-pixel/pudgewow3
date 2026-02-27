import { State } from './State.js';
import { GAME } from '../shared/GameConstants.js';
import { Rune } from '../game/Rune.js';

export class GameRules {
    constructor() {
        this.scoreRed = 0;
        this.scoreBlue = 0;
        this.maxScore = GAME.MAX_SCORE;

        this.roundTimeLeft = GAME.ROUND_TIME;
        this.isGameOver = false;
        this.winner = null;

        // Runes spawn every 2 minutes
        this.runeSpawnTimer = 120;
    }

    update(dt, entityManager) {
        if (this.isGameOver) return;

        // Tick Rune Spawn
        this.runeSpawnTimer -= dt;
        if (this.runeSpawnTimer <= 0) {
            this.spawnRune(entityManager);
            this.runeSpawnTimer = 120; // reset
        }

        this.roundTimeLeft -= dt;
        if (this.roundTimeLeft <= 0) {
            this.roundTimeLeft = 0;
            this.endRoundByTime();
        }

        // Проверяем смерти (для простоты - перебираем энтити)
        // В реальном движке лучше отправлять события "onDeath"
        for (const entity of entityManager.entities) {
            if (entity.state === State.DEAD && entity.respawnTimer === entity.respawnDelay) {
                // Только что умер
                this.handleDeath(entity);
            }
        }
    }

    handleDeath(entity) {
        if (entity.deniedJustHappened) {
            // It's a deny! No points for the enemy team.
            return;
        }

        // WC3 Pudge Wars: Mine kills do NOT award score points
        if (entity.killedByMine) {
            entity.killedByMine = false; // Reset for next life
            return;
        }

        if (entity.team === 'red') {
            this.scoreBlue++;
        } else if (entity.team === 'blue') {
            this.scoreRed++;
        }

        this.checkWinCondition();
    }

    checkWinCondition() {
        if (this.scoreRed >= this.maxScore) {
            this.isGameOver = true;
            this.winner = 'Red Team';
        } else if (this.scoreBlue >= this.maxScore) {
            this.isGameOver = true;
            this.winner = 'Blue Team';
        }
    }

    endRoundByTime() {
        this.isGameOver = true;
        if (this.scoreRed > this.scoreBlue) {
            this.winner = 'Red Team';
        } else if (this.scoreBlue > this.scoreRed) {
            this.winner = 'Blue Team';
        } else {
            this.winner = 'Draw';
        }
    }

    spawnRune(entityManager) {
        const types = ['haste', 'dd', 'heal', 'illusion'];
        const type = types[Math.floor(Math.random() * types.length)];

        // Spawn at relative points around the middle of the map
        const ts = GAME.TILE_SIZE;
        const midX = Math.floor(GAME.MAP_WIDTH / 2);
        const midY = Math.floor(GAME.MAP_HEIGHT / 2);
        const offset = ts / 2;

        const spawnPoints = [
            { x: (midX - 1) * ts + offset, y: (midY - 1) * ts + offset }, // Center-top-left
            { x: midX * ts + offset, y: midY * ts + offset },       // Center-bottom-right
            { x: (midX - 1) * ts + offset, y: (midY - 7) * ts + offset }, // Top river
            { x: midX * ts + offset, y: (midY + 6) * ts + offset }  // Bottom river
        ];
        const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

        const rune = new Rune(pt.x, pt.y, type);
        entityManager.add(rune);
    }
}
