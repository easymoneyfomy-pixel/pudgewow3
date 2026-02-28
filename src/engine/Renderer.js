import { GAME } from '../shared/GameConstants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = GAME.TILE_SIZE; // WC3-style tile size (64)

        // Load Sprites
        this.radiantSprite = new Image();
        this.radiantSprite.src = 'assets/player/1.png';

        this.direSprite = new Image();
        this.direSprite.src = 'assets/player/2.png';

        this.direFloorSprite = new Image();
        this.direFloorSprite.src = 'assets/graund.png';

        this.hookSprite = new Image();
        this.hookSprite.src = 'assets/hook.png';

        this.flamingHookSprite = new Image();
        this.flamingHookSprite.src = 'assets/flaming_hook.png';

        this.hookTipSprite = new Image();
        this.hookTipSprite.src = 'assets/hook_body.png';

        this.hookLinkSprite = new Image();
        this.hookLinkSprite.src = 'assets/hook.png';

        this.landmineSprite = new Image();
        this.landmineSprite.src = 'assets/mine.png';
    }

    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    translate(x, y) { this.ctx.translate(x, y); }
}
