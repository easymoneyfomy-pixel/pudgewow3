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
        const cmdX = width - 350;
        const cmdW = 340;
        ctx.fillStyle = '#111';
        ctx.fillRect(cmdX, startY + 10, cmdW, barHeight - 20);
        ctx.strokeRect(cmdX, startY + 10, cmdW, barHeight - 20);

        // Meat Hook Skill (Slot 1: Top Left)
        this._drawSkillIcon(ctx, cmdX + 15, startY + 25, 60, "Q", "Meat Hook", player.hookCooldown, player.maxHookCooldown);

        // Upgrades (Shop grid)
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 12px Arial';
        ctx.fillText("Shop (50g per UPGRADE):", cmdX + 90, startY + 30);

        this._drawUpgradeIcon(ctx, cmdX + 90, startY + 45, 50, "1", "+10 Dmg");
        this._drawUpgradeIcon(ctx, cmdX + 145, startY + 45, 50, "2", "+50 Spd");
        this._drawUpgradeIcon(ctx, cmdX + 90, startY + 100, 50, "3", "+Dist");
        this._drawUpgradeIcon(ctx, cmdX + 145, startY + 100, 50, "4", "+Rad");
    }

    _drawSkillIcon(ctx, x, y, size, key, name, cd, maxCd) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#f0d78c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(key, x + size / 2, y + size / 2 + 8);

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
    }

    _drawUpgradeIcon(ctx, x, y, size, key, label) {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`[${key}]`, x + size / 2, y + size / 2 - 5);

        ctx.fillStyle = '#ffaa00';
        ctx.font = '10px Arial';
        ctx.fillText(label, x + size / 2, y + size / 2 + 15);
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
