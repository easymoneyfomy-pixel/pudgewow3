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

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Pudge Wars Online", width / 2, 100);

        if (!this.game.network.connected) {
            ctx.font = '24px Arial';
            ctx.fillStyle = 'yellow';
            ctx.fillText("Connecting to server...", width / 2, height / 2);
            return;
        }

        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText("Available Lobbies:", width / 2, 200);

        let y = 250;
        if (this.rooms.length === 0) {
            ctx.fillStyle = '#ccc';
            ctx.font = '20px Arial';
            ctx.fillText("No active lobbies. Create one!", width / 2, y);
            y += 40;
        } else {
            for (let i = 0; i < this.rooms.length; i++) {
                const r = this.rooms[i];
                ctx.fillStyle = r.players >= 2 ? '#ff4444' : '#44ff44';
                ctx.fillText(`[${i + 1}] ${r.name} - ${r.players}/2 players ${r.isPlaying ? '(Playing)' : '(Waiting)'}`, width / 2, y);
                y += 40;
            }
        }

        y += 40;
        ctx.fillStyle = 'yellow';
        ctx.font = '16px Arial';
        ctx.fillText("Press 'C' to Create a new Room.", width / 2, y);
        ctx.fillText("Press '1'-'9' to Join a Room.", width / 2, y + 30);
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
