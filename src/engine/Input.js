export class Input {
    constructor(canvas) {
        this.canvas = canvas;

        // Массивы состояний клавиш
        this.keys = {};
        this.keysPressedThisFrame = {};
        this.keysReleasedThisFrame = {};

        // Мышь
        this.mousePos = { x: 0, y: 0 };
        this.buttons = {};
        this.buttonsPressedThisFrame = {};

        this._setupListeners();
    }

    _setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keysPressedThisFrame[e.code] = true;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keysReleasedThisFrame[e.code] = true;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;

            // Масштабирование, если канвас ресайзится CSS-ом
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mousePos.x *= scaleX;
            this.mousePos.y *= scaleY;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.buttons[e.button]) {
                this.buttonsPressedThisFrame[e.button] = true;
            }
            this.buttons[e.button] = true;
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.buttons[e.button] = false;
        });

        // Отключаем контекстное меню для правого клика
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    isKeyPressed(code) {
        return !!this.keysPressedThisFrame[code];
    }

    isMouseButtonDown(buttonIndex) {
        return !!this.buttons[buttonIndex];
    }

    isMouseButtonPressed(buttonIndex) {
        return !!this.buttonsPressedThisFrame[buttonIndex];
    }

    getMousePosition() {
        return { ...this.mousePos };
    }

    postUpdate() {
        // Очищаем события, специфичные для одного кадра
        this.keysPressedThisFrame = {};
        this.keysReleasedThisFrame = {};
        this.buttonsPressedThisFrame = {};
    }
}
