export class Camera {
    constructor(x, y, zoom = 1) {
        // Координаты центра камеры (в игровом мире X, Y)
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    }

    // Применить трансформацию перед рендерингом
    apply(renderer) {
        const panX = renderer.canvas.width / 2;
        const panY = renderer.canvas.height / 2;

        renderer.save();

        // Смещаем координатную сетку канваса так, чтобы центр экрана был в 0, 0
        renderer.translate(panX, panY);

        // Масштаб
        renderer.ctx.scale(this.zoom, this.zoom);

        // Смещение камеры в обратную сторону от целевой точки изометрического мира (screen offset)
        const targetScreen = renderer.worldToScreen(this.x, this.y);
        renderer.translate(-targetScreen.x, -targetScreen.y);
    }

    // Сбросить трансформацию
    release(renderer) {
        renderer.restore();
    }
}
