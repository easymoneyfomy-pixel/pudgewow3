import { Tile, TileType } from './Tile.js';

export class GameMap {
    constructor(width, height, tileSize = 64) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.grid = [];

        this.generatePudgeWarsMap();
    }

    generatePudgeWarsMap() {
        // ============================================================
        // WC3 PUDGE WARS MAP LAYOUT
        // 24x24 grid — river divides map vertically (West RED / East BLUE)
        // Features: wide river, 3 bridges, dense tree corridors,
        //           fountains at each base, shops in corners
        // ============================================================

        // 1. Fill everything with ground
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.grid[x][y] = new Tile(TileType.GROUND);
            }
        }

        // 2. Thick outer walls (2-tile border like WC3)
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

        // 3. CENTRAL RIVER — 4 tiles wide (impassable except at bridges)
        // River runs vertically through middle: columns 10, 11, 12, 13
        const riverLeft = 10;
        const riverRight = 13;
        for (let y = 2; y < this.height - 2; y++) {
            for (let rx = riverLeft; rx <= riverRight; rx++) {
                this.grid[rx][y] = new Tile(TileType.WATER);
            }
        }

        // 4. THREE BRIDGES (walkable ground crossing the river)
        // Top bridge (y=5-6), Center bridge (y=11-12), Bottom bridge (y=17-18)
        const bridges = [
            { y1: 5, y2: 6 },
            { y1: 11, y2: 12 },
            { y1: 17, y2: 18 }
        ];
        for (const bridge of bridges) {
            for (let rx = riverLeft; rx <= riverRight; rx++) {
                this.grid[rx][bridge.y1] = new Tile(TileType.GROUND);
                this.grid[rx][bridge.y2] = new Tile(TileType.GROUND);
            }
        }

        // 5. HEALING FOUNTAINS — one at center of each bridge
        // Center bridge fountain (main one like WC3)
        this.grid[11][11] = new Tile(TileType.RUNE);
        this.grid[12][12] = new Tile(TileType.RUNE);
        // Secondary rune spots at top/bottom bridges
        this.grid[11][5] = new Tile(TileType.RUNE);
        this.grid[12][18] = new Tile(TileType.RUNE);

        // 6. SHOPS — 2 per team, in their base corners (like WC3)
        // Red shops (left side)
        this.grid[3][3] = new Tile(TileType.SHOP);
        this.grid[3][this.height - 4] = new Tile(TileType.SHOP);
        // Blue shops (right side)
        this.grid[this.width - 4][3] = new Tile(TileType.SHOP);
        this.grid[this.width - 4][this.height - 4] = new Tile(TileType.SHOP);

        // 7. SPAWN ZONES — 5 vertical tiles per team
        const midY = Math.floor(this.height / 2);
        for (let y = midY - 2; y <= midY + 2; y++) {
            this.grid[4][y] = new Tile(TileType.SPAWN_RED);
            this.grid[this.width - 5][y] = new Tile(TileType.SPAWN_BLUE);
        }

        // 8. TREES REMOVED (User requested an open arena map without trees)
        // DENSE TREE LINES — removed to create a clean geometric arena.

        // ---- WALL PILLARS along river banks (stone pillars like WC3) ----
        const riverPillars = [
            [10, 3], [10, 9], [10, 15], [10, 21],
            [13, 3], [13, 9], [13, 15], [13, 21],
        ];
        for (const [tx, ty] of riverPillars) {
            if (this.grid[tx][ty].type === TileType.WATER) {
                this.grid[tx][ty] = new Tile(TileType.WALL);
            }
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
                if (tile.type === TileType.SPAWN_RED) type = 'spawn_red';
                if (tile.type === TileType.SPAWN_BLUE) type = 'spawn_blue';

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
