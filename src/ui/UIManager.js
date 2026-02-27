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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, 50);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(width, 50);
        ctx.stroke();

        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Timer
        const mins = Math.floor(rules.roundTimeLeft / 60);
        const secs = Math.floor(rules.roundTimeLeft % 60).toString().padStart(2, '0');
        ctx.fillStyle = '#fff';
        ctx.fillText(`${mins}:${secs}`, width / 2, 25);

        // Scores
        ctx.fillStyle = '#ff4444';
        ctx.fillText(`Red: ${rules.scoreRed}`, width / 2 - 150, 25);

        ctx.fillStyle = '#4444ff';
        ctx.fillText(`Blue: ${rules.scoreBlue}`, width / 2 + 150, 25);
    }

    _drawBottomBar(ctx, width, height, player) {
        const barHeight = 80;
        const startY = height - barHeight;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, startY, width, barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.lineTo(width, startY);
        ctx.stroke();

        // Портрет / Инфо
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Player HP: ${player.hp} / ${player.maxHp}`, 20, startY + 30);
        ctx.fillText(`Status: ${player.state.toUpperCase()}`, 20, startY + 55);

        // Иконка Хука (Квадрат)
        const iconSize = 50;
        const iconX = width / 2 - iconSize / 2;
        const iconY = startY + 15;

        // Фон иконки
        ctx.fillStyle = '#333';
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(iconX, iconY, iconSize, iconSize);

        // Буква
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Arial';
        ctx.fillText("Q", iconX + iconSize / 2, iconY + iconSize / 2);

        // Overlay кулдауна
        if (player.hookCooldown > 0) {
            const ratio = player.hookCooldown / player.maxHookCooldown;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(iconX, iconY + iconSize * (1 - ratio), iconSize, iconSize * ratio);

            ctx.fillStyle = 'yellow';
            ctx.fillText(player.hookCooldown.toFixed(1), iconX + iconSize / 2, iconY + iconSize / 2 + 5);
        }
    }

    _drawGameOver(ctx, width, height, rules) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = rules.winner === 'Red Team' ? '#ff4444' : rules.winner === 'Blue Team' ? '#4444ff' : '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${rules.winner} Wins!`, width / 2, height / 2 - 50);

        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: Red ${rules.scoreRed} - ${rules.scoreBlue} Blue`, width / 2, height / 2 + 20);
        ctx.fillText(`Refresh page to restart`, width / 2, height / 2 + 70);
    }
}
