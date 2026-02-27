import { Game } from './engine/Game.js';

// Точка входа
window.onload = () => {
    const canvas = document.getElementById('gameCanvas');

    // Инициализация движка
    // Warcraft 3 resolution reference: let's use 1024x768 (4:3) or 1280x720 (16:9)
    const game = new Game(canvas, 1024, 768);

    // Запускаем движок (он сам покажет Лобби и попытается подключиться к серверу)
    game.start();
};
