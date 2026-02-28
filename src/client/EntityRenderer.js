/**
 * EntityRenderer — client-only Canvas drawing module.
 * 
 * Responsibility: Knows how to draw every entity type from plain server-state
 * data (eData objects). This is the ONLY place in the codebase that should
 * contain Canvas 2D drawing calls for game entities.
 *
 * All methods are static and receive (ctx, eData) — no entity class instances needed.
 */
export class EntityRenderer {

    // ─────────────────────── CHARACTER ───────────────────────────────────────

    static drawCharacter(renderer, char) {
        if (char.state === 'dead') return;

        const sx = char.x;
        const sy = char.y;
        const ctx = renderer.ctx;

        ctx.save();
        const z = char.z || 0;
        ctx.translate(sx, sy - z);

        // Rot AOE visual (green toxic cloud)
        if (char.rotActive) {
            const rotPulse = Math.sin(Date.now() / 200) * 0.15 + 0.25;
            ctx.fillStyle = `rgba(0, 180, 0, ${rotPulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        // Selection circle (team color)
        ctx.strokeStyle = char.team === 'red' ? 'rgba(255,50,50,0.7)' : 'rgba(50,50,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();

        // HP Bar and other UI handled below
        // Pudge Sprite - Team-specific skins (1.png for Red, 2.png for Blue)
        // Level 5+ uses pudge_5lvl.png for HUD portrait only
        // Flesh Heap: +1% size per stack
        const teamSprite = (char.team === 'red') ? renderer.radiantSprite : renderer.direSprite;
        const fleshHeapScale = 1 + (char.fleshHeapStacks || 0) * 0.01;

        if (teamSprite && teamSprite.complete && teamSprite.naturalWidth > 0) {
            ctx.save();
            ctx.rotate(char.rot || 0);
            ctx.scale(fleshHeapScale, fleshHeapScale);
            const targetSize = char.radius * 3.5 || 84;
            ctx.drawImage(teamSprite, -targetSize / 2, -targetSize / 2, targetSize, targetSize);
            ctx.restore();
        } else {
            // Procedural Pudge (the one they liked as fallback or primary)
            // Flesh Heap scale applied
            ctx.scale(fleshHeapScale, fleshHeapScale);
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();

            // Body (team color)
            ctx.fillStyle = char.team === 'red' ? '#8B1A1A' : '#1A1A8B';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Stitched patterns
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
            for (let i = -8; i <= 8; i += 4) {
                ctx.moveTo(i, -3); ctx.lineTo(i, 3);
            }
            ctx.stroke();

            // Cleaver
            ctx.save();
            ctx.translate(16, 0);
            ctx.rotate(-0.5);
            ctx.fillStyle = '#777';
            ctx.fillRect(0, -10, 10, 14);
            ctx.fillStyle = '#4a2c15';
            ctx.fillRect(-1, 0, 3, 10);
            ctx.restore();
        }

        ctx.restore();

        // HP Bar
        const hpBarW = 40;
        const hpBarH = 5;
        const hpBarX = sx - hpBarW / 2;
        const hpBarY = sy - 42;

        ctx.fillStyle = '#330000';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

        const hpRatio = Math.max(0, char.hp / char.maxHp);
        const hpColor = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#cccc00' : '#cc0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

        // Level badge
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${char.level}`, sx, hpBarY - 2);

        // Status indicators
        if (char.burnTimer > 0) {
            ctx.fillStyle = '#ff4400';
            ctx.font = '9px Arial';
            ctx.fillText('🔥', sx + 24, hpBarY + 4);
        }
        if (char.ruptureTimer > 0) {
            ctx.fillStyle = '#cc0000';
            ctx.font = '9px Arial';
            ctx.fillText('🩸', sx - 24, hpBarY + 4);
        }

        // Active Runes (All players see them)
        let runeX = sx - 10;
        if (char.hasteTimer > 0) {
            ctx.fillStyle = 'rgba(255, 50, 50, 0.8)'; // Red for Haste
            ctx.fillRect(runeX, hpBarY - 14, 20, 3);
            ctx.fillStyle = '#f00';
            ctx.fillRect(runeX, hpBarY - 14, 20 * (char.hasteTimer / 30), 3); // Assume 30s max duration for bar scaling
            ctx.font = 'bold 10px Arial';
            ctx.fillText('⚡', sx, hpBarY - 16);
            runeX += 22;
        }
        if (char.ddTimer > 0) {
            ctx.fillStyle = 'rgba(50, 50, 255, 0.8)'; // Blue for DD
            ctx.fillRect(runeX, hpBarY - 14, 20, 3);
            ctx.fillStyle = '#00f';
            ctx.fillRect(runeX, hpBarY - 14, 20 * (char.ddTimer / 30), 3);
            ctx.font = 'bold 10px Arial';
            ctx.fillText('⚔️', sx, hpBarY - 16);
        }
    }

    // ─────────────────────── HOOK ─────────────────────────────────────────────

    /**
     * @param {object} hook - plain data from server: { x, y, ownerX, ownerY, radius }
     */
    static drawHook(renderer, hook) {
        const ctx = renderer.ctx;
        let { x: hx, y: hy, ownerX: ox, ownerY: oy, pathNodes, dirX, dirY, isReturning } = hook;

        // Reset line dash to prevent dashed line inheritance bugs
        ctx.setLineDash([]);

        // Fallback if owner position is missing
        if (ox === undefined || oy === undefined) {
            ox = hx;
            oy = hy;
        }

        // 1. Draw Chain Segments (WC3 style polyline)
        ctx.fillStyle = '#444'; // More "iron-like" chain color
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;

        const segmentDist = 12;

        // Path logic: 
        // Forward: [HookHead, Owner]
        // Retracting: [HookHead, ...pathNodes backwards, Owner]
        let points = [{ x: hx, y: hy }];
        if (pathNodes && pathNodes.length > 0) {
            // During retraction/flight we want the path nodes to represent the "history"
            // If returning, we follow nodes. If flying forward, we just go to owner.
            if (isReturning) {
                points = points.concat(pathNodes);
            }
        }
        points.push({ x: ox, y: oy });

        // Draw segmented chain along the polyline using hookLinkSprite
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2) {
                const linkSize = 12; // Adjust size for meat-links look
                const linkCount = Math.floor(dist / segmentDist);
                const linkAngle = Math.atan2(dy, dx);
                const linkSprite = renderer.hookLinkSprite;

                for (let j = 0; j <= linkCount; j++) {
                    const t = j / (linkCount || 1);
                    const lx = p1.x + dx * t;
                    const ly = p1.y + dy * t;

                    ctx.save();
                    ctx.translate(lx, ly);
                    ctx.rotate(linkAngle);

                    if (linkSprite && linkSprite.complete && linkSprite.naturalWidth > 0) {
                        ctx.drawImage(linkSprite, -linkSize / 2, -linkSize / 4, linkSize, linkSize / 2);
                    } else {
                        // Procedural fallback (Meat Links)
                        ctx.fillStyle = '#654321';
                        ctx.beginPath();
                        ctx.roundRect(-6, -3, 12, 6, 3);
                        ctx.fill();
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }
        }

        // 2. Hook blade (The Head)
        let headAngle = Math.atan2(dirY, dirX);
        if (isReturning && points.length > 1) {
            // When returning, head faces the direction of travel (inverse of forward)
            const headDx = points[1].x - hx;
            const headDy = points[1].y - hy;
            headAngle = Math.atan2(headDy, headDx) + Math.PI;
        }

        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(headAngle);

        const tipSprite = hook.isFlaming ? renderer.flamingHookSprite : renderer.hookTipSprite;

        if (tipSprite && tipSprite.complete && tipSprite.naturalWidth > 0) {
            const size = (hook.radius || 20) * 2.5;
            ctx.drawImage(tipSprite, -size / 2, -size / 2, size, size);
        } else {
            // Simple procedural hook (Meat Hook style) - Fallback
            ctx.fillStyle = '#777';
            ctx.fillRect(-2, -2, 10, 4);
            ctx.beginPath();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 4;
            ctx.arc(8, 0, 10, -Math.PI / 2, Math.PI / 2, false);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ─────────────────────── LANDMINE ────────────────────────────────────────

    static drawLandmine(renderer, mine) {
        const ctx = renderer.ctx;
        ctx.save();
        ctx.translate(mine.x, mine.y);

        // Stealthy when armed
        ctx.globalAlpha = mine.isArmed ? 0.35 : 1.0;

        // Use the new high-quality sprite if loaded
        if (renderer.landmineSprite && renderer.landmineSprite.complete && renderer.landmineSprite.naturalWidth > 0) {
            const size = 32; // Standard mine size for 64px grid
            ctx.drawImage(renderer.landmineSprite, -size / 2, -size / 2, size, size);
        } else {
            // Fallback: Generic barrel (original)
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3d2b1f';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    // ─────────────────────── RUNE ────────────────────────────────────────────

    static drawRune(renderer, rune) {
        const ctx = renderer.ctx;
        ctx.save();
        ctx.translate(rune.x, rune.y);

        const glowParam = Math.abs(Math.sin(Date.now() / 300)) * 10;
        ctx.shadowBlur = 10 + glowParam;
        ctx.shadowColor = rune.color;

        ctx.fillStyle = rune.color;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rune.icon, 0, 0);

        ctx.restore();
    }

    // ─────────────────────── TOSSED UNIT ─────────────────────────────────────

    static drawTossedUnit(renderer, tossed) {
        // TossedUnit renders its own particles internally
        if (tossed.render) {
            tossed.render(renderer);
        }
    }

    // ─────────────────────── DISPATCHER ──────────────────────────────────────

    /**
     * Draw any entity data object.
     * @param {object} renderer
     * @param {object} eData - plain server-side entity snapshot
     * @param {Map<string, object>} characterMap - map of id -> eData for character lookup (for hook owner coords)
     */
    static draw(renderer, eData, characterMap) {
        switch (eData.type) {
            case 'CHARACTER':
                EntityRenderer.drawCharacter(renderer, eData);
                break;
            case 'HOOK': {
                const owner = characterMap && characterMap.get(eData.ownerId);
                if (owner) {
                    EntityRenderer.drawHook(renderer, {
                        x: eData.x,
                        y: eData.y,
                        ownerX: owner.x,
                        ownerY: owner.y,
                        radius: eData.radius,
                        pathNodes: eData.pathNodes,
                        dirX: eData.dirX,
                        dirY: eData.dirY,
                        isReturning: eData.isReturning
                    });
                } else {
                    // Owner not found - draw hook at its position anyway
                    EntityRenderer.drawHook(renderer, {
                        x: eData.x,
                        y: eData.y,
                        ownerX: eData.x,
                        ownerY: eData.y,
                        radius: eData.radius,
                        pathNodes: eData.pathNodes,
                        dirX: eData.dirX,
                        dirY: eData.dirY,
                        isReturning: eData.isReturning
                    });
                }
                break;
            }
            case 'LANDMINE':
                EntityRenderer.drawLandmine(renderer, eData);
                break;
            case 'RUNE':
                EntityRenderer.drawRune(renderer, eData);
                break;
            case 'TOSSED_UNIT':
                // TossedUnit is rendered via its own render method (particles)
                // The targetUnit is drawn as a normal CHARACTER with z-offset
                break;
        }
    }
}
