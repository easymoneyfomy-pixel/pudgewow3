import { State } from '../engine/State.js';

export class Barricade {
    constructor(x, y, team) {
        this.id = 'barricade_' + Math.random().toString(36).substr(2, 9);
        this.type = 'BARRICADE';
        this.x = x;
        this.y = y;
        this.z = 0;
        this.team = team;

        this.radius = 20;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.state = State.IDLE;

        this.lifeTimer = 15;
        this.isBarricade = true;
    }

    takeDamage(amount) {
        if (this.state === State.DEAD) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = State.DEAD;
        }
    }

    update(dt, map, entityManager) {
        if (this.state === State.DEAD) return;
        this.lifeTimer -= dt;
        if (this.lifeTimer <= 0) {
            this.state = State.DEAD;
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            type: 'BARRICADE',
            id: this.id,
            x: this.x,
            y: this.y,
            team: this.team,
            hp: this.hp,
            maxHp: this.maxHp,
            state: this.state,
        };
    }
}
