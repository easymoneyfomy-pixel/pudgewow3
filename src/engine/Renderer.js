export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Размеры тайла (изометрия)
        // Для WC3 стиля ширина в 2 раза больше высоты — классика изометрии (угол обзора ~30 градусов)
        this.tileWidth = 64;
        this.tileHeight = 32;
    }

    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Перевод мировых координат (X, Y 2D сетка) в экранные изметрические координаты
    worldToScreen(worldX, worldY, worldZ = 0) {
        const screenX = (worldX - worldY) * (this.tileWidth / 2);
        const screenY = (worldX + worldY) * (this.tileHeight / 2) - worldZ;
        return { x: screenX, y: screenY };
    }

    // Обратный перевод экранных (изометрических) координат в мировые (предполагаем base Z = 0)
    screenToWorld(screenX, screenY) {
        const x_prime = screenX / (this.tileWidth / 2);
        const y_prime = screenY / (this.tileHeight / 2);

        const worldX = (y_prime + x_prime) / 2;
        const worldY = (y_prime - x_prime) / 2;

        return { x: worldX, y: worldY };
    }

    save() {
        this.ctx.save();
    }

    restore() {
        this.ctx.restore();
    }

    translate(x, y) {
        this.ctx.translate(x, y);
    }

    // Вспомогательная функция рисования изометрического тайла (например, для сетки земли)
    drawIsoBlock(worldX, worldY, sizeX, sizeY, color) {
        // Вычисляем углы
        const p1 = this.worldToScreen(worldX, worldY);
        const p2 = this.worldToScreen(worldX + sizeX, worldY);
        const p3 = this.worldToScreen(worldX + sizeX, worldY + sizeY);
        const p4 = this.worldToScreen(worldX, worldY + sizeY);

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();
    }
}
