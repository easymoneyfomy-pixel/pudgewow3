export class Camera {
    constructor(x, y, zoom = 1) {
        this.x = x;
        this.y = y;
        this.zoom = 1.3; // Locked in Phase 30 for tactical parity

        this.shakeIntensity = 0;
        this.shakeDecay = 40;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    setZoom(val) {
        // Locked in Phase 30
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

        // Scale first, then translate so zoom is relative to screen center
        renderer.ctx.scale(this.zoom, this.zoom);
        renderer.translate(panX / this.zoom + this.shakeX - this.x, panY / this.zoom + this.shakeY - this.y);
    }

    release(renderer) {
        renderer.restore();
    }
}
