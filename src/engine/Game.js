import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { SceneManager } from './SceneManager.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { LobbyUI } from '../ui/LobbyUI.js';
import { MainScene } from '../game/MainScene.js';

export class Game {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.renderer = new Renderer(this.canvas);
        this.input = new Input(this.canvas);
        this.sceneManager = new SceneManager(this);

        this.lobbyUI = new LobbyUI(this);
        this.network = new NetworkManager(this);

        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;
        this._roomPollInterval = null;

        this._loop = this._loop.bind(this);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this._loop);

        // Connect to multiplayer server
        this.network.connect();
    }

    onConnected() {
        // Request lobbies
        this.network.send('GET_ROOMS', {});
        this._roomPollInterval = setInterval(() => {
            if (this.lobbyUI.visible) this.network.send('GET_ROOMS', {});
        }, 3000);
    }

    startGameScene() {
        this.lobbyUI.hide();
        const mainScene = new MainScene(this);
        this.sceneManager.loadScene(mainScene);
    }

    stop() {
        this.isRunning = false;
        if (this._roomPollInterval) {
            clearInterval(this._roomPollInterval);
            this._roomPollInterval = null;
        }
    }

    _loop(currentTime) {
        if (!this.isRunning) return;

        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;

        if (this.lobbyUI.visible) {
            this.renderer.clear();
            this.lobbyUI.render(this.renderer.ctx);
        } else {
            this.update(this.deltaTime);
            this.render();
        }

        this.input.postUpdate();
        requestAnimationFrame(this._loop);
    }

    update(dt) {
        this.sceneManager.update(dt);
    }

    render() {
        this.renderer.clear();
        this.sceneManager.render(this.renderer);
    }
}
