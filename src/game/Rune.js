import { State } from '../engine/State.js';

export class Rune {
    constructor(x, y, type) {
        this.id = 'rune_' + Math.random().toString(36).substr(2, 9);
        this.type = 'RUNE';
        this.x = x;
        this.y = y;
        this.runeType = type; // 'haste', 'dd', 'bounty'
        this.radius = 20;

        // Visual properties based on type
        switch (type) {
            case 'haste': this.color = '#ff0000'; this.icon = '⚡'; break;
            case 'dd': this.color = '#0000ff'; this.icon = '⚔️'; break;
            case 'heal': this.color = '#00ff00'; this.icon = '💚'; break;
            case 'bounty': this.color = '#ffd700'; this.icon = '💰'; break;
            default: this.color = '#ffffff'; this.icon = '❓'; break;
        }

        this.state = State.IDLE;
        this.lifeTime = 120; // 2 minutes before decaying if not picked up
        this._entityManagerRef = null;
    }

    takeDamage(amount) {
        // Runes can't be destroyed by damage, but could be hooked (we'll let them exist)
    }

    update(dt, map, entityManager) {
        this._entityManagerRef = entityManager;
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            entityManager.remove(this);
            return;
        }

        // Check for player pickup — DISABLED (WC3 Pudge Wars style: pickup on RMB)
        /*
        for (const entity of entityManager.entities) {
            if (entity.type === 'CHARACTER' && entity.state !== State.DEAD) {
                const edx = entity.x - this.x;
                const edy = entity.y - this.y;
                const edist = Math.sqrt(edx * edx + edy * edy);

                if (edist < this.radius + (entity.radius || 16)) {
                    this.applyEffect(entity);
                    entityManager.remove(this);
                    break;
                }
            }
        }
        */
    }

    applyEffect(character) {
        // Apply the relevant buff to the character
        switch (this.runeType) {
            case 'haste':
                character.hasteTimer = 12; // 12 sec of max speed
                break;
            case 'dd':
                character.ddTimer = 12; // 12 sec of double damage
                break;
            case 'heal':
                character.hp = Math.min(character.maxHp, character.hp + 100);
                break;
            case 'bounty':
                // Bounty Rune: gives gold to the player
                character.gold += 100;
                console.log(`[BOUNTY] Player ${character.id} gets +100g! (Total: ${character.gold})`);
                break;
        }
    }

    /** Returns a plain-data snapshot for server→client broadcast. */
    serialize() {
        return {
            id: this.id,
            type: 'RUNE',
            x: this.x,
            y: this.y,
            runeType: this.runeType,
            color: this.color,
            icon: this.icon,
        };
    }
}
