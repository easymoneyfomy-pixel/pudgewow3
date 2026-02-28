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

        this.treeSprite = new Image();
        this.treeSprite.src = 'assets/tree.png';

        this.treeRedSprite = new Image();
        this.treeRedSprite.src = 'assets/tree_red.png';

        this.waterSprite = new Image();
        this.waterSprite.src = 'assets/water.png';

        this.shopBuildingSprite = new Image();
        this.shopBuildingSprite.src = 'assets/shop.png';

        this.landmineSprite = new Image();
        this.landmineSprite.src = 'assets/mine.png';

        this.stoneSprite = new Image();
        this.stoneSprite.src = 'assets/rook1.png';

        this.stone2Sprite = new Image();
        this.stone2Sprite.src = 'assets/rook2.png';
    }

    clear(dt) {
        // Phase 30: Sky/Cloud Background (Floating Island effect)
        this._skyTime = (this._skyTime || 0) + (dt || 0.016);
        const scrollX = this._skyTime * 20;
        const scrollY = this._skyTime * 10;

        // Deep blue sky base
        this.ctx.fillStyle = '#0a0d14';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Simple procedural clouds (grid based for performance)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let i = -1; i < 5; i++) {
            for (let j = -1; j < 5; j++) {
                const x = ((i * 400 + scrollX) % (this.canvas.width + 400)) - 200;
                const y = ((j * 400 + scrollY) % (this.canvas.height + 400)) - 200;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 150, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    translate(x, y) { this.ctx.translate(x, y); }
}
