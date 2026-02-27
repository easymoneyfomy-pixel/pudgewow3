import { SHOP_ITEMS } from '../shared/ItemDefs.js';
import { GAME } from '../shared/GameConstants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.shopOpen = false;
        this._lastPlayer = null;
        this.mmCache = null;

        // Cache DOM elements for fast access
        this.dom = {
            gameUi: document.getElementById('game-ui'),
            scoreRed: document.getElementById('score-red'),
            scoreBlue: document.getElementById('score-blue'),
            gameTimer: document.getElementById('game-timer'),

            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            playerGold: document.getElementById('player-gold'),
            hpBar: document.getElementById('hp-bar'),
            hpText: document.getElementById('hp-text'),
            xpBar: document.getElementById('xp-bar'),
            xpText: document.getElementById('xp-text'),

            statDmg: document.getElementById('stat-dmg'),
            statSpd: document.getElementById('stat-spd'),
            statMoveSpd: document.getElementById('stat-move-spd'),
            statRng: document.getElementById('stat-rng'),
            statRad: document.getElementById('stat-rad'),

            // Skill elements (Q, W, E)
            cdQ: document.getElementById('cd-q'),
            cdTextQ: document.getElementById('cd-text-q'),
            activeQ: document.getElementById('active-q'),

            cdW: document.getElementById('cd-w'),
            cdTextW: document.getElementById('cd-text-w'),
            activeW: document.getElementById('active-w'),

            cdE: document.getElementById('cd-e'),
            cdTextE: document.getElementById('cd-text-e'),

            // Item Grid
            inventoryGrid: document.getElementById('inventory-grid'),

            // Shop elements
            shopOverlay: document.getElementById('shop-overlay'),
            shopItemsGrid: document.getElementById('shop-items-grid'),
            shopGoldVal: document.getElementById('shop-gold-val'),
            btnCloseShop: document.getElementById('btn-close-shop'),

            // Game Over
            gameOverOverlay: document.getElementById('game-over'),
            victoryTitle: document.getElementById('victory-title'),
            finalScore: document.getElementById('final-score'),
            btnReturn: document.getElementById('btn-return'),
            pingDisplay: document.getElementById('ping-display'), // Assumes we have this or we'll create it
        };

        this._initShop();
        this._initInventorySlots();

        // Bind events
        this.dom.btnCloseShop.addEventListener('click', () => {
            this.shopOpen = false;
        });

        this.dom.btnReturn.addEventListener('click', () => {
            location.reload();
        });
    }

    _initInventorySlots() {
        this.dom.inventoryGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.innerHTML = `
                <div class="item-icon" id="inv-icon-${i}"></div>
                <div class="hotkey">${['Z', 'X', 'C', 'V', 'D', 'F'][i]}</div>
                <div class="cooldown-overlay" id="inv-cd-${i}"></div>
                <div class="cooldown-text" id="inv-text-${i}"></div>
            `;

            slot.addEventListener('click', () => {
                const scene = this.game.sceneManager.currentScene;
                if (scene && scene.localPlayer) {
                    const item = scene.localPlayer.items[i];
                    if (item && item.active && item.cooldown <= 0) {
                        scene.activeItemSlot = i;
                        this.game.canvas.style.cursor = 'crosshair';
                    }
                }
            });

            this.dom.inventoryGrid.appendChild(slot);
        }
    }

    _initShop() {
        this.dom.shopItemsGrid.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.id = `shop-item-${item.id}`;
            el.dataset.id = item.id;
            el.dataset.cost = item.cost;

            el.innerHTML = `
                <div class="s-icon">${item.icon}</div>
                <div class="s-name">${item.label}</div>
                <div class="s-desc">${item.desc}</div>
                <div class="s-cost">${item.cost}g</div>
            `;

            // Click to buy
            el.addEventListener('click', () => {
                if (!this.shopOpen || !this._lastPlayer) return;
                if (this._lastPlayer.gold >= item.cost) {
                    this.game.network.sendInput({ type: 'BUY_ITEM', itemId: item.id });
                }
            });

            this.dom.shopItemsGrid.appendChild(el);
        });
    }

    render(ctx, rules, player, enemy, scene) {
        this._lastPlayer = player;

        // Show UI if not visible
        if (this.dom.gameUi.classList.contains('hidden')) {
            this.dom.gameUi.classList.remove('hidden');
        }

        // Top Bar
        this.dom.scoreRed.innerText = rules.scoreRed !== undefined ? rules.scoreRed : 0;
        this.dom.scoreBlue.innerText = rules.scoreBlue !== undefined ? rules.scoreBlue : 0;

        const mins = Math.floor(rules.roundTimeLeft / 60);
        const secs = Math.floor(rules.roundTimeLeft % 60).toString().padStart(2, '0');
        this.dom.gameTimer.innerText = `${mins}:${secs}`;

        // Bottom HUD
        this.updatePortraitAndStats(player);
        this.updateSkills(player);
        // Update Inventory
        this.updateInventory(player);

        // Phase 18 targeting feedback
        if (scene && scene.activeItemSlot !== null && scene.activeItemSlot !== undefined) {
            const slotEl = document.getElementById(`inv-slot-${scene.activeItemSlot}`);
            if (slotEl) {
                slotEl.classList.add('targeting-active');
            }
        } else {
            // Remove from all slots if none active
            document.querySelectorAll('.inv-slot').forEach(el => el.classList.remove('targeting-active'));
        }

        // Shop Mode
        if (this.shopOpen && player) {
            this.dom.shopOverlay.classList.remove('hidden');
            this.dom.shopGoldVal.innerText = player.gold;

            // Update affordable states
            SHOP_ITEMS.forEach(item => {
                const el = document.getElementById(`shop-item-${item.id}`);
                if (el) {
                    if (player.gold >= item.cost) {
                        el.classList.add('affordable');
                        el.classList.remove('unaffordable');
                    } else {
                        el.classList.remove('affordable');
                        el.classList.add('unaffordable');
                    }
                }
            });
        } else {
            this.dom.shopOverlay.classList.add('hidden');
        }

        // Game Over
        if (rules.isGameOver) {
            this.dom.gameOverOverlay.classList.remove('hidden');
            const winnerIsRed = rules.winner.includes('Red');
            this.dom.victoryTitle.innerText = `${rules.winner} VICTORY!`;
            this.dom.victoryTitle.style.color = winnerIsRed ? 'var(--red)' : 'var(--blue)';
            this.dom.finalScore.innerText = `Final Score: Red ${rules.scoreRed} — ${rules.scoreBlue} Blue`;
        } else {
            this.dom.gameOverOverlay.classList.add('hidden');
        }

        // Minimap logic (Canvas Embedded)
        this._drawMinimap(ctx, player);

        // Update Ping
        if (scene && scene.serverState && this.dom.pingDisplay) {
            const serverTime = scene.serverState.serverTime;
            const now = Date.now();
            const latency = Math.floor(now - serverTime); // Rough estimation
            this.dom.pingDisplay.innerText = `Ping: ${latency}ms`;
            this.dom.pingDisplay.style.color = latency < 100 ? '#00ff00' : latency < 200 ? '#ffff00' : '#ff0000';
        }
    }

    updatePortraitAndStats(player) {
        if (!player) {
            this.dom.playerName.innerText = "Pudge (Loading...)";
            this.dom.playerLevel.innerText = "Lv 1";
            this.dom.playerGold.innerText = "0";
            this.dom.hpBar.style.width = "100%";
            this.dom.hpText.innerText = "Connecting...";
            this.dom.xpBar.style.width = "0%";
            this.dom.xpText.innerText = "XP 0/100";
            this.dom.statDmg.innerText = "---";
            this.dom.statSpd.innerText = "---";
            this.dom.statMoveSpd.innerText = "---";
            this.dom.statRng.innerText = "---";
            this.dom.statRad.innerText = "---";
            return;
        }
        this.dom.playerName.innerText = `Pudge (${player.team.toUpperCase()})`;
        this.dom.playerLevel.innerText = `Lv ${player.level}`;
        this.dom.playerGold.innerText = player.gold;

        // HP
        const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
        this.dom.hpBar.style.width = `${hpRatio * 100}%`;
        this.dom.hpText.innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;

        // XP
        const xpRatio = Math.max(0, Math.min(1, player.xp / player.xpToLevel));
        this.dom.xpBar.style.width = `${xpRatio * 100}%`;
        this.dom.xpText.innerText = `XP ${Math.floor(player.xp)}/${player.xpToLevel}`;

        // Combat Stats
        this.dom.statDmg.innerText = player.hookDamage;
        this.dom.statSpd.innerText = player.hookSpeed;
        this.dom.statMoveSpd.innerText = Math.round(player.speed || 280);
        this.dom.statRng.innerText = player.hookMaxDist;
        this.dom.statRad.innerText = player.hookRadius;
    }

    updateSkills(player) {
        if (!player) return;
        // Hook (Q)
        this._updateSkillSlot(
            this.dom.cdQ, this.dom.cdTextQ, this.dom.activeQ,
            player.hookCooldown, player.maxHookCooldown, false
        );

        // Rot (W)
        this._updateSkillSlot(
            this.dom.cdW, this.dom.cdTextW, this.dom.activeW,
            0, 0, player.rotActive
        );

        // Flesh Heap (E) - Passive
        if (this.dom.cdE) {
            this.dom.cdE.style.height = '0%';
            this.dom.cdTextE.innerText = player.fleshHeapStacks > 0 ? `+${player.fleshHeapStacks}` : '';
            this.dom.cdTextE.style.fontSize = '12px';
            this.dom.cdTextE.style.color = '#fff';
        }
    }

    _updateSkillSlot(cdOverlay, cdText, activeGlow, cd, maxCd, isActive) {
        if (cd > 0 && maxCd > 0) {
            const ratio = cd / maxCd;
            cdOverlay.style.height = `${ratio * 100}%`;
            cdText.innerText = cd.toFixed(1);
        } else {
            cdOverlay.style.height = '0%';
            cdText.innerText = '';
        }

        if (isActive) {
            activeGlow.classList.remove('hide');
        } else {
            activeGlow.classList.add('hide');
        }
    }

    updateInventory(player) {
        if (!player) return;
        const icons = {
            'burn': '🔥', 'bounce': '🔄', 'rupture': '🩸',
            'grapple': '🪢', 'lifesteal': '🦇', 'blink': '⚡', 'speed': '🐾'
        };

        for (let i = 0; i < 6; i++) {
            const item = player.items ? player.items[i] : null;
            const iconEl = document.getElementById(`inv-icon-${i}`);
            const cdOverlay = document.getElementById(`inv-cd-${i}`);
            const cdText = document.getElementById(`inv-text-${i}`);
            const slotEl = iconEl.parentElement;

            if (item) {
                slotEl.classList.add('has-item');
                iconEl.innerText = icons[item.effect] || '📦';

                if (item.active && item.cooldown > 0) {
                    const ratio = item.cooldown / item.maxCooldown;
                    cdOverlay.style.height = `${ratio * 100}%`;
                    cdText.innerText = item.cooldown.toFixed(1);
                } else {
                    cdOverlay.style.height = '0%';
                    cdText.innerText = '';
                }
            } else {
                slotEl.classList.remove('has-item');
                iconEl.innerText = '';
                cdOverlay.style.height = '0%';
                cdText.innerText = '';
            }
        }
    }

    // Still draws logic into the local embedded minimap canvas ctx from MainScene
    _drawMinimap(mainCtx, player) {
        // The minimap has its own canvas now
        const mmCanvas = document.getElementById('minimapCanvas');
        if (!mmCanvas) return;
        const mmCtx = mmCanvas.getContext('2d');
        const size = mmCanvas.width;

        // Draw static background from cache
        if (!this.mmCache) {
            this.mmCache = document.createElement('canvas');
            this.mmCache.width = size;
            this.mmCache.height = size;
            const cCtx = this.mmCache.getContext('2d');

            // Clear
            cCtx.fillStyle = '#090909';
            cCtx.fillRect(0, 0, size, size);

            // Map layout
            const tileSize = size / GAME.MAP_WIDTH;
            for (let gx = 0; gx < GAME.MAP_WIDTH; gx++) {
                for (let gy = 0; gy < GAME.MAP_HEIGHT; gy++) {
                    const tx = gx * tileSize;
                    const ty = gy * tileSize;

                    if (gx < 2 || gy < 2 || gx >= GAME.MAP_WIDTH - 2 || gy >= GAME.MAP_HEIGHT - 2) {
                        cCtx.fillStyle = '#333';
                        cCtx.fillRect(tx, ty, tileSize, tileSize);
                    } else if (gx >= 10 && gx <= 13) {
                        // Central River
                        cCtx.fillStyle = '#003366';
                        cCtx.fillRect(tx, ty, tileSize, tileSize);
                    } else {
                        cCtx.fillStyle = gx < 10 ? '#1a2a16' : '#16192a';
                        cCtx.fillRect(tx, ty, tileSize, tileSize);
                    }
                }
            }
        }

        // Copy cache to minimap canvas
        mmCtx.drawImage(this.mmCache, 0, 0);

        // Draw Player Location (Dynamic)
        if (player) {
            const mapWorldSize = GAME.MAP_WIDTH * GAME.TILE_SIZE;
            const px = (player.x / mapWorldSize) * size;
            const py = (player.y / mapWorldSize) * size;

            mmCtx.fillStyle = player.team === 'red' ? '#ff4444' : '#4488ff';
            mmCtx.beginPath();
            mmCtx.arc(px, py, 3, 0, Math.PI * 2);
            mmCtx.fill();
            mmCtx.strokeStyle = '#fff';
            mmCtx.lineWidth = 1;
            mmCtx.stroke();
        }
    }

}
