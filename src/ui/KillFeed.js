export class KillFeed {
    constructor() {
        this.entries = [];
        this.maxEntries = 5;
        this.entryLife = 5; // seconds
    }

    addKill(killerTeam, victimTeam, isHeadshot = false) {
        const text = isHeadshot
            ? `💀 HEADSHOT! ${killerTeam.toUpperCase()} ➜ ${victimTeam.toUpperCase()}`
            : `⚔ ${killerTeam.toUpperCase()} killed ${victimTeam.toUpperCase()}`;

        this.entries.push({
            text,
            life: this.entryLife,
            isHeadshot,
            killerTeam
        });

        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }

    addFirstBlood(killerTeam) {
        this.entries.push({
            text: `🩸 FIRST BLOOD! — ${killerTeam.toUpperCase()}`,
            life: 6,
            isHeadshot: false,
            isFirstBlood: true,
            killerTeam
        });
    }

    addDeny(killerTeam, victimTeam) {
        this.entries.push({
            text: `📉 DENIED! ${killerTeam.toUpperCase()} ➜ ${victimTeam.toUpperCase()}`,
            life: this.entryLife,
            isHeadshot: false,
            isDenied: true,
            killerTeam
        });

        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }

    update(dt) {
        for (const e of this.entries) {
            e.life -= dt;
        }
        this.entries = this.entries.filter(e => e.life > 0);
    }

    render(ctx, width) {
        ctx.save();
        const startX = width - 10;
        const startY = 70;

        for (let i = 0; i < this.entries.length; i++) {
            const e = this.entries[i];
            const alpha = Math.min(1, e.life / 1.5); // fade out in last 1.5s
            const y = startY + i * 24;

            ctx.globalAlpha = alpha;

            // Background pill
            ctx.fillStyle = e.isFirstBlood ? 'rgba(180, 0, 0, 0.6)' :
                e.isHeadshot ? 'rgba(160, 120, 0, 0.6)' :
                    e.isDenied ? 'rgba(80, 80, 80, 0.6)' :
                        'rgba(0, 0, 0, 0.5)';
            const textW = ctx.measureText ? 260 : 260;
            ctx.fillRect(startX - textW, y - 8, textW, 22);

            // Text
            ctx.font = e.isHeadshot || e.isFirstBlood ? 'bold 13px Arial' : '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = e.isFirstBlood ? '#ff4444' :
                e.isHeadshot ? '#ffd700' :
                    e.isDenied ? '#bbbbbb' :
                        e.killerTeam === 'red' ? '#ff8888' : '#8888ff';
            ctx.fillText(e.text, startX - 10, y + 6);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
