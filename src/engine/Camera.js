export class Camera {
    constructor(x, y, zoom = 1) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;

        this.shakeIntensity = 0;
        this.shakeDecay = 40;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    shake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    update(dt) {
        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity -= this.shakeDecay * dt;
            if (this.shakeIntensity < 0) {
                this.shakeIntensity = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }
    }

    apply(renderer) {
        const panX = renderer.canvas.width / 2;
        const panY = renderer.canvas.height / 2;

        renderer.save();

        // WC3 top-down: simply translate so camera target is at screen center
        renderer.translate(panX + this.shakeX - this.x, panY + this.shakeY - this.y);

        renderer.ctx.scale(this.zoom, this.zoom);
    }

    release(renderer) {
        renderer.restore();
    }
}
