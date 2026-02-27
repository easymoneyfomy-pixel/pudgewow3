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

        const ctx = renderer.ctx;
        const sx = char.x;
        const sy = char.y;

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

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Body (team color)
        ctx.fillStyle = char.team === 'red' ? '#8B1A1A' : '#1A1A8B'; // Darker base
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Stitched patterns for "Pudge" look
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Belly stitches
        ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
        for (let i = -8; i <= 8; i += 4) {
            ctx.moveTo(i, -3); ctx.lineTo(i, 3);
        }
        // Shoulder stitches
        ctx.moveTo(-14, -10); ctx.lineTo(-10, -14);
        ctx.moveTo(14, -10); ctx.lineTo(10, -14);
        ctx.stroke();

        // Inner body detail (flesh color for Pudge)
        ctx.fillStyle = '#9C7261'; // Slightly more vibrant flesh
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#664444';
        ctx.beginPath();
        ctx.arc(0, -8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Eyes (white dots)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -9, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -9, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Arms/Shoulders
        ctx.fillStyle = char.team === 'red' ? '#884444' : '#444488';
        ctx.fillRect(-18, -2, 8, 8);
        ctx.fillRect(10, -2, 8, 8);

        // Cleaver (Enhanced)
        ctx.save();
        ctx.translate(16, 0);
        ctx.rotate(-0.5);
        ctx.fillStyle = '#999'; // Base metal
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(5, -14);
        ctx.lineTo(15, -12);
        ctx.lineTo(12, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Edge shine
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(15, -12); ctx.lineTo(12, 4);
        ctx.stroke();

        // Handle
        ctx.fillStyle = '#4a2c15';
        ctx.fillRect(-1, 0, 3, 10);
        ctx.restore();

        // Healing visual
        if (char.isHealing) {
            const hPulse = Math.sin(Date.now() / 150) * 0.2 + 0.5;
            ctx.fillStyle = `rgba(0, 255, 100, ${hPulse})`;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('+', Math.sin(Date.now() / 200) * 6, -18);
        }

        // Invulnerability Shield
        if (char.invulnerableTimer > 0) {
            const sp = Math.sin(Date.now() / 100) * 0.1 + 0.35;
            ctx.strokeStyle = `rgba(100, 200, 255, ${sp + 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // HP Bar
        const hpBarW = 40;
        const hpBarH = 5;
        const hpBarX = sx - hpBarW / 2;
        const hpBarY = sy - 28;

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

        // Draw segmented chain along the polyline
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2) {
                const linkCount = Math.floor(dist / segmentDist);
                const linkAngle = Math.atan2(dy, dx);
                const actualCount = Math.max(1, linkCount);

                for (let j = 0; j <= actualCount; j++) {
                    const t = j / actualCount;
                    const lx = p1.x + dx * t;
                    const ly = p1.y + dy * t;

                    ctx.save();
                    ctx.translate(lx, ly);
                    ctx.rotate(linkAngle);

                    ctx.beginPath();
                    ctx.roundRect(-6, -3, 12, 6, 3);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // 2. Hook blade (The Head)
        ctx.fillStyle = '#666';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;

        // Head orientation:
        // If flying forward, point in dirX/dirY.
        // If returning, point towards the next node (points[1]).
        let headAngle = Math.atan2(dirY, dirX);
        if (isReturning && points.length > 1) {
            const headDx = points[1].x - hx;
            const headDy = points[1].y - hy;
            headAngle = Math.atan2(headDy, headDx) + Math.PI; // Look back when retracting
        }

        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(headAngle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-12, -10);
        ctx.lineTo(-24, -5);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-24, 5);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    // ─────────────────────── LANDMINE ────────────────────────────────────────

    static drawLandmine(renderer, mine) {
        const ctx = renderer.ctx;
        ctx.save();
        ctx.translate(mine.x, mine.y);

        // Stealthy when armed
        ctx.globalAlpha = mine.isArmed ? 0.35 : 1.0;

        // 1. Barrel Body
        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3d2b1f';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Wood Grain (Procedural vertical curves)
        ctx.strokeStyle = '#5D2906';
        ctx.lineWidth = 0.5;
        for (let i = -8; i <= 8; i += 4) {
            ctx.beginPath();
            ctx.moveTo(i, -12);
            ctx.quadraticCurveTo(i * 1.5, 0, i, 12);
            ctx.stroke();
        }

        // 3. Iron Bands
        ctx.fillStyle = '#333';
        ctx.fillRect(-12.5, -8, 25, 3);
        ctx.fillRect(-12.5, 5, 25, 3);

        // 4. Fuse / Lid
        ctx.fillStyle = '#222';
        ctx.fillRect(-4, -16, 8, 4);

        // Burning Fuse Spark (if not armed yet or if active)
        if (!mine.isArmed) {
            const sparkGlow = Math.sin(Date.now() / 50) * 2 + 3;
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(0, -18, sparkGlow, 0, Math.PI * 2);
            ctx.fill();
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
                }
                break;
            }
            case 'LANDMINE':
                EntityRenderer.drawLandmine(renderer, eData);
                break;
            case 'RUNE':
                EntityRenderer.drawRune(renderer, eData);
                break;
        }
    }
}
