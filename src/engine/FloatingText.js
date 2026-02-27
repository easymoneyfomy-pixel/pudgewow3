export class FloatingText {
    constructor(x, y, text, color, isCritical = false) {
        this.x = x;
        this.y = y;
        this.z = 50; // Text floats high above head
        this.text = text;
        this.color = color;
        this.life = 1.5; // 1.5 seconds default life
        this.maxLife = 1.5;
        this.isCritical = isCritical;
        this.speedZ = 30; // Floats upwards continuously
    }

    update(dt) {
        this.z += this.speedZ * dt;
        this.life -= dt;
    }

    render(renderer) {
        const screenPos = renderer.worldToScreen(this.x, this.y, this.z);
        const alpha = Math.max(0, this.life / this.maxLife);

        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;

        let fontSize = this.isCritical ? 24 : 16;
        if (this.isCritical) {
            // Slight pop animation on start
            const pop = Math.sin((1 - (this.life / this.maxLife)) * Math.PI) * 10;
            fontSize += pop;
        }

        renderer.ctx.font = `bold ${fontSize}px Arial`;
        renderer.ctx.textAlign = 'center';

        // Text Shadow/Stroke for readability like WC3
        renderer.ctx.strokeStyle = 'black';
        renderer.ctx.lineWidth = 3;
        renderer.ctx.strokeText(this.text, screenPos.x, screenPos.y);

        renderer.ctx.fillStyle = this.color;
        renderer.ctx.fillText(this.text, screenPos.x, screenPos.y);

        renderer.ctx.restore();
    }
}

export class FloatingTextManager {
    constructor() {
        this.texts = [];
        this.lastHpStates = new Map();
        this.lastGoldStates = new Map();
    }

    addText(x, y, text, color, isCritical = false) {
        this.texts.push(new FloatingText(x, y, text, color, isCritical));
    }

    // Client-side autonomous tracker to spawn texts based on state changes
    trackEntities(entities, particleSystem) {
        for (const e of entities) {
            if (e.hp !== undefined) {
                const lastHp = this.lastHpStates.get(e.id);
                if (lastHp !== undefined && e.hp < lastHp) {
                    if (e.isHeadshot) {
                        this.addText(e.x, e.y - 40, "HEADSHOT!", '#ff0000', true);
                        if (particleSystem) {
                            particleSystem.spawnBlood(e.x, e.y, 40); // Massive blood
                        }
                    } else {
                        const dmg = Math.ceil(lastHp - e.hp);
                        // Spawn red damage text
                        this.addText(e.x + (Math.random() * 20 - 10), e.y + (Math.random() * 20 - 10), `-${dmg}`, '#ff3333');
                        if (particleSystem) {
                            particleSystem.spawnBlood(e.x, e.y, Math.min(dmg, 20)); // Cap particles
                        }
                    }
                }
                this.lastHpStates.set(e.id, e.hp);
            }

            if (e.gold !== undefined) {
                const lastGold = this.lastGoldStates.get(e.id);
                if (lastGold !== undefined && e.gold > lastGold) {
                    const earned = e.gold - lastGold;
                    // Spawn Yellow gold text
                    this.addText(e.x, e.y, `+${earned}g`, '#ffd700', earned >= 50);
                }
                this.lastGoldStates.set(e.id, e.gold);
            }
        }
    }

    update(dt) {
        this.texts.forEach(t => t.update(dt));
        this.texts = this.texts.filter(t => t.life > 0);
    }

    render(renderer) {
        this.texts.sort((a, b) => a.y - b.y);
        this.texts.forEach(t => t.render(renderer));
    }
}
