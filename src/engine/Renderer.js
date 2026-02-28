import { GAME } from '../shared/GameConstants.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = GAME.TILE_SIZE; // WC3-style tile size (64)
        this.assetsLoaded = false;
        this.assetsToLoad = 0;
        this.assetsLoadedCount = 0;

        // Load Sprites
        this.pudgeSprite = this._loadImage('assets/pudge.png');
        this.pudgeSprite5 = this._loadImage('assets/pudge_5lvl.png');
        this.direFloorSprite = this._loadImage('assets/graund.png');
        this.hookSprite = this._loadImage('assets/hook.png');
        this.flamingHookSprite = this._loadImage('assets/shop/flaming_hook.png');
        this.hookTipSprite = this._loadImage('assets/hook_body.png');
        this.hookLinkSprite = this._loadImage('assets/hook.png');
        this.treeSprite = this._loadImage('assets/tree.png');
        this.treeRedSprite = this._loadImage('assets/tree_red.png');
        this.waterSprite = this._loadImage('assets/water.png');
        this.shopBuildingSprite = this._loadImage('assets/shop.png');
        this.landmineSprite = this._loadImage('assets/shop/mine.png');
        this.stoneSprite = this._loadImage('assets/rook1.png');
        this.stone2Sprite = this._loadImage('assets/rook2.png');
    }

    _loadImage(src) {
        const img = new Image();
        img.src = src;
        this.assetsToLoad++;
        img.onload = () => {
            this.assetsLoadedCount++;
            console.log('[Renderer] Loaded:', src, `(${this.assetsLoadedCount}/${this.assetsToLoad})`);
            if (this.assetsLoadedCount >= this.assetsToLoad) {
                this.assetsLoaded = true;
                console.log('[Renderer] All assets loaded:', this.assetsLoadedCount);
            }
        };
        img.onerror = (err) => {
            console.error('[Renderer] FAILED to load image:', src, err);
            this.assetsLoadedCount++;
            if (this.assetsLoadedCount >= this.assetsToLoad) {
                this.assetsLoaded = true;
            }
        };
        return img;
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
