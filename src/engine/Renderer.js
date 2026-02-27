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
}
