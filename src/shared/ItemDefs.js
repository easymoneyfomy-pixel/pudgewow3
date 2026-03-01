// Shared item definitions — used by both client (UIManager) and server (ServerGame)
export const SHOP_ITEMS = [
    { id: 'flaming_hook', label: 'Flaming Hook', cost: 300, icon: 'assets/shop/flaming_hook.png', desc: 'Burn 8 DPS / 3s', effect: 'burn' },
    { id: 'ricochet_turbine', label: 'Ricochet Turbine', cost: 250, icon: 'assets/shop/Ricochet_Turbline.png', desc: 'Hook bounces walls', effect: 'bounce' },
    { id: 'strygwyr_claws', label: "Strygwyr's Claws", cost: 350, icon: 'assets/shop/Stragwyr\'s_Claws.png', desc: 'Rupture on move', effect: 'rupture' },
    { id: 'grappling_hook', label: 'Grappling Hook', cost: 400, icon: 'assets/shop/Grappling_Hook.png', desc: 'Shoots a hook that pulls you', effect: 'grapple', active: true, cooldown: 10 },
    { id: 'naix_jaws', label: "Naix's Jaws", cost: 300, icon: 'assets/shop/naix\'s_jaws.png', desc: 'Heal 20 HP on hook hit', effect: 'lifesteal' },
    { id: 'healing_salve', label: 'Healing Salve', cost: 100, icon: 'assets/shop/Healling_salve.png', desc: 'Regen 100 HP over 20s', effect: 'heal', active: true, cooldown: 20 },
    { id: 'blink_dagger', label: 'Blink Dagger', cost: 500, icon: 'assets/shop/Blink_Dagger.png', desc: 'Teleport to cursor', effect: 'blink', active: true, cooldown: 8 },
    { id: 'lycan_paws', label: "Lycan's Paws", cost: 200, icon: 'assets/shop/Lycan\'s_Paws.png', desc: '+40 Move Speed', effect: 'speed' },
    { id: 'techies_barrel', label: "Techie's Barrel", cost: 400, icon: 'assets/shop/mine.png', desc: 'Place a landmine', effect: 'mine', active: true, cooldown: 20 },
    { id: 'tinys_arm', label: "Tiny's Arm", cost: 600, icon: 'assets/shop/Tini\'s_Arm.png', desc: 'Toss a nearby unit', effect: 'toss', active: true, cooldown: 12 },
    { id: 'flesh_heap', label: "Flesh Heap", cost: 100, icon: 'assets/Flesh_Heap.png', desc: '+10 Max HP', effect: 'flesh_heap_upgrade' },
    { id: 'barathrums_lantern', label: "Barathrum's Lantern", cost: 700, icon: 'assets/shop/Baratrum\'s_lantern.png', desc: '+Dmg based on Hook Spd', effect: 'lantern' },
];

// Lookup map for server-side use
export const ITEM_MAP = {};
for (const item of SHOP_ITEMS) {
    ITEM_MAP[item.id] = item;
}
