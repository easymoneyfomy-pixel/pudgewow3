import { GAME } from '../shared/GameConstants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = GAME.TILE_SIZE; // WC3-style tile size (64)

        // Load Sprites
        this.pudgeSprite = new Image();
        this.pudgeSprite.src = 'assets/player/pudge_player.png';

        this.hookSprite = new Image();
        this.hookSprite.src = 'assets/hook.png';

        this.landmineSprite = new Image();
        this.landmineSprite.src = 'assets/mine.png'; // Handled by generic assets
    }

    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    translate(x, y) { this.ctx.translate(x, y); }
}
