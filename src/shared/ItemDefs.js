// Shared item definitions — used by both client (UIManager) and server (ServerGame)
export const SHOP_ITEMS = [
    { id: 'flaming_hook', label: 'Flaming Hook', cost: 150, icon: 'assets/shop/flaming_hook.png', desc: 'Burn 8 DPS / 3s', effect: 'burn' },
    { id: 'ricochet_turbine', label: 'Ricochet Turbine', cost: 125, icon: 'assets/shop/Ricochet_Turbline.png', desc: 'Hook bounces walls', effect: 'bounce' },
    { id: 'strygwyr_claws', label: "Strygwyr's Claws", cost: 175, icon: 'assets/shop/Stragwyr\'s_Claws.png', desc: 'Rupture on move', effect: 'rupture' },
    { id: 'grappling_hook', label: 'Grappling Hook', cost: 200, icon: '🪢', desc: 'Active: Next hook pulls you to walls', effect: 'grapple', active: true, cooldown: 5 },
    { id: 'naix_jaws', label: "Naix's Jaws", cost: 150, icon: '🦇', desc: 'Heal 20 HP on hook hit', effect: 'lifesteal' },
    { id: 'healing_salve', label: 'Healing Salve', cost: 50, icon: 'assets/shop/Healling_salve.png', desc: 'Regen 100 HP over 10s', effect: 'heal', active: true, cooldown: 10 },
    { id: 'blink_dagger', label: 'Blink Dagger', cost: 250, icon: 'assets/shop/Blink_Dagger.png', desc: 'Teleport to cursor', effect: 'blink', active: true, cooldown: 8 },
    { id: 'lycan_paws', label: "Lycan's Paws", cost: 100, icon: '🐾', desc: '+40 Move Speed', effect: 'speed' },
    { id: 'techies_barrel', label: "Techie's Barrel", cost: 200, icon: 'assets/shop/mine.png', desc: 'Place a landmine', effect: 'mine', active: true, cooldown: 20 },
    { id: 'tinys_arm', label: "Tiny's Arm", cost: 300, icon: 'assets/shop/Tini\'s_Arm.png', desc: 'Toss a nearby unit', effect: 'toss', active: true, cooldown: 12 },
    { id: 'barathrums_lantern', label: "Barathrum's Lantern", cost: 350, icon: '🏮', desc: '+Dmg based on Hook Spd', effect: 'lantern' },
];

// Lookup map for server-side use
export const ITEM_MAP = {};
for (const item of SHOP_ITEMS) {
    ITEM_MAP[item.id] = item;
}
