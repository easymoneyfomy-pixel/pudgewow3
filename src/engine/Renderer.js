export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = 48; // WC3-style tile size
    }

    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    translate(x, y) { this.ctx.translate(x, y); }

    // Draw fog of war
    drawFogOfWar(playerScreenX, playerScreenY, visionRadius) {
        const ctx = this.ctx;
        ctx.save();
        const gradient = ctx.createRadialGradient(
            playerScreenX, playerScreenY, visionRadius * 0.6,
            playerScreenX, playerScreenY, visionRadius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }
}
