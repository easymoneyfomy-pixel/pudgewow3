import { ServerGame } from './ServerGame.js';

export class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> { id, name, players: set, game: ServerGame }
    }

    getRoomList() {
        return Array.from(this.rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.size,
            maxPlayers: 10,
            isPlaying: r.game && r.game.isPlaying()
        }));
    }

    createRoom(ws, roomName) {
        if (ws.roomId) this.leaveRoom(ws);

        const roomId = Math.random().toString(36).substring(7);
        const room = {
            id: roomId,
            name: roomName || `Room ${roomId}`,
            players: new Set(),
            game: new ServerGame(roomId, this)
        };

        this.rooms.set(roomId, room);
        this.joinRoom(ws, roomId);
    }

    joinRoom(ws, roomId) {
        if (ws.roomId) this.leaveRoom(ws);

        const room = this.rooms.get(roomId);
        if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
            return;
        }

        if (room.players.size >= 10) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
            return;
        }

        let redCount = 0;
        let blueCount = 0;
        for (const p of room.players) {
            if (p.team === 'red') redCount++;
            else if (p.team === 'blue') blueCount++;
        }
        const team = redCount <= blueCount ? 'red' : 'blue';

        room.players.add(ws);
        ws.roomId = roomId;
        ws.team = team;

        ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomId,
            team,
            playerId: ws.playerId
        }));

        room.game.addPlayer(ws.playerId, team);

        if (room.players.size >= 1 && !room.game.isPlaying()) {
            room.game.start();
        }
    }

    leaveRoom(ws) {
        if (!ws.roomId) return;

        const room = this.rooms.get(ws.roomId);
        if (room) {
            room.players.delete(ws);
            room.game.removePlayer(ws.playerId);

            ws.roomId = null;
            ws.team = null;

            if (room.players.size === 0) {
                room.game.stop();
                this.rooms.delete(room.id);
            }
        }
    }

    handleDisconnect(ws) {
        this.leaveRoom(ws);
    }

    handleInput(ws, input) {
        const room = this.rooms.get(ws.roomId);
        if (room && room.game) {
            room.game.handlePlayerInput(ws.playerId, input);
        }
    }

    broadcastToRoom(roomId, messageObj) {
        const room = this.rooms.get(roomId);
        if (room) {
            const data = JSON.stringify(messageObj);
            for (const client of room.players) {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(data);
                }
            }
        }
    }
}
