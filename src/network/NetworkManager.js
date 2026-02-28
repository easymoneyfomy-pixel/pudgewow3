export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.ws = null;
        this.connected = false;

        // Current room state
        this.roomId = null;
        this.team = null;

        // Remote state
        this.serverState = null;
        
        // Delta compression
        this._lastEntityState = new Map(); // For delta compression
        this._lastServerTime = 0;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // This assumes we serve HTML from Express (port 8080)
        this.ws = new WebSocket(`${protocol}//${host}`);

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.connected = true;
            this.game.onConnected(); // Let UI know
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Client received:', data.type);
                
                // Apply delta decompression for GAME_STATE
                if (data.type === 'GAME_STATE' && data.entities) {
                    this._decompressEntities(data.entities);
                }
                
                this.handleMessage(data);
            } catch (e) {
                console.error('Failed to parse WebSocket message', e);
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.connected = false;
        };
    }

    /**
     * Decompress delta-encoded entities
     * Server sends only changed values, client reconstructs full state
     */
    _decompressEntities(entities) {
        for (const entity of entities) {
            const id = entity.id;
            if (this._lastEntityState.has(id)) {
                const last = this._lastEntityState.get(id);
                // Merge delta with last known state
                Object.assign(last, entity);
                this._lastEntityState.set(id, last);
            } else {
                // First time seeing this entity
                this._lastEntityState.set(id, { ...entity });
            }
        }
        
        // Remove entities that no longer exist (marked with _deleted)
        for (const [id, data] of this._lastEntityState.entries()) {
            if (data._deleted) {
                this._lastEntityState.delete(id);
            }
        }
    }

    send(type, payload) {
        if (!this.connected) return;
        console.log('Client sending:', type);
        this.ws.send(JSON.stringify({ type, ...payload }));
    }

    handleMessage(data) {
        switch (data.type) {
            case 'ROOM_LIST':
                this.game.lobbyUI.updateRoomList(data.rooms);
                break;
            case 'ROOM_JOINED':
                this.roomId = data.roomId;
                this.team = data.team;
                this.playerId = data.playerId;
                this.game.startGameScene();
                break;
            case 'ERROR':
                alert('Server Error: ' + data.message);
                break;
            case 'GAME_STATE':
                // Pass authoritative state to current scene
                if (this.game.sceneManager.currentScene && this.game.sceneManager.currentScene.onServerState) {
                    this.game.sceneManager.currentScene.onServerState(data);
                }
                break;
        }
    }

    createRoom(name) {
        this.send('CREATE_ROOM', { roomName: name });
    }

    joinRoom(id) {
        this.send('JOIN_ROOM', { roomId: id });
    }

    sendInput(input) {
        this.send('INPUT', { input });
    }
}
