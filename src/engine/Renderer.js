export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.tileWidth = 64;
        this.tileHeight = 32;
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    worldToScreen(worldX, worldY, worldZ = 0) {
        const screenX = (worldX - worldY);
        const screenY = (worldX + worldY) / 2 - worldZ;
        return { x: screenX, y: screenY };
    }

    screenToWorld(screenX, screenY) {
        const worldX = (screenY + screenX / 2);
        const worldY = (screenY - screenX / 2);
        return { x: worldX, y: worldY };
    }

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    translate(x, y) { this.ctx.translate(x, y); }

    drawIsoBlock(worldX, worldY, sizeX, sizeY, color, type = 'ground') {
        const p1 = this.worldToScreen(worldX, worldY);
        const p2 = this.worldToScreen(worldX + sizeX, worldY);
        const p3 = this.worldToScreen(worldX + sizeX, worldY + sizeY);
        const p4 = this.worldToScreen(worldX, worldY + sizeY);

        this.ctx.save();

        // ========== TREE ==========
        if (type === 'tree') {
            // Dark ground under tree
            this.ctx.fillStyle = '#0e220e';
            this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            this.ctx.lineWidth = 1;
            this._fillPath(p1, p2, p3, p4);

            const cx = (p1.x + p3.x) / 2;
            const cy = (p1.y + p3.y) / 2;

            // Trunk with detail
            this.ctx.fillStyle = '#3a2815';
            this.ctx.fillRect(cx - 3, cy - 28, 6, 28);
            this.ctx.fillStyle = '#2d1f0f';
            this.ctx.fillRect(cx - 1, cy - 28, 2, 28);

            // Multi-layer canopy (WC3 Ashenvale trees)
            const layers = [
                { y: -28, r: 18, c: '#1a5c20' },
                { y: -38, r: 14, c: '#1e6b28' },
                { y: -48, r: 10, c: '#22783a' },
                { y: -55, r: 6, c: '#28864a' },
            ];
            for (const l of layers) {
                this.ctx.fillStyle = l.c;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy + l.y, l.r, 0, Math.PI * 2);
                this.ctx.fill();
            }
            // Tree shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
            this.ctx.beginPath();
            this.ctx.ellipse(cx + 10, cy + 5, 14, 7, 0.3, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
            return;
        }

        // ========== SHOP (Building) ==========
        if (type === 'shop') {
            // Stone foundation
            this.ctx.fillStyle = '#3a3a3a';
            this.ctx.strokeStyle = '#222';
            this.ctx.lineWidth = 1;
            this._fillPath(p1, p2, p3, p4);

            const cx = (p1.x + p3.x) / 2;
            const cy = (p1.y + p3.y) / 2;

            // Building walls (raised block)
            const wallH = 30;
            this.ctx.fillStyle = '#6b4426';
            this.ctx.strokeStyle = '#3d2517';
            this.ctx.lineWidth = 1;

            // Front face
            this.ctx.beginPath();
            this.ctx.moveTo(p3.x, p3.y);
            this.ctx.lineTo(p3.x, p3.y - wallH);
            this.ctx.lineTo(p4.x, p4.y - wallH);
            this.ctx.lineTo(p4.x, p4.y);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();

            // Side face
            this.ctx.fillStyle = '#5a3820';
            this.ctx.beginPath();
            this.ctx.moveTo(p2.x, p2.y);
            this.ctx.lineTo(p2.x, p2.y - wallH);
            this.ctx.lineTo(p3.x, p3.y - wallH);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();

            // Roof top face
            this.ctx.fillStyle = '#c4a44a';
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y - wallH);
            this.ctx.lineTo(p2.x, p2.y - wallH);
            this.ctx.lineTo(p3.x, p3.y - wallH);
            this.ctx.lineTo(p4.x, p4.y - wallH);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();

            // Shop sign
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 12px Georgia';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏪', cx, cy - wallH - 5);

            this.ctx.restore();
            return;
        }

        // ========== RUNE ==========
        if (type === 'rune') {
            // Water base
            const waveOffset = Math.sin(Date.now() / 400 + worldX) * 3;
            const grad = this.ctx.createLinearGradient(p1.x, p1.y + waveOffset, p3.x, p3.y - waveOffset);
            grad.addColorStop(0, '#003366');
            grad.addColorStop(0.5, '#0055aa');
            grad.addColorStop(1, '#002244');
            this.ctx.fillStyle = grad;
            this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.ctx.lineWidth = 1;
            this._fillPath(p1, p2, p3, p4);

            // Glowing rune circle
            const cx = (p1.x + p3.x) / 2;
            const cy = (p1.y + p3.y) / 2;
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.restore();
            return;
        }

        // ========== WATER ==========
        if (type === 'water') {
            const t = Date.now() / 800;
            const waveOffset = Math.sin(t + worldX * 0.1 + worldY * 0.1) * 3;
            const grad = this.ctx.createLinearGradient(p1.x, p1.y + waveOffset, p3.x, p3.y - waveOffset);
            grad.addColorStop(0, '#002244');
            grad.addColorStop(0.3, '#004488');
            grad.addColorStop(0.7, '#005599');
            grad.addColorStop(1, '#002244');
            this.ctx.fillStyle = grad;
            this.ctx.strokeStyle = 'rgba(0,80,160,0.3)';
            this.ctx.lineWidth = 1;
            this._fillPath(p1, p2, p3, p4);

            // Wave highlights
            const cx = (p1.x + p3.x) / 2;
            const cy = (p1.y + p3.y) / 2;
            this.ctx.strokeStyle = `rgba(100,180,255,${0.15 + Math.sin(t + worldY) * 0.1})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 15, cy + Math.sin(t + worldX) * 3);
            this.ctx.lineTo(cx + 15, cy + Math.sin(t + worldX + 1) * 3);
            this.ctx.stroke();

            this.ctx.restore();
            return;
        }

        // ========== STONE WALL ==========
        if (type === 'stone') {
            // 3D stone wall (raised)
            const wallH = 20;

            // Top face
            this.ctx.fillStyle = '#555';
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y - wallH);
            this.ctx.lineTo(p2.x, p2.y - wallH);
            this.ctx.lineTo(p3.x, p3.y - wallH);
            this.ctx.lineTo(p4.x, p4.y - wallH);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();

            // Front face
            this.ctx.fillStyle = '#3a3a3a';
            this.ctx.beginPath();
            this.ctx.moveTo(p3.x, p3.y);
            this.ctx.lineTo(p3.x, p3.y - wallH);
            this.ctx.lineTo(p4.x, p4.y - wallH);
            this.ctx.lineTo(p4.x, p4.y);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();

            // Side face
            this.ctx.fillStyle = '#444';
            this.ctx.beginPath();
            this.ctx.moveTo(p2.x, p2.y);
            this.ctx.lineTo(p2.x, p2.y - wallH);
            this.ctx.lineTo(p3.x, p3.y - wallH);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();

            this.ctx.restore();
            return;
        }

        // ========== GRASS (default ground) ==========
        let fill = color;
        if (type === 'grass') {
            // Varied green grass like WC3
            const hash = (worldX * 7 + worldY * 13) % 100;
            const r = 30 + (hash % 15);
            const g = 70 + (hash % 30);
            const b = 25 + (hash % 10);
            fill = `rgb(${r}, ${g}, ${b})`;
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.lineWidth = 1;
        this._fillPath(p1, p2, p3, p4);

        // Grass detail dots
        if (type === 'grass') {
            const seed = worldX * 17 + worldY * 31;
            this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < 3; i++) {
                const dx = ((seed + i * 37) % 30) - 15;
                const dy = ((seed + i * 53) % 20) - 10;
                this.ctx.fillRect(p1.x + dx, p1.y + dy + 10, 2, 2);
            }
            // Occasional light grass tuft
            if (seed % 7 === 0) {
                this.ctx.fillStyle = 'rgba(80,140,60,0.4)';
                const cx = (p1.x + p3.x) / 2;
                const cy = (p1.y + p3.y) / 2;
                this.ctx.fillRect(cx - 1, cy - 3, 2, 5);
                this.ctx.fillRect(cx - 3, cy - 2, 2, 4);
            }
        }

        this.ctx.restore();
    }

    // Draw fog of war circle (darken everything outside player's vision)
    drawFogOfWar(playerScreenX, playerScreenY, visionRadius) {
        const ctx = this.ctx;
        ctx.save();

        // Create radial gradient for fog
        const gradient = ctx.createRadialGradient(
            playerScreenX, playerScreenY, visionRadius * 0.7,
            playerScreenX, playerScreenY, visionRadius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.restore();
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
