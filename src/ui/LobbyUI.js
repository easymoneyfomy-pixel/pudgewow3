export class LobbyUI {
    constructor(game) {
        this.game = game;
        this.rooms = [];
        this.visible = true; // Show on startup

        // DOM Elements
        this.menuContainer = document.getElementById('main-menu');
        this.roomSelection = document.getElementById('room-selection');
        this.roomListUl = document.getElementById('room-list-ul');
        this.btnCreate = document.getElementById('btn-create');
        this.btnRefresh = document.getElementById('btn-refresh');
        this.loader = document.getElementById('menu-loader');

        this.initEventListeners();
    }

    initEventListeners() {
        this.btnCreate.addEventListener('click', () => {
            if (!this.game.network.connected) return;
            this.roomSelection.classList.add('hidden');
            this.loader.classList.remove('hidden');
            this.loader.innerText = 'Creating Tavern...';
            this.game.network.createRoom('Axe Tavern Duels ' + Math.floor(Math.random() * 1000));
        });

        this.btnRefresh.addEventListener('click', () => {
            if (!this.game.network.connected) return;
            this.game.network.send('GET_ROOMS', {});
        });
    }

    updateRoomList(rooms) {
        this.rooms = rooms;
        if (!this.visible) return;

        this.roomListUl.innerHTML = '';
        if (rooms.length === 0) {
            this.roomListUl.innerHTML = '<li class="empty-rooms">No Taverns found. Create one!</li>';
            return;
        }

        rooms.forEach(room => {
            const li = document.createElement('li');
            li.className = 'room-item';
            li.innerHTML = `
                <span class="room-name">${room.name}</span>
                <span class="room-players">${room.players}/10</span>
                <button class="wc3-button join-btn">Join</button>
            `;
            const joinBtn = li.querySelector('.join-btn');
            joinBtn.addEventListener('click', () => {
                if (!this.game.network.connected) return;
                this.roomSelection.classList.add('hidden');
                this.loader.classList.remove('hidden');
                this.loader.innerText = 'Entering Tavern...';
                this.game.network.joinRoom(room.id);
            });
            this.roomListUl.appendChild(li);
        });
    }

    hide() {
        this.visible = false;
        this.menuContainer.classList.remove('active');
        this.menuContainer.classList.add('hidden');
    }

    render(ctx) {
        // Toggle visibility of DOM element
        if (this.visible) {
            this.menuContainer.classList.add('active');
            this.menuContainer.classList.remove('hidden');

            if (this.game.network.connected) {
                if (this.loader.innerText === 'Connecting...') {
                    this.loader.classList.add('hidden');
                    this.roomSelection.classList.remove('hidden');
                }
            } else {
                this.roomSelection.classList.add('hidden');
                this.loader.classList.remove('hidden');
                this.loader.innerText = 'Connecting...';
            }
        }
    }
}
