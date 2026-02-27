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
        // Инициализируем пустую землю
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.grid[x][y] = new Tile(TileType.GROUND);
            }
        }

        // Рисуем границы (стены)
        for (let x = 0; x < this.width; x++) {
            this.grid[x][0] = new Tile(TileType.WALL);
            this.grid[x][this.height - 1] = new Tile(TileType.WALL);
        }
        for (let y = 0; y < this.height; y++) {
            this.grid[0][y] = new Tile(TileType.WALL);
            this.grid[this.width - 1][y] = new Tile(TileType.WALL);
        }

        // Центральная река (Warcraft 3 Pudge Wars style)
        const midX = Math.floor(this.width / 2);
        for (let y = 1; y < this.height - 1; y++) {
            this.grid[midX][y] = new Tile(TileType.WATER);
            this.grid[midX - 1][y] = new Tile(TileType.WATER);
        }

        // Добавляем мостик в центре
        const midY = Math.floor(this.height / 2);
        this.grid[midX][midY] = new Tile(TileType.GROUND);
        this.grid[midX - 1][midY] = new Tile(TileType.GROUND);

        // Симметричные препятствия
        this._addSymmetricalObstacle(3, 3);
        this._addSymmetricalObstacle(3, this.height - 4);

        // Зоны спавна
        this.grid[2][midY] = new Tile(TileType.SPAWN_RED);
        this.grid[this.width - 3][midY] = new Tile(TileType.SPAWN_BLUE);
    }

    _addSymmetricalObstacle(x, y) {
        // Добавляем препятствие и его зеркальное отражение
        this.grid[x][y] = new Tile(TileType.OBSTACLE);
        this.grid[this.width - 1 - x][this.height - 1 - y] = new Tile(TileType.OBSTACLE);
    }

    render(renderer) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                let type = 'ground';
                if (tile.type === TileType.WATER) type = 'water';
                if (tile.type === TileType.GROUND || tile.type === TileType.SPAWN_RED || tile.type === TileType.SPAWN_BLUE) type = 'grass';
                if (tile.type === TileType.WALL) type = 'stone';
                if (tile.type === TileType.OBSTACLE) type = 'tree';

                renderer.drawIsoBlock(
                    x * this.tileSize,
                    y * this.tileSize,
                    this.tileSize,
                    this.tileSize,
                    tile.color,
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
