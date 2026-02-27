export class UIManager {
    constructor(game) {
        this.game = game;
    }

    render(ctx, rules, player, enemy) {
        const width = this.game.canvas.width;
        const height = this.game.canvas.height;

        // 1. Top Bar (Score/Timer)
        this._drawTopBar(ctx, width, rules);

        // 2. Bottom HUD
        this._drawBottomBar(ctx, width, height, player);

        // 3. Game Over
        if (rules.isGameOver) {
            this._drawGameOver(ctx, width, height, rules);
        }
    }

    _drawTopBar(ctx, width, rules) {
        // Centered top panel — WC3 style
        const boardWidth = 300;
        const boardHeight = 50;
        const startX = (width - boardWidth) / 2;
        const startY = 0;

        // Gradient background
        const grad = ctx.createLinearGradient(startX, startY, startX, startY + boardHeight);
        grad.addColorStop(0, 'rgba(20, 15, 10, 0.95)');
        grad.addColorStop(1, 'rgba(40, 30, 20, 0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(startX, startY, boardWidth, boardHeight);

        // Gold border bottom
        ctx.strokeStyle = '#c4a44a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY + boardHeight);
        ctx.lineTo(startX + boardWidth, startY + boardHeight);
        ctx.stroke();

        // Corner accents
        ctx.strokeStyle = '#c4a44a';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, startY, boardWidth, boardHeight);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Timer
        const mins = Math.floor(rules.roundTimeLeft / 60);
        const secs = Math.floor(rules.roundTimeLeft % 60).toString().padStart(2, '0');
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 18px Georgia, serif';
        ctx.fillText(`⚔ ${mins}:${secs} ⚔`, startX + boardWidth / 2, startY + 16);

        // Scores
        ctx.font = 'bold 14px Georgia, serif';
        ctx.fillStyle = '#ff6666';
        ctx.textAlign = 'left';
        ctx.fillText(`RED: ${rules.scoreRed}`, startX + 20, startY + 38);

        ctx.fillStyle = '#6688ff';
        ctx.textAlign = 'right';
        ctx.fillText(`BLUE: ${rules.scoreBlue}`, startX + boardWidth - 20, startY + 38);
    }

    _drawBottomBar(ctx, width, height, player) {
        const barHeight = 140;
        const startY = height - barHeight;

        // Dark gradient background
        const grad = ctx.createLinearGradient(0, startY, 0, height);
        grad.addColorStop(0, 'rgba(15, 12, 8, 0.95)');
        grad.addColorStop(1, 'rgba(25, 20, 15, 0.98)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, startY, width, barHeight);

        // Gold line on top
        ctx.strokeStyle = '#c4a44a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.lineTo(width, startY);
        ctx.stroke();

        // === 1. MINIMAP (Left) ===
        const mapSize = barHeight - 20;
        const mapX = 10;
        const mapY = startY + 10;
        this._drawMinimap(ctx, mapX, mapY, mapSize, player);

        // === 2. Portrait + Stats (Center-Left) ===
        const portX = mapX + mapSize + 15;
        this._drawPortraitAndStats(ctx, portX, startY, player);

        // === 3. Skills (Center) ===
        const skillsX = portX + 280;
        this._drawSkills(ctx, skillsX, startY, player);

        // === 4. Inventory / Shop (Right) ===
        const invX = skillsX + 140;
        this._drawInventory(ctx, invX, startY, barHeight, player);

        // === 5. Shop (Far Right) ===
        const shopX = invX + 230;
        this._drawShopPanel(ctx, shopX, startY, barHeight, width, player);
    }

    _drawMinimap(ctx, x, y, size, player) {
        // Black background with border
        ctx.fillStyle = '#090909';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#c4a44a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);

        // Draw simplified map (20x20 grid)
        const tileSize = size / 20;
        for (let gx = 0; gx < 20; gx++) {
            for (let gy = 0; gy < 20; gy++) {
                const tx = x + gx * tileSize;
                const ty = y + gy * tileSize;
                const midMapX = 10;

                // Walls
                if (gx === 0 || gy === 0 || gx === 19 || gy === 19) {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(tx, ty, tileSize, tileSize);
                }
                // River
                else if (gx === midMapX || gx === midMapX - 1) {
                    ctx.fillStyle = '#003366';
                    ctx.fillRect(tx, ty, tileSize, tileSize);
                }
                // Grass
                else {
                    ctx.fillStyle = gx < midMapX - 1 ? '#1a2a16' : '#16192a';
                    ctx.fillRect(tx, ty, tileSize, tileSize);
                }
            }
        }

        // Player dot (based on world position, map is 20*64 = 1280 world units)
        if (player) {
            const mapWorldSize = 20 * 64;
            const px = x + (player.x / mapWorldSize) * size;
            const py = y + (player.y / mapWorldSize) * size;

            ctx.fillStyle = player.team === 'red' ? '#ff4444' : '#4488ff';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    _drawPortraitAndStats(ctx, x, startY, player) {
        // Portrait box
        const portW = 60;
        const portH = 80;
        ctx.fillStyle = '#111';
        ctx.fillRect(x, startY + 15, portW, portH);
        ctx.strokeStyle = '#c4a44a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, startY + 15, portW, portH);

        // Team-colored Pudge head
        ctx.fillStyle = player.team === 'red' ? '#660000' : '#000066';
        ctx.beginPath();
        ctx.ellipse(x + portW / 2, startY + 60, 22, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#664444';
        ctx.beginPath();
        ctx.arc(x + portW / 2, startY + 38, 14, 0, Math.PI * 2);
        ctx.fill();

        // Level indicator under portrait
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv ${player.level}`, x + portW / 2, startY + 110);

        // Stats area to the right of portrait
        const sX = x + portW + 10;
        ctx.textAlign = 'left';

        // Name
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 14px Georgia, serif';
        ctx.fillText(`Pudge (${player.team.toUpperCase()})`, sX, startY + 28);

        // Gold
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`💰 ${player.gold}`, sX + 140, startY + 28);

        // HP Bar
        const hpBarW = 200;
        const hpBarH = 16;
        const hpY = startY + 38;
        ctx.fillStyle = '#220000';
        ctx.fillRect(sX, hpY, hpBarW, hpBarH);
        const hpRatio = player.hp / player.maxHp;
        const hpGrad = ctx.createLinearGradient(sX, hpY, sX + hpBarW * hpRatio, hpY);
        hpGrad.addColorStop(0, '#00aa00');
        hpGrad.addColorStop(1, '#007700');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(sX, hpY, hpBarW * hpRatio, hpBarH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(sX, hpY, hpBarW, hpBarH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, sX + hpBarW / 2, hpY + hpBarH / 2 + 4);

        // XP Bar
        const xpY = hpY + hpBarH + 4;
        const xpBarH = 8;
        ctx.fillStyle = '#111';
        ctx.fillRect(sX, xpY, hpBarW, xpBarH);
        const xpRatio = player.xp / player.xpToLevel;
        ctx.fillStyle = '#6644cc';
        ctx.fillRect(sX, xpY, hpBarW * xpRatio, xpBarH);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(sX, xpY, hpBarW, xpBarH);
        ctx.fillStyle = '#ccc';
        ctx.font = '8px Arial';
        ctx.fillText(`XP ${player.xp}/${player.xpToLevel}`, sX + hpBarW / 2, xpY + xpBarH / 2 + 3);

        // Stats
        ctx.textAlign = 'left';
        ctx.font = '11px Arial';
        ctx.fillStyle = '#bbb';
        const statY = xpY + xpBarH + 10;
        ctx.fillText(`⚔ Dmg: ${player.hookDamage}`, sX, statY);
        ctx.fillText(`🏹 Range: ${player.hookMaxDist}`, sX, statY + 14);
        ctx.fillText(`💨 Spd: ${player.hookSpeed}`, sX + 110, statY);
        ctx.fillText(`🎯 Rad: ${player.hookRadius}`, sX + 110, statY + 14);
    }

    _drawSkills(ctx, x, startY, player) {
        ctx.fillStyle = '#c4a44a';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('SKILLS', x + 55, startY + 12);

        // Hook (Q)
        this._drawSkillIcon(ctx, x, startY + 18, 50, 'Q', 'Hook', player.hookCooldown, player.maxHookCooldown);

        // Rot (W)
        this._drawSkillIcon(ctx, x + 60, startY + 18, 50, 'W', 'Rot', 0, 0, player.rotActive);
    }

    _drawInventory(ctx, x, startY, barHeight, player) {
        ctx.fillStyle = '#c4a44a';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('INVENTORY', x + 100, startY + 12);

        // 6 inventory slots (2 rows x 3 cols)
        const slotSize = 40;
        const gap = 4;
        for (let i = 0; i < 6; i++) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const sx = x + col * (slotSize + gap);
            const sy = startY + 18 + row * (slotSize + gap);

            // Slot background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx, sy, slotSize, slotSize);
            ctx.strokeStyle = player.items && player.items[i] ? '#c4a44a' : '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, slotSize, slotSize);

            if (player.items && player.items[i]) {
                const item = player.items[i];
                // Item icon (text-based)
                const icons = {
                    'burn': '🔥',
                    'bounce': '🔄',
                    'rupture': '🩸',
                    'blink': '⚡',
                    'speed': '🐾'
                };
                ctx.font = '18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(icons[item.effect] || '📦', sx + slotSize / 2, sy + slotSize / 2 + 6);
            } else {
                // Empty slot number
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`slot ${i + 1}`, sx + slotSize / 2, sy + slotSize / 2 + 4);
            }
        }
    }

    _drawShopPanel(ctx, x, startY, barHeight, width, player) {
        const panelW = Math.min(width - x - 10, 280);
        if (panelW < 100) return; // Not enough space

        ctx.fillStyle = '#c4a44a';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHOP', x + panelW / 2, startY + 12);

        // Shop items in 2x3 grid
        const shopItems = [
            { key: 'F1', label: 'Flame', cost: 150, icon: '🔥' },
            { key: 'F2', label: 'Ricochet', cost: 125, icon: '🔄' },
            { key: 'F3', label: 'Rupture', cost: 175, icon: '🩸' },
            { key: 'F4', label: 'Salve', cost: 50, icon: '💊' },
            { key: 'F5', label: 'Blink', cost: 200, icon: '⚡' },
            { key: 'F6', label: 'Paws', cost: 100, icon: '🐾' },
        ];

        const itemW = 85;
        const itemH = 50;
        const colCount = Math.min(3, Math.floor(panelW / (itemW + 5)));

        for (let i = 0; i < shopItems.length; i++) {
            const col = i % colCount;
            const row = Math.floor(i / colCount);
            const ix = x + col * (itemW + 5);
            const iy = startY + 18 + row * (itemH + 4);

            const item = shopItems[i];
            const canAfford = player.gold >= item.cost;

            ctx.fillStyle = canAfford ? '#1a1a0a' : '#0d0d0d';
            ctx.fillRect(ix, iy, itemW, itemH);
            ctx.strokeStyle = canAfford ? '#c4a44a' : '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(ix, iy, itemW, itemH);

            ctx.textAlign = 'center';
            ctx.font = '14px Arial';
            ctx.fillText(item.icon, ix + 15, iy + 20);

            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = canAfford ? '#eee' : '#555';
            ctx.fillText(`[${item.key}]`, ix + itemW / 2 + 10, iy + 16);

            ctx.font = '9px Arial';
            ctx.fillStyle = canAfford ? '#ccc' : '#444';
            ctx.fillText(item.label, ix + itemW / 2 + 10, iy + 30);

            ctx.fillStyle = canAfford ? '#ffd700' : '#554400';
            ctx.font = '9px Arial';
            ctx.fillText(`${item.cost}g`, ix + itemW / 2 + 10, iy + 43);
        }

        // Upgrades section below shop
        ctx.fillStyle = '#c4a44a';
        ctx.font = 'bold 9px Georgia, serif';
        ctx.textAlign = 'left';
        const upY = startY + barHeight - 22;
        ctx.fillText('[1]+Dmg [2]+Spd [3]+Dist [4]+Rad — 50g each', x, upY);
    }

    _drawSkillIcon(ctx, x, y, size, key, name, cd, maxCd, isActive = false) {
        ctx.fillStyle = isActive ? '#002200' : '#1a1a1a';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = isActive ? '#00ff00' : '#c4a44a';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.fillText(key, x + size / 2, y + size / 2 + 6);

        ctx.font = '9px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText(name, x + size / 2, y + size + 10);

        if (cd > 0) {
            const ratio = cd / maxCd;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(x, y + size * (1 - ratio), size, size * ratio);

            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(cd.toFixed(1), x + size / 2, y + size / 2 + 5);
        }

        if (isActive) {
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 8px Arial';
            ctx.fillText('ON', x + size / 2, y + size - 4);
        }
    }

    _drawGameOver(ctx, width, height, rules) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);

        const winnerColor = rules.winner.includes('Red') ? '#ff4444' : '#4488ff';
        ctx.fillStyle = winnerColor;
        ctx.font = 'bold 64px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 30;
        ctx.shadowColor = winnerColor;
        ctx.fillText(`${rules.winner} VICTORY!`, width / 2, height / 2 - 50);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f0d78c';
        ctx.font = '24px Georgia, serif';
        ctx.fillText(`Final Score: Red ${rules.scoreRed} — ${rules.scoreBlue} Blue`, width / 2, height / 2 + 20);
        ctx.font = 'italic 16px Georgia, serif';
        ctx.fillStyle = '#888';
        ctx.fillText('Press [R] to return to Tavern', width / 2, height / 2 + 70);
    }
}
