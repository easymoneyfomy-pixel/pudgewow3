export const TileType = {
    GROUND: 'ground',
    WATER: 'water',
    WALL: 'wall',
    OBSTACLE: 'obstacle',
    SPAWN_RED: 'spawn_red',
    SPAWN_BLUE: 'spawn_blue'
};

export class Tile {
    constructor(type) {
        this.type = type;

        // Свойства проходимости
        this.isWalkable = true;
        this.isHookable = true; // Можно ли хукать через это (вода - да, стены - нет)
        this.color = '#2a4b2a';

        switch (type) {
            case TileType.GROUND:
                this.color = '#2a4b2a';
                break;
            case TileType.WATER:
                this.isWalkable = false;
                this.color = '#1e3a5f';
                break;
            case TileType.WALL:
                this.isWalkable = false;
                this.isHookable = false;
                this.color = '#444';
                break;
            case TileType.OBSTACLE:
                this.isWalkable = false;
                this.isHookable = false;
                this.color = '#5d4037'; // Коричневый (дерево/камень)
                break;
            case TileType.SPAWN_RED:
                this.color = '#4a2a2a';
                break;
            case TileType.SPAWN_BLUE:
                this.color = '#2a2a4a';
                break;
        }
    }
}
