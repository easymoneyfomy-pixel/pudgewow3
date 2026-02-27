export class LobbyUI {
    constructor(game) {
        this.game = game;
        this.rooms = [];
        this.visible = true; // Show on startup
    }

    updateRoomList(rooms) {
        this.rooms = rooms;
    }

    render(ctx) {
        if (!this.visible) return;

        const width = this.game.canvas.width;
        const height = this.game.canvas.height;

        // Background with vignette
        const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
        grad.addColorStop(0, '#1a120c');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f0d78c';
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 54px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("PUDGE WARS ONLINE", width / 2, 100);
        ctx.shadowBlur = 0;

        ctx.font = 'italic 18px Arial';
        ctx.fillStyle = '#888';
        ctx.fillText("A Warcraft III Inspired Tribute", width / 2, 130);

        if (!this.game.network.connected) {
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#ccaa44';
            ctx.fillText("Connecting to Battle.net...", width / 2, height / 2);
            return;
        }

        // Lobbies List Container
        const listWidth = 500;
        const listX = (width - listWidth) / 2;
        ctx.fillStyle = 'rgba(61, 43, 31, 0.4)';
        ctx.fillRect(listX, 180, listWidth, 250);
        ctx.strokeStyle = '#3d2b1f';
        ctx.lineWidth = 3;
        ctx.strokeRect(listX, 180, listWidth, 250);

        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#f0d78c';
        ctx.textAlign = 'left';
        ctx.fillText("AVAILABLE TAVERNS:", listX + 20, 210);

        let y = 250;
        if (this.rooms.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("The tavern is empty. Be the first host!", width / 2, 300);
        } else {
            ctx.font = '18px Arial';
            for (let i = 0; i < this.rooms.length; i++) {
                const r = this.rooms[i];
                const isFull = r.players >= 10;
                ctx.fillStyle = isFull ? '#666' : '#fff';
                ctx.textAlign = 'left';
                ctx.fillText(`[${i + 1}] ${r.name.toUpperCase()}`, listX + 40, y);

                ctx.textAlign = 'right';
                ctx.fillStyle = isFull ? '#844' : '#4a4';
                ctx.fillText(`${r.players}/10 Souls ${r.isPlaying ? '(BATTLE)' : '(WAITING)'}`, listX + listWidth - 40, y);
                y += 40;
            }
        }

        // Instructions
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 18px Arial';
        ctx.fillText("Press [C] to Host a Tavern Match", width / 2, height - 100);
        ctx.fillStyle = '#888';
        ctx.font = '14px Arial';
        ctx.fillText("Press [1]-[9] to Join an Existing Duel", width / 2, height - 70);
    }

    handleInput(input) {
        if (!this.visible || !this.game.network.connected) return;

        if (input.isKeyPressed('KeyC')) {
            const name = prompt("Enter room name:");
            if (name) {
                this.game.network.createRoom(name);
            }
        }

        for (let i = 1; i <= 9; i++) {
            if (input.isKeyPressed('Digit' + i)) {
                const index = i - 1;
                if (index < this.rooms.length) {
                    const room = this.rooms[index];
                    this.game.network.joinRoom(room.id);
                }
            }
        }
    }
}
