import { Tile, TileType } from './Tile.js';

export class GameMap {
    constructor(width, height, tileSize = 64) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.grid = [];
        this._animTime = 0;

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

        // 8. TREES / OBSTACLES (Classic WC3 Forest Borders)
        // Add thick tree lines along the top and bottom edges (just inside the border walls)
        for (let x = 2; x < this.width - 2; x++) {
            // Top trees
            this.grid[x][2] = new Tile(TileType.OBSTACLE);
            this.grid[x][3] = new Tile(TileType.OBSTACLE);
            // Bottom trees
            this.grid[x][this.height - 3] = new Tile(TileType.OBSTACLE);
            this.grid[x][this.height - 4] = new Tile(TileType.OBSTACLE);
        }

        // Clear paths down the center for the river and bridges
        for (let x = riverLeft - 1; x <= riverRight + 1; x++) {
            this.grid[x][2] = new Tile(TileType.GROUND);
            this.grid[x][3] = new Tile(TileType.GROUND);
            this.grid[x][this.height - 3] = new Tile(TileType.GROUND);
            this.grid[x][this.height - 4] = new Tile(TileType.GROUND);
        }

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

    render(renderer, dt) {
        this._animTime += dt || 0.05;

        const ctx = renderer.ctx;

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                const size = this.tileSize;

                if (tile.type === TileType.GROUND) {
                    ctx.fillStyle = '#22301a'; // Dark WC3 grass
                    ctx.fillRect(px, py, size, size);

                    // Simple grass speckles
                    ctx.fillStyle = '#2a3a22';
                    ctx.fillRect(px + 10, py + 10, 4, 4);
                    ctx.fillRect(px + 40, py + 30, 4, 4);
                }
                else if (tile.type === TileType.WATER) {
                    // Deep water gradient with simple wave animation
                    const waveOffset = Math.sin(this._animTime * 2 + y * 0.5) * 5;
                    const grad = ctx.createLinearGradient(px, py, px + size, py + size);
                    grad.addColorStop(0, '#002244');
                    grad.addColorStop(1, '#004488');
                    ctx.fillStyle = grad;
                    ctx.fillRect(px, py, size, size);

                    // Highlights moving across water
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(px + size / 2 + waveOffset, py + size / 2, size / 4, size / 8);
                }
                else if (tile.type === TileType.WALL) {
                    // Stone pillars/walls
                    ctx.fillStyle = '#2a2a2a';
                    ctx.fillRect(px, py, size, size);

                    // Wall bevel
                    ctx.fillStyle = '#444';
                    ctx.fillRect(px, py, size, 4);
                    ctx.fillRect(px, py, 4, size);
                    ctx.fillStyle = '#111';
                    ctx.fillRect(px, py + size - 4, size, 4);
                    ctx.fillRect(px + size - 4, py, 4, size);
                }
                else if (tile.type === TileType.OBSTACLE) {
                    // Trees (WC3 style pines/forest)
                    ctx.fillStyle = '#1b3a1a'; // Darker forest green floor
                    ctx.fillRect(px, py, size, size);

                    // Draw a simple tree shape (triangle/cone)
                    ctx.fillStyle = '#115511';
                    ctx.beginPath();
                    ctx.moveTo(px + size / 2, py + 5); // Peak
                    ctx.lineTo(px + size - 5, py + size - 10);
                    ctx.lineTo(px + 5, py + size - 10);
                    ctx.closePath();
                    ctx.fill();

                    // Tree shadow/depth
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath();
                    ctx.moveTo(px + size / 2, py + 5);
                    ctx.lineTo(px + size - 5, py + size - 10);
                    ctx.lineTo(px + size / 2, py + size - 10);
                    ctx.closePath();
                    ctx.fill();
                }
                else if (tile.type === TileType.SHOP) {
                    // Shop pad
                    ctx.fillStyle = '#3a2a1a';
                    ctx.fillRect(px, py, size, size);

                    ctx.strokeStyle = '#c4a44a';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 4, py + 4, size - 8, size - 8);

                    // Gold symbol
                    ctx.fillStyle = '#f0d78c';
                    ctx.font = '24px Georgia';
                    ctx.textAlign = 'center';
                    ctx.fillText('⚖', px + size / 2, py + size / 2 + 8);
                }
                else if (tile.type === TileType.RUNE) {
                    ctx.fillStyle = '#1a221a';
                    ctx.fillRect(px, py, size, size);

                    // Glowing healing rune
                    const glowParams = Math.abs(Math.sin(this._animTime * 3)) * 20;
                    ctx.shadowBlur = 10 + glowParams;
                    ctx.shadowColor = '#00ff00';
                    ctx.fillStyle = '#00aa00';
                    ctx.beginPath();
                    ctx.arc(px + size / 2, py + size / 2, size / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0; // Reset
                }
                else if (tile.type === TileType.SPAWN_RED) {
                    ctx.fillStyle = '#3a1a1a';
                    ctx.fillRect(px, py, size, size);
                    ctx.strokeStyle = '#ff4444';
                    ctx.strokeRect(px + 4, py + 4, size - 8, size - 8);
                }
                else if (tile.type === TileType.SPAWN_BLUE) {
                    ctx.fillStyle = '#1a1a3a';
                    ctx.fillRect(px, py, size, size);
                    ctx.strokeStyle = '#4488ff';
                    ctx.strokeRect(px + 4, py + 4, size - 8, size - 8);
                }
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
