export class SceneManager {
    constructor(game) {
        this.game = game;
        this.currentScene = null;
    }

    loadScene(scene) {
        if (this.currentScene) {
            this.currentScene.destroy();
        }
        this.currentScene = scene;
        this.currentScene.init();
    }

    update(dt) {
        if (this.currentScene) {
            this.currentScene.update(dt);
        }
    }

    render(renderer) {
        if (this.currentScene) {
            this.currentScene.render(renderer);
        }
    }
}
