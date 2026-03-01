export class KillFeed {
    constructor() {
        this.entries = [];
        this.announcements = []; // For huge center-screen text
        this.maxEntries = 5;
        this.entryLife = 5; // seconds
    }

    addKill(killerTeam, victimTeam, isHeadshot = false) {
        const killerColor = killerTeam === 'red' ? '#ff4444' : '#4488ff';
        const victimColor = victimTeam === 'red' ? '#ff4444' : '#4488ff';
        
        const text = isHeadshot
            ? `💀 HEADSHOT! ${killerTeam.toUpperCase()} ➜ ${victimTeam.toUpperCase()}`
            : `⚔ ${killerTeam.toUpperCase()} killed ${victimTeam.toUpperCase()}`;

        this.entries.push({
            text,
            life: this.entryLife,
            isHeadshot,
            killerTeam,
            killerColor,
            victimColor
        });

        if (isHeadshot) {
            this.announcements.push({
                text: "HEADSHOT!",
                life: 3,
                color: '#ffcc00'
            });
        }

        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }

    addFirstBlood(killerTeam) {
        const killerColor = killerTeam === 'red' ? '#ff4444' : '#4488ff';
        
        this.entries.push({
            text: `🩸 FIRST BLOOD! — ${killerTeam.toUpperCase()}`,
            life: 6,
            isHeadshot: false,
            isFirstBlood: true,
            killerTeam,
            killerColor
        });

        this.announcements.push({
            text: "FIRST BLOOD",
            life: 4,
            color: '#ff0000'
        });
    }

    addDeny(killerTeam, victimTeam) {
        const killerColor = killerTeam === 'red' ? '#ff4444' : '#4488ff';
        const victimColor = victimTeam === 'red' ? '#ff4444' : '#4488ff';
        
        this.entries.push({
            text: `📉 DENIED! ${killerTeam.toUpperCase()} ➜ ${victimTeam.toUpperCase()}`,
            life: this.entryLife,
            isHeadshot: false,
            isDenied: true,
            killerTeam,
            killerColor,
            victimColor
        });

        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }

    update(dt) {
        for (const e of this.entries) {
            e.life -= dt;
        }
        for (const a of this.announcements) {
            a.life -= dt;
        }
        this.entries = this.entries.filter(e => e.life > 0);
        this.announcements = this.announcements.filter(a => a.life > 0);
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

            // Text with team colors
            ctx.font = e.isHeadshot || e.isFirstBlood ? 'bold 13px Arial' : '12px Arial';
            ctx.textAlign = 'right';
            
            // Parse text and color team names
            const text = e.text;
            let drawX = startX - 10;
            
            // Simple approach: draw entire text in default color
            // Team names are already in UPPERCASE (RED/BLUE)
            ctx.fillStyle = e.isFirstBlood ? '#ff4444' :
                e.isHeadshot ? '#ffd700' :
                    e.isDenied ? '#bbbbbb' :
                        '#ffffff';
            ctx.fillText(text, drawX, y + 6);
        }

        // Render huge center-screen announcements
        for (let i = 0; i < this.announcements.length; i++) {
            const a = this.announcements[i];
            const alpha = Math.min(1, a.life / 1.0); // Fade out over last 1 second

            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Scaled text effect (starts big, gets smaller)
            const scale = 1.0 + (a.life * 0.2);
            ctx.font = `bold ${Math.floor(60 * scale)}px "Cinzel", serif`;

            // Drop shadow / glow
            ctx.shadowColor = a.color;
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#fff';

            // Draw slightly higher than center
            ctx.fillText(a.text, width / 2, ctx.canvas.height / 3 + (i * 80));

            ctx.shadowBlur = 0; // reset
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
