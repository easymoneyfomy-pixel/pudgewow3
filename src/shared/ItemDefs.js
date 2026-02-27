// Shared item definitions — used by both client (UIManager) and server (ServerGame)
export const SHOP_ITEMS = [
    { id: 'flaming_hook', label: 'Flaming Hook', cost: 150, icon: '🔥', desc: 'Burn 8 DPS / 3s', effect: 'burn' },
    { id: 'ricochet_turbine', label: 'Ricochet Turbine', cost: 125, icon: '🔄', desc: 'Hook bounces walls', effect: 'bounce' },
    { id: 'strygwyr_claws', label: "Strygwyr's Claws", cost: 175, icon: '🩸', desc: 'Rupture on move', effect: 'rupture' },
    { id: 'healing_salve', label: 'Healing Salve', cost: 50, icon: '💊', desc: 'Instant +50 HP', effect: 'heal', consumable: true },
    { id: 'blink_dagger', label: 'Blink Dagger', cost: 200, icon: '⚡', desc: 'Teleport', effect: 'blink' },
    { id: 'lycan_paws', label: "Lycan's Paws", cost: 100, icon: '🐾', desc: '+40 Move Speed', effect: 'speed' },
];

// Lookup map for server-side use
export const ITEM_MAP = {};
for (const item of SHOP_ITEMS) {
    ITEM_MAP[item.id] = item;
}
