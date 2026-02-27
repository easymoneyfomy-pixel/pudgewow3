import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Serve client files directly from the parent directory
app.use(express.static(path.join(__dirname, '../')));

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Attach basic player session info
    ws.playerId = Math.random().toString(36).substring(7);
    ws.roomId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            console.error('Invalid message from client', e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${ws.playerId}`);
        roomManager.handleDisconnect(ws);
    });
});

function handleMessage(ws, data) {
    switch (data.type) {
        case 'GET_ROOMS':
            // Send available rooms
            ws.send(JSON.stringify({
                type: 'ROOM_LIST',
                rooms: roomManager.getRoomList()
            }));
            break;

        case 'JOIN_ROOM':
            roomManager.joinRoom(ws, data.roomId);
            break;

        case 'CREATE_ROOM':
            roomManager.createRoom(ws, data.roomName);
            break;

        case 'LEAVE_ROOM':
            roomManager.leaveRoom(ws);
            break;

        case 'INPUT':
            if (ws.roomId) {
                roomManager.handleInput(ws, data.input);
            }
            break;
    }
}
