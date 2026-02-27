import { Tile, TileType } from './Tile.js';

export class GameMap {
    constructor(width, height, tileSize = 64) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.grid = [];

        this.generateSymmetricalArena();
    }

    generateSymmetricalArena() {
        // Initialize ground
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.grid[x][y] = new Tile(TileType.GROUND);
            }
        }

        // Outer walls (thick border like WC3)
        for (let x = 0; x < this.width; x++) {
            for (let b = 0; b < 2; b++) {
                this.grid[x][b] = new Tile(TileType.WALL);
                this.grid[x][this.height - 1 - b] = new Tile(TileType.WALL);
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let b = 0; b < 2; b++) {
                this.grid[b][y] = new Tile(TileType.WALL);
                this.grid[this.width - 1 - b][y] = new Tile(TileType.WALL);
            }
        }

        // Central river (vertical, 3 tiles wide — authentic WC3 style)
        const midX = Math.floor(this.width / 2);
        for (let y = 2; y < this.height - 2; y++) {
            this.grid[midX - 1][y] = new Tile(TileType.WATER);
            this.grid[midX][y] = new Tile(TileType.WATER);
            this.grid[midX + 1][y] = new Tile(TileType.WATER);
        }

        // Bridge at center (walkable crossing)
        const midY = Math.floor(this.height / 2);
        this.grid[midX - 1][midY] = new Tile(TileType.GROUND);
        this.grid[midX][midY] = new Tile(TileType.GROUND);
        this.grid[midX + 1][midY] = new Tile(TileType.GROUND);
        this.grid[midX - 1][midY - 1] = new Tile(TileType.GROUND);
        this.grid[midX][midY - 1] = new Tile(TileType.GROUND);
        this.grid[midX + 1][midY - 1] = new Tile(TileType.GROUND);

        // Healing fountain spots at the bridge center
        this.grid[midX][midY] = new Tile(TileType.RUNE);

        // Rune spawn spots (top and bottom of river)
        this.grid[midX][4] = new Tile(TileType.RUNE);
        this.grid[midX][this.height - 5] = new Tile(TileType.RUNE);

        // Shops (corners of each base like WC3 — 2 per side)
        this.grid[3][3] = new Tile(TileType.SHOP);
        this.grid[3][this.height - 4] = new Tile(TileType.SHOP);
        this.grid[this.width - 4][3] = new Tile(TileType.SHOP);
        this.grid[this.width - 4][this.height - 4] = new Tile(TileType.SHOP);

        // Forest dense tree lines (Left side forests — RED base)
        const treePatterns = [
            // Left side trees (corridors / cover like WC3)
            [4, 4], [4, 6], [4, 8], [4, 10], [4, 12], [4, 14], [4, 16], [4, 18], [4, 20],
            [5, 5], [5, 9], [5, 13], [5, 17], [5, 21],
            [6, 4], [6, 8], [6, 14], [6, 20],
            [3, 7], [3, 11], [3, 15], [3, 19],
        ];

        for (const [tx, ty] of treePatterns) {
            if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
                if (this.grid[tx][ty].type === TileType.GROUND) {
                    this.grid[tx][ty] = new Tile(TileType.OBSTACLE);
                }
            }
            // Mirror for blue side
            const mx = this.width - 1 - tx;
            const my = this.height - 1 - ty;
            if (mx >= 0 && mx < this.width && my >= 0 && my < this.height) {
                if (this.grid[mx][my].type === TileType.GROUND) {
                    this.grid[mx][my] = new Tile(TileType.OBSTACLE);
                }
            }
        }

        // Scattered center-area trees for extra cover (symmetric)
        const centerTrees = [
            [8, 5], [8, 10], [8, 15], [8, 20],
            [7, 7], [7, 12], [7, 17],
        ];
        for (const [tx, ty] of centerTrees) {
            if (this.grid[tx][ty].type === TileType.GROUND) {
                this.grid[tx][ty] = new Tile(TileType.OBSTACLE);
            }
            const mx = this.width - 1 - tx;
            const my = this.height - 1 - ty;
            if (this.grid[mx][my].type === TileType.GROUND) {
                this.grid[mx][my] = new Tile(TileType.OBSTACLE);
            }
        }

        // Spawn zones (5 tiles vertically for 5v5)
        for (let y = midY - 2; y <= midY + 2; y++) {
            this.grid[4][y] = new Tile(TileType.SPAWN_RED);
            this.grid[this.width - 5][y] = new Tile(TileType.SPAWN_BLUE);
        }
    }

    render(renderer) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                let type = 'grass';
                if (tile.type === TileType.WATER) type = 'water';
                if (tile.type === TileType.WALL) type = 'stone';
                if (tile.type === TileType.OBSTACLE) type = 'tree';
                if (tile.type === TileType.SHOP) type = 'shop';
                if (tile.type === TileType.RUNE) type = 'rune';

                renderer.drawTile(
                    x * this.tileSize,
                    y * this.tileSize,
                    this.tileSize,
                    type
                );
            }
        }
    }

    getTileAt(worldX, worldY) {
        const gridX = Math.floor(worldX / this.tileSize);
        const gridY = Math.floor(worldY / this.tileSize);

        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            return this.grid[gridX][gridY];
        }
        return null;
    }

    isWalkable(worldX, worldY) {
        const tile = this.getTileAt(worldX, worldY);
        return tile ? tile.isWalkable : false;
    }
}
