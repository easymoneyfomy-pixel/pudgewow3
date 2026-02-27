import { Game } from './engine/Game.js';

// Точка входа
window.onload = () => {
    const canvas = document.getElementById('gameCanvas');

    // Fullscreen - use entire window
    const game = new Game(canvas, window.innerWidth, window.innerHeight);

    // Resize handler
    window.addEventListener('resize', () => {
        game.resize(window.innerWidth, window.innerHeight);
    });

    game.start();
};
