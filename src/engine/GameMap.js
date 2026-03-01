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
        // WC3 PUDGE WARS MAP LAYOUT (AUTHENTIC RECREATION)
        // 24x24 grid — an open square arena divided by a wide river.
        // There are no trees or corridors inside the arena.
        // Trees/Walls only exist on the very outer boundary.
        // Shops are located in the 4 corners of the map.
        // ============================================================

        // 1. Fill everything with walkable ground (open arena)
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.grid[x][y] = new Tile(TileType.GROUND);
            }
        }

        // 2. Thick outer impenetrable boundary (Trees/Obstacles)
        // In WC3, the arena is bordered by dense Felwood trees
        // Mix trees and stones for variety (no gaps)
        for (let x = 0; x < this.width; x++) {
            for (let b = 0; b < 2; b++) {
                this.grid[x][b] = new Tile(TileType.OBSTACLE);
                this.grid[x][this.height - 1 - b] = new Tile(TileType.OBSTACLE);
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let b = 0; b < 2; b++) {
                // Mix trees and stones for organic look
                if ((b + y) % 3 === 0) {
                    this.grid[b][y] = new Tile(TileType.STONE);
                    this.grid[this.width - 1 - b][y] = new Tile(TileType.STONE);
                } else {
                    this.grid[b][y] = new Tile(TileType.OBSTACLE);
                    this.grid[this.width - 1 - b][y] = new Tile(TileType.OBSTACLE);
                }
            }
        }

        // 3. CENTRAL RIVER — divides map vertically (impassable but hooks fly over)
        // River runs vertically through middle: columns 10, 11, 12, 13
        const riverLeft = 10;
        const riverRight = 13;
        for (let y = 2; y < this.height - 2; y++) {
            for (let rx = riverLeft; rx <= riverRight; rx++) {
                this.grid[rx][y] = new Tile(TileType.WATER);
            }
        }

        // 4. MAIN HEALING FOUNTAIN (Center of the river)
        this.grid[11][11] = new Tile(TileType.RUNE);
        this.grid[12][12] = new Tile(TileType.RUNE);

        // 5. SHOPS — 2x2 in each corner of the open arena (like WC3)
        // Each shop is a single 2x2 object (one building)
        // Red shops (left side corners) - 2x2 size
        for (let sx = 1; sx <= 2; sx++) {
            for (let sy = 1; sy <= 2; sy++) {
                this.grid[sx][sy] = new Tile(TileType.SHOP);
                this.grid[sx][this.height - 1 - sy] = new Tile(TileType.SHOP);
            }
        }
        // Blue shops (right side corners) - 2x2 size
        for (let sx = 1; sx <= 2; sx++) {
            for (let sy = 1; sy <= 2; sy++) {
                this.grid[this.width - 1 - sx][sy] = new Tile(TileType.SHOP);
                this.grid[this.width - 1 - sx][this.height - 1 - sy] = new Tile(TileType.SHOP);
            }
        }

        // 6. SPAWN ZONES — Vertical strips behind the shops/near edges
        const midY = Math.floor(this.height / 2);
        for (let y = midY - 3; y <= midY + 3; y++) {
            this.grid[3][y] = new Tile(TileType.SPAWN_RED);
            this.grid[this.width - 4][y] = new Tile(TileType.SPAWN_BLUE);
        }

    }

    render(renderer, dt) {
        this._animTime += dt || 0.05;
        const ctx = renderer.ctx;
        const size = this.tileSize;

        // 1. FIRST PASS: DRAW GROUND & WATER ON ALL TILES
        // This prevents transparency gaps/bleeding when drawing trees/shops on top
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const px = x * size;
                const py = y * size;
                const tile = this.grid[x][y];

                // Base Ground ( Felwood dark green )
                if (x >= 14 && renderer.direFloorSprite && renderer.direFloorSprite.complete) {
                    ctx.drawImage(renderer.direFloorSprite, px, py, size, size);
                } else {
                    ctx.fillStyle = '#1e2420';
                    ctx.fillRect(px, py, size, size);
                    ctx.fillStyle = '#26302a';
                    ctx.fillRect(px + 10, py + 10, 4, 4);
                    ctx.fillRect(px + 40, py + 30, 4, 4);
                }

                // Water Over Ground (if applicable)
                if (tile.type === TileType.WATER) {
                    if (renderer.waterSprite && renderer.waterSprite.complete) {
                        ctx.drawImage(renderer.waterSprite, px, py, size, size);
                    } else {
                        const waveOffset = Math.sin(this._animTime * 2 + y * 0.5) * 5;
                        const grad = ctx.createLinearGradient(px, py, px + size, py + size);
                        grad.addColorStop(0, '#0a1d1d');
                        grad.addColorStop(1, '#113333');
                        ctx.fillStyle = grad;
                        ctx.fillRect(px, py, size, size);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(px + size / 2 + waveOffset, py + size / 2, size / 4, size / 8);
                    }
                }
            }
        }

        // 2. SECOND PASS: DRAW DECORATIONS (TREES, STONES, SHOPS, RUNES)
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const px = x * size;
                const py = y * size;
                const tile = this.grid[x][y];

                if (tile.type === TileType.OBSTACLE) {
                    const seed = (x * 12.9898 + y * 78.233) * 43758.5453;
                    const rand = seed - Math.floor(seed);
                    const treeSprite = rand > 0.82 ? renderer.treeRedSprite : renderer.treeSprite;

                    if (treeSprite && treeSprite.complete && treeSprite.naturalWidth > 0) {
                        ctx.save();
                        ctx.translate(px + size / 2, py + size / 2);
                        const scale = 1.3 + (rand * 0.5);
                        const rotation = (rand - 0.5) * 0.4;
                        ctx.rotate(rotation);
                        ctx.drawImage(treeSprite, -size * scale / 2, -size * scale / 2, size * scale, size * scale);
                        ctx.restore();
                    }
                }
                else if (tile.type === TileType.STONE) {
                    const stoneSeed = (x * 12.9898 + y * 78.233) * 43758.5453;
                    const stoneRand = stoneSeed - Math.floor(stoneSeed);
                    const stoneSprite = stoneRand > 0.5 ? renderer.stone2Sprite : renderer.stoneSprite;

                    if (stoneSprite && stoneSprite.complete && stoneSprite.naturalWidth > 0) {
                        ctx.drawImage(stoneSprite, px, py, size, size);
                    } else {
                        ctx.fillStyle = '#444';
                        ctx.fillRect(px + 4, py + 4, size - 8, size - 8);
                    }
                }
                else if (tile.type === TileType.SHOP) {
                    if (renderer.shopBuildingSprite && renderer.shopBuildingSprite.complete && renderer.shopBuildingSprite.naturalWidth > 0) {
                        const scale = 1.25;
                        ctx.drawImage(renderer.shopBuildingSprite, px - (size * (scale - 1)) / 2, py - (size * (scale - 1)) / 4, size * scale, size * scale);
                    }
                }
                else if (tile.type === TileType.RUNE) {
                    const glowParams = Math.abs(Math.sin(this._animTime * 3)) * 20;
                    ctx.shadowBlur = 10 + glowParams;
                    ctx.shadowColor = '#00ff00';
                    ctx.fillStyle = '#00aa00';
                    ctx.beginPath();
                    ctx.arc(px + size / 2, py + size / 2, size / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
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
