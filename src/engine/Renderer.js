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

        if (type === 'tree') {
            // Рисуем подножие дерева
            this.ctx.fillStyle = '#113311';
            this._fillPath(p1, p2, p3, p4);

            const cx = p1.x;
            const cy = p1.y + (p3.y - p1.y) / 2 - 10;

            // Ствол
            this.ctx.fillStyle = '#4a3320';
            this.ctx.fillRect(cx - 4, cy - 20, 8, 20);

            // Крона (несколько кругов как сосна)
            this.ctx.fillStyle = '#1e4d2b';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy - 20, 16, 0, Math.PI * 2);
            this.ctx.arc(cx, cy - 35, 12, 0, Math.PI * 2);
            this.ctx.arc(cx, cy - 50, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#0a2910';
            this.ctx.stroke();

            this.ctx.restore();
            return;
        }

        if (type === 'shop') {
            // Draw stone foundation
            this.ctx.fillStyle = '#444';
            this._fillPath(p1, p2, p3, p4);

            const cx = p1.x;
            const cy = p1.y + (p3.y - p1.y) / 2;

            // Simple building block
            this.ctx.fillStyle = '#8b5a2b'; // Wood color
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y - 20);
            this.ctx.lineTo(p2.x, p2.y - 20);
            this.ctx.lineTo(p3.x, p3.y - 20);
            this.ctx.lineTo(p4.x, p4.y - 20);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Roof (yellow/goldish)
            this.ctx.fillStyle = '#cdb38b';
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y - 20);
            this.ctx.lineTo(p2.x, p2.y - 20);
            this.ctx.lineTo(cx, p1.y - 50); // Peak
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(p2.x, p2.y - 20);
            this.ctx.lineTo(p3.x, p3.y - 20);
            this.ctx.lineTo(cx, p1.y - 50);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.restore();
            return;
        }

        // Создаем градиент для объема или текстуры
        let fill = color;
        if (type === 'water') {
            const waveOffset = Math.sin(Date.now() / 500 + worldX) * 5;
            const grad = this.ctx.createLinearGradient(p1.x, p1.y + waveOffset, p3.x, p3.y - waveOffset);
            grad.addColorStop(0, '#004488');
            grad.addColorStop(0.5, '#0066aa');
            grad.addColorStop(1, '#002244');
            fill = grad;
        } else if (type === 'grass') {
            const grad = this.ctx.createRadialGradient(p1.x, p3.y, 10, p1.x, p3.y, 100);
            grad.addColorStop(0, '#2d5a27');
            grad.addColorStop(1, '#1a3c16');
            fill = grad;
        } else if (type === 'stone') {
            fill = '#555';
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.ctx.lineWidth = 1;

        this._fillPath(p1, p2, p3, p4);

        // Добавляем "шум" или детализацию для стиля WC3
        if (type === 'ground' || type === 'grass') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
            for (let i = 0; i < 4; i++) {
                this.ctx.fillRect(p1.x + Math.random() * 20 - 10, p1.y + Math.random() * 20, 3, 3);
            }
        }

        this.ctx.restore();
    }

    _fillPath(p1, p2, p3, p4) {
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
