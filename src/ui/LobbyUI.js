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

        // Background: pure dark with subtle center glow
        const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
        grad.addColorStop(0, '#0f0c0a');
        grad.addColorStop(1, '#050403');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(240, 215, 140, 0.5)';
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 54px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.fillText("PUDGE WARS ONLINE", width / 2, 100);
        ctx.shadowBlur = 0;

        ctx.font = 'italic 18px Arial, sans-serif';
        ctx.fillStyle = '#7a7a7a';
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
        ctx.fillStyle = '#18120c'; // Dark tavern wood
        ctx.fillRect(listX, 180, listWidth, 250);
        ctx.strokeStyle = '#3d2b1f';
        ctx.lineWidth = 2;
        ctx.strokeRect(listX, 180, listWidth, 250);

        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = '#f0d78c';
        ctx.textAlign = 'left';
        ctx.fillText("AVAILABLE TAVERNS:", listX + 20, 215);

        let y = 255;
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
                ctx.fillStyle = isFull ? '#777' : '#eee';
                ctx.textAlign = 'left';
                ctx.fillText(`[${i + 1}] ${r.name}`, listX + 40, y);

                ctx.textAlign = 'right';
                ctx.fillStyle = isFull ? '#a55' : '#4a994a'; // WC3 Green
                ctx.fillText(`${r.players}/10 Souls ${r.isPlaying ? '(BATTLE)' : ''}`, listX + listWidth - 40, y);
                y += 40;
            }
        }

        // Instructions
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f0d78c';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillText("Press [C] to Host a Tavern Match", width / 2, height - 100);
        ctx.fillStyle = '#666';
        ctx.font = '13px Arial, sans-serif';
        ctx.fillText("Press [1]-[9] to Join an Existing Duel", width / 2, height - 75);
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
