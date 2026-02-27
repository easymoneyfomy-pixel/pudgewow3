export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = 48; // WC3-style tile size
    }

    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // WC3 uses a top-down view, not isometric diamonds
    worldToScreen(worldX, worldY, worldZ = 0) {
        return { x: worldX, y: worldY - worldZ };
    }

    screenToWorld(screenX, screenY) {
        return { x: screenX, y: screenY };
    }

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    translate(x, y) { this.ctx.translate(x, y); }

    drawTile(worldX, worldY, size, type = 'grass') {
        const ctx = this.ctx;
        ctx.save();

        // ========== GRASS ==========
        if (type === 'grass') {
            const hash = (worldX * 7 + worldY * 13) % 100;
            const g = 55 + (hash % 25);
            ctx.fillStyle = `rgb(${25 + (hash % 10)}, ${g}, ${20 + (hash % 8)})`;
            ctx.fillRect(worldX, worldY, size, size);
            // Subtle grid lines
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(worldX, worldY, size, size);
            // Grass tufts
            const seed = worldX * 17 + worldY * 31;
            if (seed % 5 === 0) {
                ctx.fillStyle = 'rgba(40,80,30,0.3)';
                const cx = worldX + size / 2;
                const cy = worldY + size / 2;
                ctx.fillRect(cx - 1, cy - 3, 2, 5);
                ctx.fillRect(cx + 3, cy - 2, 2, 4);
            }
        }

        // ========== WATER ==========
        else if (type === 'water') {
            const t = Date.now() / 1000;
            const wave = Math.sin(t + worldX * 0.05 + worldY * 0.05) * 8;
            ctx.fillStyle = `rgb(${15 + Math.floor(wave)}, ${40 + Math.floor(wave)}, ${90 + Math.floor(wave * 2)})`;
            ctx.fillRect(worldX, worldY, size, size);
            // Wave shimmer
            ctx.strokeStyle = `rgba(80,150,220,${0.15 + Math.sin(t * 2 + worldY * 0.1) * 0.1})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const mid = worldY + size / 2;
            ctx.moveTo(worldX, mid + Math.sin(t + worldX * 0.1) * 3);
            ctx.lineTo(worldX + size, mid + Math.sin(t + (worldX + size) * 0.1) * 3);
            ctx.stroke();
        }

        // ========== STONE WALL ==========
        else if (type === 'stone') {
            // Dark raised wall
            ctx.fillStyle = '#3a3530';
            ctx.fillRect(worldX, worldY, size, size);
            ctx.fillStyle = '#555045';
            ctx.fillRect(worldX + 2, worldY + 2, size - 4, size - 6);
            // Brick pattern
            ctx.strokeStyle = '#2a2520';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldX + 4, worldY + 4, size / 2 - 4, size / 2 - 4);
            ctx.strokeRect(worldX + size / 2, worldY + size / 2 - 2, size / 2 - 4, size / 2 - 4);
        }

        // ========== TREE ==========
        else if (type === 'tree') {
            // Dark ground under tree
            ctx.fillStyle = '#1a3318';
            ctx.fillRect(worldX, worldY, size, size);
            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            // Trunk
            ctx.fillStyle = '#3a2815';
            ctx.fillRect(cx - 3, cy - 2, 6, 12);
            // Canopy layers (WC3 Ashenvale)
            const layers = [
                { r: 16, c: '#1a5020' },
                { r: 12, c: '#1e6028' },
                { r: 8, c: '#22703a' },
            ];
            for (const l of layers) {
                ctx.fillStyle = l.c;
                ctx.beginPath();
                ctx.arc(cx, cy - 6, l.r, 0, Math.PI * 2);
                ctx.fill();
            }
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(cx + 5, cy + 8, 10, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== SHOP ==========
        else if (type === 'shop') {
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(worldX, worldY, size, size);
            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            // Building
            ctx.fillStyle = '#6b4426';
            ctx.strokeStyle = '#3d2517';
            ctx.lineWidth = 2;
            ctx.fillRect(worldX + 6, worldY + 6, size - 12, size - 12);
            ctx.strokeRect(worldX + 6, worldY + 6, size - 12, size - 12);
            // Roof (lighter)
            ctx.fillStyle = '#c4a44a';
            ctx.fillRect(worldX + 4, worldY + 4, size - 8, 8);
            // Shop icon
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('$', cx, cy + 6);
        }

        // ========== RUNE / FOUNTAIN ==========
        else if (type === 'rune') {
            // Water base
            const t = Date.now() / 500;
            ctx.fillStyle = '#003355';
            ctx.fillRect(worldX, worldY, size, size);
            // Glowing rune
            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            const pulse = Math.sin(t) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(0, 255, 150, ${pulse * 0.3})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(0, 255, 150, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            // Cross
            ctx.fillStyle = `rgba(255,255,255,${pulse * 0.4})`;
            ctx.fillRect(cx - 1, cy - 8, 2, 16);
            ctx.fillRect(cx - 8, cy - 1, 16, 2);
        }

        // ========== SPAWN RED ==========
        else if (type === 'spawn_red') {
            const hash = (worldX * 7 + worldY * 13) % 100;
            ctx.fillStyle = `rgb(${55 + (hash % 15)}, ${25 + (hash % 10)}, ${22 + (hash % 8)})`;
            ctx.fillRect(worldX, worldY, size, size);
            ctx.strokeStyle = 'rgba(255,50,50,0.08)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(worldX, worldY, size, size);
            // Subtle team marker
            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            ctx.fillStyle = 'rgba(255, 50, 50, 0.08)';
            ctx.beginPath();
            ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== SPAWN BLUE ==========
        else if (type === 'spawn_blue') {
            const hash = (worldX * 7 + worldY * 13) % 100;
            ctx.fillStyle = `rgb(${22 + (hash % 8)}, ${25 + (hash % 10)}, ${55 + (hash % 15)})`;
            ctx.fillRect(worldX, worldY, size, size);
            ctx.strokeStyle = 'rgba(50,50,255,0.08)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(worldX, worldY, size, size);
            // Subtle team marker
            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            ctx.fillStyle = 'rgba(50, 50, 255, 0.08)';
            ctx.beginPath();
            ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== DEFAULT ==========
        else {
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(worldX, worldY, size, size);
        }

        ctx.restore();
    }

    // Draw fog of war
    drawFogOfWar(playerScreenX, playerScreenY, visionRadius) {
        const ctx = this.ctx;
        ctx.save();
        const gradient = ctx.createRadialGradient(
            playerScreenX, playerScreenY, visionRadius * 0.6,
            playerScreenX, playerScreenY, visionRadius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }
}
