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
    // Используем классическую пропорцию 2:1 для WC3 стиля
    worldToScreen(worldX, worldY, worldZ = 0) {
        const screenX = (worldX - worldY);
        const screenY = (worldX + worldY) / 2 - worldZ;
        return { x: screenX, y: screenY };
    }

    // Обратный перевод экранных (изометрических) координат в мировые
    screenToWorld(screenX, screenY) {
        const worldX = (screenY + screenX / 2);
        const worldY = (screenY - screenX / 2);
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

    // Рисование текстурированного или градиентного блока (земля, вода и т.д.)
    drawIsoBlock(worldX, worldY, sizeX, sizeY, color, type = 'ground') {
        const p1 = this.worldToScreen(worldX, worldY);
        const p2 = this.worldToScreen(worldX + sizeX, worldY);
        const p3 = this.worldToScreen(worldX + sizeX, worldY + sizeY);
        const p4 = this.worldToScreen(worldX, worldY + sizeY);

        this.ctx.save();

        // Создаем градиент для объема или текстуры
        let fill = color;
        if (type === 'water') {
            const grad = this.ctx.createLinearGradient(p1.x, p1.y, p3.x, p3.y);
            grad.addColorStop(0, '#004488');
            grad.addColorStop(1, '#002244');
            fill = grad;
        } else if (type === 'grass') {
            const grad = this.ctx.createRadialGradient(p1.x, p3.y, 10, p1.x, p3.y, 100);
            grad.addColorStop(0, '#225522');
            grad.addColorStop(1, '#113311');
            fill = grad;
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();

        // Добавляем "шум" или детализацию для стиля WC3
        if (type === 'ground' || type === 'grass') {
            this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for (let i = 0; i < 3; i++) {
                this.ctx.fillRect(p1.x + Math.random() * 20 - 10, p1.y + Math.random() * 20, 2, 2);
            }
        }

        this.ctx.restore();
    }
}
