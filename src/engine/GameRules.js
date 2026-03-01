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
        
        // Multi-kill tracking
        this._killStreaks = new Map(); // playerId -> { count, lastKillTime }
        this._firstBloodDone = false;
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

        // Провeряем смерти (для простоты - перебираем энтити)
        // Robust Phase 15 fix: Use flag to ensure death is processed exactly once
        for (const entity of entityManager.entities) {
            if (entity.state === State.DEAD && !entity.isDeathProcessed) {
                entity.isDeathProcessed = true;
                this.handleDeath(entity);
            }
        }
    }

    handleDeath(entity) {
        console.log(`[GameRules.handleDeath] Player ${entity.id} died, deniedJustHappened=${entity.deniedJustHappened}, team=${entity.team}`);
        
        // ── DENY CHECK ──
        // Deny = ally killed ally (no gold, no XP, no First Blood, no score)
        if (entity.deniedJustHappened) {
            console.log(`[SERVER] Deny detected for player ${entity.id}`);
            return; // NO gold, NO XP, NO First Blood, NO score
        }

        // ── MINE KILLS ──
        // Mine kills by enemy = normal kill (gold + score)
        // Mine kills by ally = deny (no gold, no score)
        if (entity.killedByMine) {
            const mineKiller = entity.lastAttacker;
            if (mineKiller && mineKiller.team !== entity.team) {
                // Enemy mine kill = normal kill
                entity.killedByMine = false;
                // Continue to normal kill processing below
            } else {
                // Ally mine kill = deny
                entity.killedByMine = false;
                return; // NO score, NO gold
            }
        }

        // ── SCORE UPDATE ──
        if (entity.team === 'red') {
            this.scoreBlue++;
        } else if (entity.team === 'blue') {
            this.scoreRed++;
        }

        // ── KILLER REWARDS ──
        if (entity.lastAttacker) {
            const killer = entity.lastAttacker;

            // Check if killer is enemy (not ally)
            const isEnemyKill = killer.team !== entity.team;

            if (isEnemyKill) {
                // Base gold for enemy kill
                let goldReward = 65;

                // ── FIRST BLOOD ──
                // First enemy kill of the match (only once per game)
                if (!this._firstBloodDone) {
                    goldReward = 130; // First Blood bonus (x2)
                    this._firstBloodDone = true;
                    killer.firstBlood = true; // Set flag for client notification
                    console.log(`[FIRST BLOOD] Player ${killer.id} gets ${goldReward}g!`);
                }

                // ── HEADSHOT BONUS ──
                if (entity.headshotJustHappened) {
                    goldReward = 150;
                    console.log(`[HEADSHOT] Player ${killer.id} gets ${goldReward}g!`);
                }

                // ── MULTI-KILL TRACKING ──
                this._trackMultiKill(killer);

                // ── APPLY REWARDS ──
                if (killer.gainFleshHeap) killer.gainFleshHeap();
                if (killer.gainXp) killer.gainXp(50); // XP for kill
                killer.gold += goldReward;
                console.log(`[GOLD] Kill reward: Player ${killer.id} +${goldReward}g (Total: ${killer.gold})`);
            }
            // Ally kills (deny) give NO gold, NO XP - already handled at top
        }

        this.checkWinCondition();
    }

    _trackMultiKill(killer) {
        const now = Date.now();
        const streak = this._killStreaks.get(killer.id) || { count: 0, lastKillTime: now };
        
        // Reset if more than 30 seconds since last kill
        if (now - streak.lastKillTime > 30000) {
            streak.count = 1;
        } else {
            streak.count++;
        }
        streak.lastKillTime = now;
        
        this._killStreaks.set(killer.id, streak);
        
        // Multi-kill notifications only (no gold bonuses)
        if (streak.count === 2) {
            console.log(`[DOUBLE KILL] Player ${killer.id}!`);
        } else if (streak.count === 3) {
            console.log(`[TRIPLE KILL] Player ${killer.id}!`);
        } else if (streak.count === 4) {
            console.log(`[ULTRA KILL] Player ${killer.id}!`);
        } else if (streak.count >= 5) {
            console.log(`[RAMPAGE] Player ${killer.id}!`);
        }
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
        const types = ['haste', 'dd', 'heal', 'bounty'];
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
