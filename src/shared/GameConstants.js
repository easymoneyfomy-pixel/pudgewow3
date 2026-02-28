// Shared game constants — single source of truth
export const GAME = {
    MAP_WIDTH: 24,
    MAP_HEIGHT: 24,
    TILE_SIZE: 64,
    MAX_PLAYERS: 10,
    MAX_SCORE: 50,
    ROUND_TIME: 3600,
    TICK_RATE: 60,
    SPAWN_RED_X: 4,
    SPAWN_BLUE_X: 19,
    SPAWN_MID_Y: 12,

    // Balance: Economy
    UPGRADE_COST: 100,
    GOLD_ON_HIT: 10,
    GOLD_ON_KILL: 50,
    GOLD_ON_HEADSHOT: 100,

    // Balance: XP
    XP_ON_HIT: 25,
    XP_ON_KILL: 50,
    XP_ON_HEADSHOT: 80,

    // Balance: Character
    CHAR_SPEED: 200,
    CHAR_RADIUS: 20,
    CHAR_HP_REGEN: 2,
    RESPAWN_DELAY: 3,

    // Balance: Rot (W)
    ROT_DAMAGE_PER_SEC: 10,
    ROT_SELF_DAMAGE_PER_SEC: 5,
    ROT_RADIUS: 120,
    ROT_SLOW_FACTOR: 0.6,

    // Balance: Flesh Heap (E)
    FLESH_HEAP_HP: 8,

    // Balance: Hook (Q)
    HOOK_SPEED: 500,
    HOOK_MAX_DIST: 400,
    HOOK_RADIUS: 20,
    HOOK_COOLDOWN: 3,
    HOOK_CURVE_POWER: 0.5,
    HOOK_DAMAGE: 40,
    HOOK_PATH_THRESHOLD_SQ: 144, // 12px threshold for chain segments

    // Balance: Item Abilities
    TOSS_SPEED: 600,
    TOSS_DAMAGE: 100,
    TOSS_RADIUS: 100,
    MINE_DAMAGE: 200,
    MINE_EXPLOSION_RADIUS: 120,
    MINE_ARM_TIME: 1.5,
};
