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
        for (let x = 0; x < this.width; x++) {
            for (let b = 0; b < 2; b++) {
                this.grid[x][b] = new Tile(TileType.OBSTACLE);
                this.grid[x][this.height - 1 - b] = new Tile(TileType.OBSTACLE);
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let b = 0; b < 2; b++) {
                this.grid[b][y] = new Tile(TileType.OBSTACLE);
                this.grid[this.width - 1 - b][y] = new Tile(TileType.OBSTACLE);
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

        // 5. SHOPS — 4 corners of the open arena (like WC3)
        // Red shops (left side corners)
        this.grid[2][2] = new Tile(TileType.SHOP);
        this.grid[2][this.height - 3] = new Tile(TileType.SHOP);
        // Blue shops (right side corners)
        this.grid[this.width - 3][2] = new Tile(TileType.SHOP);
        this.grid[this.width - 3][this.height - 3] = new Tile(TileType.SHOP);

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

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                const size = this.tileSize;

                if (tile.type === TileType.GROUND) {
                    if (x >= 14 && renderer.direFloorSprite && renderer.direFloorSprite.complete) {
                        ctx.drawImage(renderer.direFloorSprite, px, py, size, size);
                    } else {
                        // WC3 Ashenvale/Felwood style dark bluish-green grass
                        ctx.fillStyle = '#1e2420';
                        ctx.fillRect(px, py, size, size);

                        // Slightly lighter/bluish grass speckles (original polish)
                        ctx.fillStyle = '#26302a';
                        ctx.fillRect(px + 10, py + 10, 4, 4);
                        ctx.fillRect(px + 40, py + 30, 4, 4);
                    }
                }
                else if (tile.type === TileType.WATER) {
                    // Dark swampy/felwood water (Using assets/water.png)
                    if (renderer.waterSprite && renderer.waterSprite.complete) {
                        ctx.drawImage(renderer.waterSprite, px, py, size, size);
                    } else {
                        const waveOffset = Math.sin(this._animTime * 2 + y * 0.5) * 5;
                        const grad = ctx.createLinearGradient(px, py, px + size, py + size);
                        grad.addColorStop(0, '#0a1d1d');
                        grad.addColorStop(1, '#113333');
                        ctx.fillStyle = grad;
                        ctx.fillRect(px, py, size, size);

                        // Subtle highlights
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(px + size / 2 + waveOffset, py + size / 2, size / 4, size / 8);
                    }
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
                    // Trees (WC3 Ashenvale/Felwood dark pines)
                    ctx.fillStyle = '#141a14'; // Darker forest green floor
                    ctx.fillRect(px, py, size, size);

                    // Organic Tree Placement: Spaced out for beauty, but collision remains grid-square
                    const seed = (x * 12.9898 + y * 78.233) * 43758.5453;
                    const rand = seed - Math.floor(seed);

                    // 55% chance to have a tree sprite on this obstacle tile
                    if (rand > 0.45) {
                        const treeSprite = rand > 0.82 ? renderer.treeRedSprite : renderer.treeSprite;
                        if (treeSprite && treeSprite.complete) {
                            ctx.save();
                            ctx.translate(px + size / 2, py + size / 2);

                            // Visual Jitter for organic look
                            const scale = 1.3 + (rand * 0.5);
                            const rotation = (rand - 0.5) * 0.4;
                            ctx.rotate(rotation);

                            ctx.drawImage(treeSprite, -size * scale / 2, -size * scale / 2, size * scale, size * scale);
                            ctx.restore();
                        } else {
                            // Fallback tree shape
                            ctx.fillStyle = '#1c3624';
                            ctx.beginPath();
                            ctx.moveTo(px + size / 2, py + 5);
                            ctx.lineTo(px + size - 5, py + size - 10);
                            ctx.lineTo(px + 5, py + size - 10);
                            ctx.closePath();
                            ctx.fill();
                        }
                    }
                }
                else if (tile.type === TileType.SHOP) {
                    // Shop Pad with Buildings/Assets
                    if (renderer.shopBuildingSprite && renderer.shopBuildingSprite.complete) {
                        const scale = 1.2;
                        ctx.drawImage(renderer.shopBuildingSprite, px - (size * (scale - 1)) / 2, py - (size * (scale - 1)) / 2, size * scale, size * scale);
                    } else {
                        ctx.fillStyle = '#3a2a1a';
                        ctx.fillRect(px, py, size, size);
                        ctx.strokeStyle = '#c4a44a';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px + 4, py + 4, size - 8, size - 8);
                        ctx.fillStyle = '#f0d78c';
                        ctx.font = '24px Georgia';
                        ctx.textAlign = 'center';
                        ctx.fillText('⚖', px + size / 2, py + size / 2 + 8);
                    }
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
                else if (tile.type === TileType.SPAWN_RED || tile.type === TileType.SPAWN_BLUE) {
                    // WC3 Pudge Wars: spawn zones look like regular ground (no colored lines)
                    ctx.fillStyle = '#1e2420';
                    ctx.fillRect(px, py, size, size);
                    ctx.fillStyle = '#26302a';
                    ctx.fillRect(px + 10, py + 10, 4, 4);
                    ctx.fillRect(px + 40, py + 30, 4, 4);
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
