export const TileType = {
    GROUND: 'ground',
    WATER: 'water',
    WALL: 'wall',
    OBSTACLE: 'obstacle',
    SPAWN_RED: 'spawn_red',
    SPAWN_BLUE: 'spawn_blue',
    SHOP: 'shop',
    RUNE: 'rune'
};

export class Tile {
    constructor(type) {
        this.type = type;

        // Passability properties
        this.isWalkable = true;
        this.isHookable = true;

        switch (type) {
            case TileType.WATER:
                this.isWalkable = false;
                break;
            case TileType.WALL:
                this.isWalkable = false;
                this.isHookable = false;
                break;
            case TileType.OBSTACLE:
                this.isWalkable = false;
                this.isHookable = false;
                break;
            case TileType.SHOP:
                this.isWalkable = false;
                this.isHookable = false;
                break;
        }
    }
}
