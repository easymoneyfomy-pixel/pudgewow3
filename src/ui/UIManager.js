export class UIManager {
    constructor(game) {
        this.game = game;
    }

    render(ctx, rules, player, enemy) {
        const width = this.game.canvas.width;
        const height = this.game.canvas.height;

        // Рисуем поверх мира, без трансформаций камеры

        // 1. Верхняя панель (Счет и Таймер)
        this._drawTopBar(ctx, width, rules);

        // 2. Нижняя панель (Скиллы и Кулдауны игрока)
        this._drawBottomBar(ctx, width, height, player);

        // 3. Экран конца игры
        if (rules.isGameOver) {
            this._drawGameOver(ctx, width, height, rules);
        }
    }

    _drawTopBar(ctx, width, rules) {
        // Gradient background
        const barHeight = 45;
        const grad = ctx.createLinearGradient(0, 0, 0, barHeight);
        grad.addColorStop(0, '#3a2b1f');
        grad.addColorStop(1, '#1a120c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, barHeight);

        ctx.strokeStyle = '#5a4635';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, width, barHeight);

        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Timer
        const mins = Math.floor(rules.roundTimeLeft / 60);
        const secs = Math.floor(rules.roundTimeLeft % 60).toString().padStart(2, '0');
        ctx.fillStyle = '#f0d78c'; // Gold color text
        ctx.fillText(`${mins}:${secs}`, width / 2, barHeight / 2);

        // Scores
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff6666';
        ctx.fillText(`RED: ${rules.scoreRed}`, 50, barHeight / 2);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#6666ff';
        ctx.fillText(`BLUE: ${rules.scoreBlue}`, width - 50, barHeight / 2);
    }

    _drawBottomBar(ctx, width, height, player) {
        const barHeight = 100;
        const startY = height - barHeight;

        // Panel Background
        const grad = ctx.createLinearGradient(0, startY, 0, height);
        grad.addColorStop(0, '#2b1f1a');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, startY, width, barHeight);

        ctx.strokeStyle = '#3d2b1f';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, startY, width, barHeight);

        // HP Bar
        const hpBarW = 200;
        const hpBarH = 20;
        const hpX = 20;
        const hpY = startY + 20;

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

        // Gold and info
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`💰 GOLD: ${player.gold}`, hpX, hpY + 45);

        ctx.fillStyle = '#888';
        ctx.font = 'italic 14px Arial';
        ctx.fillText(`Pudge Status: ${player.state}`, hpX, hpY + 65);

        // Skills (Hook)
        const iconSize = 60;
        const iconX = width / 2 - 120;
        const iconY = startY + 20;

        this._drawIcon(ctx, iconX, iconY, iconSize, "Q", player.hookCooldown, player.maxHookCooldown);

        // Shop (Visualized as icons or buttons)
        const shopX = width / 2;
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('UPGRADES (50g):', shopX, startY + 20);

        ctx.font = '12px Arial';
        ctx.fillStyle = '#ccc';
        const labels = [
            `[1] Dmg: ${player.hookDamage}`,
            `[2] Spd: ${player.hookSpeed}`,
            `[3] Dist: ${player.hookMaxDist}`,
            `[4] Rad: ${player.hookRadius}`
        ];

        labels.forEach((label, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            ctx.fillText(label, shopX + col * 100, startY + 40 + row * 20);
        });
    }

    _drawIcon(ctx, x, y, size, key, cd, maxCd) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#f0d78c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(key, x + size / 2, y + size / 2 + 8);

        if (cd > 0) {
            const ratio = cd / maxCd;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y + size * (1 - ratio), size, size * ratio);

            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(cd.toFixed(1), x + size / 2, y + size / 2 + 5);
        }
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
