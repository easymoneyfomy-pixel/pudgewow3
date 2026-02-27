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

        // Board indices for checkerboard
        const gridX = Math.floor(worldX / size);
        const gridY = Math.floor(worldY / size);
        const isEven = (gridX + gridY) % 2 === 0;

        // ========== GRASS ==========
        if (type === 'grass' || type === 'tree') {
            // AAA Checkerboard Grass
            ctx.fillStyle = isEven ? '#13220e' : '#162710';
            ctx.fillRect(worldX, worldY, size, size);

            // Subtle border
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldX, worldY, size, size);

            // Decorative circular marker (no trees)
            const seed = gridX * 7 + gridY * 13;
            if (seed % 3 === 0) {
                ctx.fillStyle = '#1f3817'; // Slightly brighter green dot
                ctx.beginPath();
                ctx.arc(worldX + size / 2, worldY + size / 2, size / 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ========== WATER ==========
        else if (type === 'water') {
            ctx.fillStyle = isEven ? '#0a122e' : '#0c1533';
            ctx.fillRect(worldX, worldY, size, size);

            // Subtle grid
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldX, worldY, size, size);

            // Subtle wave highlight
            const t = Date.now() / 800;
            const wave = Math.sin(t + gridX * 0.2 + gridY * 0.2);
            if (wave > 0.8) {
                ctx.fillStyle = 'rgba(30, 60, 120, 0.1)';
                ctx.fillRect(worldX + 2, worldY + 2, size - 4, size - 4);
            }
        }

        // ========== STONE WALL ==========
        else if (type === 'stone') {
            // Clean dark stone geometry
            ctx.fillStyle = '#1a1816';
            ctx.fillRect(worldX, worldY, size, size);

            ctx.fillStyle = '#262320';
            ctx.fillRect(worldX + 2, worldY + 2, size - 4, size - 4);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldX, worldY, size, size);
        }

        // ========== SHOP ==========
        else if (type === 'shop') {
            ctx.fillStyle = '#13220e';
            ctx.fillRect(worldX, worldY, size, size);

            // Building block
            ctx.fillStyle = '#3a2415';
            ctx.strokeStyle = '#1e1109';
            ctx.lineWidth = 2;
            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            ctx.fillRect(worldX + 6, worldY + 6, size - 12, size - 12);
            ctx.strokeRect(worldX + 6, worldY + 6, size - 12, size - 12);

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('$', cx, cy + 6);
        }

        // ========== RUNE / FOUNTAIN ==========
        else if (type === 'rune') {
            ctx.fillStyle = '#13220e';
            ctx.fillRect(worldX, worldY, size, size);

            const t = Date.now() / 500;
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

            ctx.fillStyle = `rgba(255,255,255,${pulse * 0.6})`;
            ctx.fillRect(cx - 2, cy - 8, 4, 16);
            ctx.fillRect(cx - 8, cy - 2, 16, 4);
        }

        // ========== SPAWN RED ==========
        else if (type === 'spawn_red') {
            // Clean dark red geometry
            ctx.fillStyle = isEven ? '#2e0e0e' : '#331212';
            ctx.fillRect(worldX, worldY, size, size);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldX, worldY, size, size);

            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            ctx.fillStyle = 'rgba(255, 50, 50, 0.1)';
            ctx.beginPath();
            ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========== SPAWN BLUE ==========
        else if (type === 'spawn_blue') {
            // Clean dark blue geometry
            ctx.fillStyle = isEven ? '#0e183a' : '#121d42';
            ctx.fillRect(worldX, worldY, size, size);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldX, worldY, size, size);

            const cx = worldX + size / 2;
            const cy = worldY + size / 2;
            ctx.fillStyle = 'rgba(50, 100, 255, 0.1)';
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
