export class LobbyUI {
    constructor(game) {
        this.game = game;
        this.rooms = [];
        this.visible = true; // Show on startup

        // DOM Elements
        this.menuContainer = document.getElementById('main-menu');
        this.btnPlay = document.getElementById('btn-play');
        this.loader = document.getElementById('menu-loader');

        this.initEventListeners();
    }

    initEventListeners() {
        this.btnPlay.addEventListener('click', () => {
            if (!this.game.network.connected) return;

            // WC3 Pudge Wars style: Quick Play (Find Match)
            // For simplicity, connect to the first available room or create one
            this.btnPlay.classList.add('hidden');
            this.loader.classList.remove('hidden');
            this.loader.innerText = 'Searching for Tavern...';

            if (this.rooms.length > 0) {
                // Join first available room
                const room = this.rooms.find(r => r.players < 10);
                if (room) {
                    this.game.network.joinRoom(room.id);
                } else {
                    // All full, create a new one
                    this.game.network.createRoom('Axe Tavern Duels ' + Math.floor(Math.random() * 1000));
                }
            } else {
                // No rooms, create
                this.game.network.createRoom('Axe Tavern Duels ' + Math.floor(Math.random() * 1000));
            }
        });
    }

    updateRoomList(rooms) {
        this.rooms = rooms;
    }

    render(ctx) {
        // Toggle visibility of DOM element
        if (this.visible) {
            this.menuContainer.classList.add('active');
            this.menuContainer.classList.remove('hidden');

            if (this.game.network.connected) {
                if (this.loader.innerText === 'Connecting to Battle.net...') {
                    this.loader.classList.add('hidden');
                    this.btnPlay.classList.remove('hidden');
                }
            } else {
                this.btnPlay.classList.add('hidden');
                this.loader.classList.remove('hidden');
                this.loader.innerText = 'Connecting to Battle.net...';
            }
        } else {
            this.menuContainer.classList.remove('active');
            this.menuContainer.classList.add('hidden');
        }
    }

    handleInput(input) {
        // Handled by DOM events now
    }
}
