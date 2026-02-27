import { State } from './State.js';
import { GAME } from '../shared/GameConstants.js';

export class GameRules {
    constructor() {
        this.scoreRed = 0;
        this.scoreBlue = 0;
        this.maxScore = GAME.MAX_SCORE;

        this.roundTimeLeft = GAME.ROUND_TIME;
        this.isGameOver = false;
        this.winner = null;
    }

    update(dt, entityManager) {
        if (this.isGameOver) return;

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
}
