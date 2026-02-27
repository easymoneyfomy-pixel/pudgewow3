export class UIManager {
    constructor(game) {
        this.game = game;
    }

    render(ctx, rules, player, enemy) {
        const width = this.game.canvas.width;
        const height = this.game.canvas.height;

        // Рисуем поверх мира, без трансформаций камеры

        // 1. Верхняя панель (Счет и Таймер - стиль Leaderboard WC3)
        this._drawTopBar(ctx, width, rules);

        // 2. Нижняя панель (WC3 HUD - Minimap, Portrait, Stats, Command Card)
        this._drawBottomBar(ctx, width, height, player);

        // 3. Экран конца игры
        if (rules.isGameOver) {
            this._drawGameOver(ctx, width, height, rules);
        }
    }

    _drawTopBar(ctx, width, rules) {
        // WC3 Leaderboard style top-right
        const boardWidth = 200;
        const boardHeight = 80;
        const startX = width - boardWidth - 10;
        const startY = 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(startX, startY, boardWidth, boardHeight);
        ctx.strokeStyle = '#f0d78c';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, boardWidth, boardHeight);

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Timer
        const mins = Math.floor(rules.roundTimeLeft / 60);
        const secs = Math.floor(rules.roundTimeLeft % 60).toString().padStart(2, '0');
        ctx.fillStyle = '#f0d78c';
        ctx.fillText(`Round Time: ${mins}:${secs}`, startX + boardWidth / 2, startY + 20);

        // Scores
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff6666';
        ctx.fillText(`RED: ${rules.scoreRed}`, startX + 20, startY + 45);

        ctx.fillStyle = '#6666ff';
        ctx.fillText(`BLUE: ${rules.scoreBlue}`, startX + 20, startY + 65);
    }

    _drawBottomBar(ctx, width, height, player) {
        const barHeight = 160;
        const startY = height - barHeight;

        // HUD Background (dark stone/wood)
        ctx.fillStyle = '#222';
        ctx.fillRect(0, startY, width, barHeight);

        ctx.strokeStyle = '#f0d78c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.lineTo(width, startY);
        ctx.stroke();

        // 1. Minimap Area (Left 200px)
        const mapW = 180;
        ctx.fillStyle = '#111';
        ctx.fillRect(10, startY + 10, mapW, barHeight - 20);
        ctx.strokeRect(10, startY + 10, mapW, barHeight - 20);
        ctx.fillStyle = '#444';
        ctx.font = 'italic 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Minimap Unavailable", 10 + mapW / 2, startY + barHeight / 2);

        // 2. Portrait Area
        const portX = 200;
        const portW = 120;
        ctx.fillStyle = '#111';
        ctx.fillRect(portX, startY + 10, portW, barHeight - 20);
        ctx.strokeRect(portX, startY + 10, portW, barHeight - 20);

        // Draw a fake big "Pudge" portrait icon
        ctx.fillStyle = player.team === 'red' ? '#880000' : '#000088';
        ctx.beginPath();
        ctx.ellipse(portX + portW / 2, startY + barHeight / 2 + 20, 40, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#664444';
        ctx.beginPath();
        ctx.arc(portX + portW / 2, startY + barHeight / 2 - 20, 25, 0, Math.PI * 2);
        ctx.fill();

        // 3. Stats Area
        const statX = 330;
        const statW = 300;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(statX, startY + 10, statW, barHeight - 20);
        ctx.strokeRect(statX, startY + 10, statW, barHeight - 20);

        ctx.textAlign = 'left';
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Pudge (${player.team.toUpperCase()})`, statX + 15, startY + 30);

        ctx.fillStyle = '#ffd700';
        ctx.fillText(`💰 Gold: ${player.gold}`, statX + 180, startY + 30);

        // HP Bar in stats area
        const hpBarW = statW - 30;
        const hpBarH = 20;
        const hpX = statX + 15;
        const hpY = startY + 45;

        ctx.fillStyle = '#330000';
        ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
        const hpRatio = player.hp / player.maxHp;
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, hpX + hpBarW / 2, hpY + hpBarH / 2 + 1);

        // State info
        ctx.textAlign = 'left';
        ctx.font = 'italic 12px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Status: ${player.state.toUpperCase()}`, statX + 15, startY + 85);

        // Base stats
        ctx.font = '12px Arial';
        ctx.fillStyle = '#eee';
        ctx.fillText(`Damage: ${player.hookDamage}`, statX + 15, startY + 105);
        ctx.fillText(`Speed: ${player.hookSpeed}`, statX + 15, startY + 120);
        ctx.fillText(`Target Range: ${player.hookMaxDist}`, statX + 120, startY + 105);
        ctx.fillText(`Hit Radius: ${player.hookRadius}`, statX + 120, startY + 120);

        // 4. Command Card Area (Skills and Shop)
        const cmdX = width - 420;
        const cmdW = 410;
        ctx.fillStyle = '#111';
        ctx.fillRect(cmdX, startY + 10, cmdW, barHeight - 20);
        ctx.strokeRect(cmdX, startY + 10, cmdW, barHeight - 20);

        // -- Skills Row --
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText("Skills:", cmdX + 10, startY + 22);

        // Meat Hook Skill (Q)
        this._drawSkillIcon(ctx, cmdX + 10, startY + 30, 50, "Q", "Hook", player.hookCooldown, player.maxHookCooldown);

        // Rot Skill (W)
        this._drawSkillIcon(ctx, cmdX + 65, startY + 30, 50, "W", "Rot", 0, 0, player.rotActive);

        // -- Shop Section --
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 11px Arial';
        ctx.fillText("Shop [F1-F6]:", cmdX + 130, startY + 22);

        const shopItems = [
            { key: 'F1', label: 'Flame', cost: 150 },
            { key: 'F2', label: 'Ricochet', cost: 125 },
            { key: 'F3', label: 'Rupture', cost: 175 },
            { key: 'F4', label: 'Salve', cost: 50 },
            { key: 'F5', label: 'Blink', cost: 200 },
            { key: 'F6', label: 'Paws', cost: 100 },
        ];

        for (let i = 0; i < shopItems.length; i++) {
            const ix = cmdX + 130 + (i % 3) * 90;
            const iy = startY + 30 + Math.floor(i / 3) * 55;
            this._drawShopItem(ctx, ix, iy, shopItems[i].key, shopItems[i].label, shopItems[i].cost, player.gold);
        }

        // -- Upgrades Row --
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 11px Arial';
        ctx.fillText("Upgrades [1-4] 50g:", cmdX + 10, startY + 95);

        this._drawUpgradeIcon(ctx, cmdX + 10, startY + 105, 40, "1", `+Dmg`);
        this._drawUpgradeIcon(ctx, cmdX + 55, startY + 105, 40, "2", `+Spd`);
        this._drawUpgradeIcon(ctx, cmdX + 10, startY + 120 + 30, 40, "3", `+Dist`);
        this._drawUpgradeIcon(ctx, cmdX + 55, startY + 120 + 30, 40, "4", `+Rad`);
    }

    _drawSkillIcon(ctx, x, y, size, key, name, cd, maxCd, isActive = false) {
        ctx.fillStyle = isActive ? '#004400' : '#444';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = isActive ? '#00ff00' : '#f0d78c';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(key, x + size / 2, y + size / 2 + 6);

        ctx.font = '10px Arial';
        ctx.fillText(name, x + size / 2, y + size + 12);

        if (cd > 0) {
            const ratio = cd / maxCd;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y + size * (1 - ratio), size, size * ratio);

            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(cd.toFixed(1), x + size / 2, y + size / 2 + 5);
        }

        if (isActive) {
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 9px Arial';
            ctx.fillText('ON', x + size / 2, y + size - 4);
        }
    }

    _drawUpgradeIcon(ctx, x, y, size, key, label) {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`[${key}]`, x + size / 2, y + size / 2 - 3);

        ctx.fillStyle = '#ffaa00';
        ctx.font = '9px Arial';
        ctx.fillText(label, x + size / 2, y + size / 2 + 12);
    }

    _drawShopItem(ctx, x, y, key, label, cost, playerGold) {
        const w = 85;
        const h = 50;
        const canAfford = playerGold >= cost;

        ctx.fillStyle = canAfford ? '#2a2a1a' : '#1a1a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = canAfford ? '#f0d78c' : '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = canAfford ? '#fff' : '#666';
        ctx.fillText(`[${key}]`, x + w / 2, y + 14);

        ctx.font = '10px Arial';
        ctx.fillStyle = canAfford ? '#eee' : '#555';
        ctx.fillText(label, x + w / 2, y + 28);

        ctx.font = '9px Arial';
        ctx.fillStyle = canAfford ? '#ffd700' : '#554400';
        ctx.fillText(`${cost}g`, x + w / 2, y + 42);
    }

    _drawGameOver(ctx, width, height, rules) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);

        const winnerColor = rules.winner.includes('Red') ? '#ff4444' : '#4444ff';
        ctx.fillStyle = winnerColor;
        ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = winnerColor;
        ctx.fillText(`${rules.winner} VICTORY!`, width / 2, height / 2 - 50);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`Final Battle Score: Red ${rules.scoreRed} - ${rules.scoreBlue} Blue`, width / 2, height / 2 + 20);
        ctx.font = 'italic 18px Arial';
        ctx.fillStyle = '#888';
        ctx.fillText(`Press [R] or Refresh to return to Tavern`, width / 2, height / 2 + 80);
    }
}
