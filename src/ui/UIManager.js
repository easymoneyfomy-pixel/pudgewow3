import { SHOP_ITEMS } from '../shared/ItemDefs.js';
import { GAME } from '../shared/GameConstants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.shopOpen = false;
        this.killFeed = null;
        this._lastPlayer = null;
        this.mmCache = null;

        /** @type {string|null} - ID of skill/item currently hovered for tooltip */
        this.hoveredObjectId = null;
        this.hoveredType = null; // 'skill' or 'item'
        this.hoverPos = { x: 0, y: 0 };

        this._init();
    }

    _init() {
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
            cdQ: document.getElementById('cd-q'),
            cdTextQ: document.getElementById('cd-text-q'),
            activeQ: document.getElementById('active-q'),
            cdW: document.getElementById('cd-w'),
            cdTextW: document.getElementById('cd-text-w'),
            activeW: document.getElementById('active-w'),
            cdE: document.getElementById('cd-e'),
            cdTextE: document.getElementById('cd-text-e'),
            inventoryGrid: document.getElementById('inventory-grid'),
            shopOverlay: document.getElementById('shop-overlay'),
            shopItemsGrid: document.getElementById('shop-items-grid'),
            shopGoldVal: document.getElementById('shop-gold-val'),
            btnCloseShop: document.getElementById('btn-close-shop'),
            gameOverOverlay: document.getElementById('game-over'),
            victoryTitle: document.getElementById('victory-title'),
            finalScore: document.getElementById('final-score'),
            btnReturn: document.getElementById('btn-return'),
            pingDisplay: document.getElementById('ping-display'),
        };

        this._initShop();
        this._initInventorySlots();
        this._setupTooltipListeners();

        this.dom.btnCloseShop.addEventListener('click', () => { this.shopOpen = false; });
        this.dom.btnReturn.addEventListener('click', () => { location.reload(); });
    }

    _setupTooltipListeners() {
        // Skill Slots
        ['q', 'w', 'e'].forEach(key => {
            const el = document.getElementById(`skill-${key}`);
            if (el) {
                el.addEventListener('mouseenter', () => { this.hoveredType = 'skill'; this.hoveredObjectId = key; });
                el.addEventListener('mouseleave', () => { this.hoveredObjectId = null; });
            }
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
            slot.addEventListener('mouseenter', () => { this.hoveredType = 'item'; this.hoveredObjectId = i.toString(); });
            slot.addEventListener('mouseleave', () => { this.hoveredObjectId = null; });
            this.dom.inventoryGrid.appendChild(slot);
        }
    }

    _initShop() {
        this.dom.shopItemsGrid.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.id = `shop-item-${item.id}`;
            const isIconPath = item.icon.startsWith('assets/');
            const iconHtml = isIconPath ? `<img src="${item.icon}" style="width:100%; height:100%; object-fit:cover;">` : item.icon;
            el.innerHTML = `
                <div class="s-icon">${iconHtml}</div>
                <div class="s-name">${item.label}</div>
                <div class="s-desc">${item.desc}</div>
                <div class="s-cost">${item.cost}g</div>
            `;
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
        if (this.dom.gameUi.classList.contains('hidden')) {
            this.dom.gameUi.classList.remove('hidden');
        }

        this._lastPlayer = player;
        if (!player) return;

        this.dom.scoreRed.innerText = rules.scoreRed || 0;
        this.dom.scoreBlue.innerText = rules.scoreBlue || 0;
        const mins = Math.floor(rules.roundTimeLeft / 60);
        const secs = Math.floor(rules.roundTimeLeft % 60).toString().padStart(2, '0');
        this.dom.gameTimer.innerText = `${mins}:${secs}`;

        this._renderMinimap(ctx, rules, player, enemy, scene);
        this._renderStats(ctx, player);
        this._renderSkills(ctx, player);
        this._renderInventory(ctx, player);
        this._renderTooltip(ctx, player);
        this._updateHoverDetection();

        if (this.shopOpen) {
            this.dom.shopOverlay.classList.remove('hidden');
            this.dom.shopGoldVal.innerText = player.gold;
            SHOP_ITEMS.forEach(item => {
                const el = document.getElementById(`shop-item-${item.id}`);
                if (el) {
                    if (player.gold >= item.cost) { el.classList.add('affordable'); el.classList.remove('unaffordable'); }
                    else { el.classList.remove('affordable'); el.classList.add('unaffordable'); }
                }
            });
        } else {
            this.dom.shopOverlay.classList.add('hidden');
        }

        if (rules.isGameOver) {
            this.dom.gameOverOverlay.classList.remove('hidden');
            this.dom.victoryTitle.innerText = `${rules.winner} VICTORY!`;
            this.dom.victoryTitle.style.color = rules.winner.includes('Red') ? 'var(--red)' : 'var(--blue)';
            this.dom.finalScore.innerText = `Final Score: Red ${rules.scoreRed} — ${rules.scoreBlue} Blue`;
        }

        this._updatePing(scene);
    }

    _renderMinimap(ctx, rules, player, enemy, scene) {
        const mmCanvas = document.getElementById('minimapCanvas');
        if (!mmCanvas) return;
        const mmCtx = mmCanvas.getContext('2d');
        const size = mmCanvas.width;

        if (!this.mmCache) {
            this.mmCache = document.createElement('canvas');
            this.mmCache.width = size;
            this.mmCache.height = size;
            const cCtx = this.mmCache.getContext('2d');
            cCtx.fillStyle = '#090909';
            cCtx.fillRect(0, 0, size, size);
            const tileSize = size / GAME.MAP_WIDTH;
            for (let gx = 0; gx < GAME.MAP_WIDTH; gx++) {
                for (let gy = 0; gy < GAME.MAP_HEIGHT; gy++) {
                    const tx = gx * tileSize;
                    const ty = gy * tileSize;
                    if (gx < 2 || gy < 2 || gx >= GAME.MAP_WIDTH - 2 || gy >= GAME.MAP_HEIGHT - 2) {
                        cCtx.fillStyle = '#333';
                        cCtx.fillRect(tx, ty, tileSize, tileSize);
                    } else if (gx >= 10 && gx <= 13) {
                        cCtx.fillStyle = '#003366';
                        cCtx.fillRect(tx, ty, tileSize, tileSize);
                    } else {
                        cCtx.fillStyle = gx < 10 ? '#1a2a16' : '#16192a';
                        cCtx.fillRect(tx, ty, tileSize, tileSize);
                    }
                }
            }
        }

        mmCtx.drawImage(this.mmCache, 0, 0);
        const mapWorldSize = GAME.MAP_WIDTH * GAME.TILE_SIZE;

        // Phase 31: Draw Shops
        mmCtx.fillStyle = '#ffcc00';
        mmCtx.fillRect((1 * GAME.TILE_SIZE / mapWorldSize) * size, (1 * GAME.TILE_SIZE / mapWorldSize) * size, 4, 4);
        mmCtx.fillRect(((GAME.MAP_WIDTH - 2) * GAME.TILE_SIZE / mapWorldSize) * size, ((GAME.MAP_HEIGHT - 2) * GAME.TILE_SIZE / mapWorldSize) * size, 4, 4);

        // Runes
        if (scene && scene.runes) {
            mmCtx.fillStyle = '#00ff00';
            scene.runes.forEach(rune => {
                const rx = (rune.x / mapWorldSize) * size;
                const ry = (rune.y / mapWorldSize) * size;
                mmCtx.beginPath(); mmCtx.arc(rx, ry, 2, 0, Math.PI * 2); mmCtx.fill();
            });
        }

        // Radar visibility logic
        if (scene && scene.entities) {
            scene.entities.forEach(ent => {
                if (ent.type === 'character' && ent.id !== player.id && ent.hp > 0) {
                    const isEnemyOnMySide = (player.team === 'red' && ent.x < 10 * GAME.TILE_SIZE) ||
                        (player.team === 'blue' && ent.x > 14 * GAME.TILE_SIZE);
                    if (isEnemyOnMySide) {
                        const ex = (ent.x / mapWorldSize) * size;
                        const ey = (ent.y / mapWorldSize) * size;
                        mmCtx.fillStyle = ent.team === 'red' ? '#ff4444' : '#4488ff';
                        mmCtx.beginPath(); mmCtx.arc(ex, ey, 2.5, 0, Math.PI * 2); mmCtx.fill();
                    }
                }
            });
        }

        const px = (player.x / mapWorldSize) * size;
        const py = (player.y / mapWorldSize) * size;
        mmCtx.fillStyle = player.team === 'red' ? '#ff4444' : '#4488ff';
        mmCtx.beginPath(); mmCtx.arc(px, py, 3, 0, Math.PI * 2); mmCtx.fill();
        mmCtx.strokeStyle = '#fff'; mmCtx.lineWidth = 1; mmCtx.stroke();
    }

    _renderStats(ctx, player) {
        this.dom.playerName.innerText = `Pudge (${player.team.toUpperCase()})`;
        this.dom.playerLevel.innerText = `Lv ${player.level}`;
        this.dom.playerGold.innerText = player.gold;
        const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
        this.dom.hpBar.style.width = `${hpRatio * 100}%`;
        this.dom.hpText.innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;
        const xpRatio = Math.max(0, Math.min(1, player.xp / player.xpToLevel));
        this.dom.xpBar.style.width = `${xpRatio * 100}%`;
        this.dom.xpText.innerText = `XP ${Math.floor(player.xp)}/${player.xpToLevel}`;
        this.dom.statDmg.innerText = player.hookDamage;
        this.dom.statSpd.innerText = player.hookSpeed;
        this.dom.statMoveSpd.innerText = Math.round(player.speed || 280);
        this.dom.statRng.innerText = player.hookMaxDist;
        this.dom.statRad.innerText = player.hookRadius;
    }

    _renderSkills(ctx, player) {
        this._updateSkillSlot(this.dom.cdQ, this.dom.cdTextQ, this.dom.activeQ, player.hookCooldown, player.maxHookCooldown, false);
        const hasFlamingItem = (player.items || []).some(i => i.effect === 'burn');
        const skillSlotQ = document.querySelector('.skill-slot .icon-hook');
        if (skillSlotQ) { if (hasFlamingItem) skillSlotQ.classList.add('flaming'); else skillSlotQ.classList.remove('flaming'); }

        this._updateSkillSlot(this.dom.cdW, this.dom.cdTextW, this.dom.activeW, 0, 0, player.rotActive);
        if (this.dom.cdE) {
            this.dom.cdE.style.height = '0%';
            this.dom.cdTextE.innerText = player.fleshHeapStacks > 0 ? `+${player.fleshHeapStacks}` : '';
        }
    }

    _updateSkillSlot(cdOverlay, cdText, activeGlow, cd, maxCd, isActive) {
        if (cd > 0 && maxCd > 0) {
            const ratio = cd / maxCd;
            cdOverlay.style.height = `${ratio * 100}%`;
            cdText.innerText = cd.toFixed(1);
        } else { cdOverlay.style.height = '0%'; cdText.innerText = ''; }
        if (isActive) activeGlow.classList.remove('hide'); else activeGlow.classList.add('hide');
    }

    _renderInventory(ctx, player) {
        if (!player) return;
        const icons = { 
            'burn': 'assets/shop/flaming_hook.png', 
            'bounce': 'assets/shop/Ricochet_Turbline.png', 
            'rupture': 'assets/shop/Stragwyr\'s_Claws.png', 
            'grapple': 'assets/shop/Grappling_Hook.png', 
            'lifesteal': 'assets/shop/naix\'s_jaws.png', 
            'blink': 'assets/shop/Blink_Dagger.png', 
            'speed': 'assets/shop/Lycan\'s_Paws.png', 
            'mine': 'assets/shop/mine.png', 
            'heal': 'assets/shop/Healling_salve.png', 
            'toss': 'assets/shop/Tini\'s_Arm.png', 
            'lantern': '🏮' 
        };
        
        // Check if player has Flaming Hook (for skill Q icon update)
        const hasFlamingHook = player.items && player.items.some(item => item.effect === 'burn');
        const hookIconEl = document.querySelector('.icon-hook');
        if (hookIconEl) {
            if (hasFlamingHook) {
                hookIconEl.style.backgroundImage = "url('assets/shop/flaming_hook.png')";
                hookIconEl.classList.add('flaming');
            } else {
                hookIconEl.style.backgroundImage = "url('assets/hook.png')";
                hookIconEl.classList.remove('flaming');
            }
        }
        
        for (let i = 0; i < 6; i++) {
            const item = player.items ? player.items[i] : null;
            const iconEl = document.getElementById(`inv-icon-${i}`);
            const cdOverlay = document.getElementById(`inv-cd-${i}`);
            const cdText = document.getElementById(`inv-text-${i}`);
            const slotEl = iconEl.parentElement;
            if (item) {
                slotEl.classList.add('has-item');
                const icon = icons[item.effect] || '📦';
                if (icon.startsWith('assets/')) {
                    iconEl.innerHTML = `<img src="${icon}" style="width:100%; height:100%; object-fit:cover;">`;
                }
                else {
                    iconEl.innerHTML = '';
                    iconEl.innerText = icon;
                }
                if (item.active && item.cooldown > 0) {
                    const ratio = item.cooldown / item.maxCooldown;
                    cdOverlay.style.height = `${ratio * 100}%`;
                    cdText.innerText = item.cooldown.toFixed(1);
                } else { cdOverlay.style.height = '0%'; cdText.innerText = ''; }
            } else { slotEl.classList.remove('has-item'); iconEl.innerHTML = ''; iconEl.innerText = ''; cdOverlay.style.height = '0%'; cdText.innerText = ''; }
        }
    }

    _updateHoverDetection() {
        if (this.game.input && this.game.input.mousePos) {
            this.hoverPos = { x: this.game.input.mousePos.x, y: this.game.input.mousePos.y };
        }
    }

    _renderTooltip(ctx, player) {
        if (!player || !this.hoveredObjectId) return;
        let info = null;
        if (this.hoveredType === 'skill') {
            if (this.hoveredObjectId === 'q') info = { name: "Meat Hook", desc: `Damage: ${player.hookDamage}\nSpeed: ${player.hookSpeed}\nDistance: ${player.hookMaxDist}` };
            if (this.hoveredObjectId === 'w') info = { name: "Rot", desc: "Toggle: Deals damage to self and enemies in a small radius. Slows targets." };
            if (this.hoveredObjectId === 'e') info = { name: "Flesh Heap", desc: `Stacks: ${player.fleshHeapStacks}\nProvides permanent HP per kill.` };
        } else if (this.hoveredType === 'item') {
            const item = player.items ? player.items[parseInt(this.hoveredObjectId)] : null;
            if (item) {
                info = { name: item.label || "Item", desc: item.desc || "Active or Passive item upgrade." };
                if (item.effect === 'lantern') info.desc += `\nScaling: +${((player.hookSpeed - 750) / 10).toFixed(1)} Hook Dmg.`;
            }
        }
        if (info) {
            const tx = this.hoverPos.x + 15;
            const ty = this.hoverPos.y - 80;
            ctx.save(); ctx.resetTransform();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
            const lines = info.desc.split('\n');
            const h = 40 + lines.length * 20; const w = 220;
            ctx.fillRect(tx, ty, w, h); ctx.strokeRect(tx, ty, w, h);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Inter, sans-serif'; ctx.fillText(info.name, tx + 10, ty + 25);
            ctx.fillStyle = '#aaa'; ctx.font = '13px Inter, sans-serif';
            lines.forEach((line, i) => { ctx.fillText(line, tx + 10, ty + 45 + i * 20); });
            ctx.restore();
        }
    }

    _updatePing(scene) {
        if (scene && scene.serverState && this.dom.pingDisplay) {
            const latency = Math.floor(Date.now() - scene.serverState.serverTime);
            this.dom.pingDisplay.innerText = `Ping: ${latency}ms`;
            this.dom.pingDisplay.style.color = latency < 100 ? '#00ff00' : latency < 200 ? '#ffff00' : '#ff0000';
        }
    }
}
