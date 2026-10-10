// Game constants and content tables. Pure data with no DOM access, so tests can import it.

export const STORAGE_KEY = 'piksel-savasci-v1';
export const SAVE_VERSION = 1;

// Stages
export const KILLS_PER_STAGE = 10;
export const BOSS_EVERY = 5;          // every 5th stage is a single boss with a timer
export const BOSS_TIME = 30;          // seconds
export const BOSS_HP_MULT = 8;
export const STAGES_PER_ZONE = 10;
export const HP_BASE = 10;
export const HP_GROWTH = 1.39;
export const GOLD_PER_HP = 1 / 9;
export const RESPAWN_DELAY = 0.35;    // seconds between an enemy dying and the next one appearing

// Combat
export const BASE_CRIT_CHANCE = 0.02;
export const CRIT_CHANCE_STEP = 0.01;
export const MAX_CRIT_CHANCE = 0.5;
export const BASE_CRIT_MULT = 2;
export const CRIT_MULT_STEP = 0.25;
export const GREED_STEP = 0.1;        // +10% gold per level
export const SPIRIT_STEP = 0.01;      // tap gains 1% of total DPS per level
export const MILESTONE_EVERY = 25;    // sword and helpers double their damage every 25 levels
export const MILESTONE_MULT = 2;

// Prestige ("Yeniden Doğuş")
export const PRESTIGE_MIN_STAGE = 20;
export const SOUL_BONUS = 0.1;        // +10% all damage per soul

// Offline progress
export const OFFLINE_MIN = 60;        // seconds away before offline gold kicks in
export const OFFLINE_CAP = 8 * 3600;
export const OFFLINE_RATE = 0.5;      // fraction of the online gold rate

export const AUTOSAVE_MS = 10000;
export const BUY_AMOUNTS = [1, 10, 100, 'max'];

// Tap upgrades. `max` caps the level; Infinity means no cap.
export const UPGRADES = [
  { id: 'sword',   name: 'Keskin Kılıç',  icon: 'swordIcon', baseCost: 5,    growth: 1.07, max: Infinity, desc: 'Her 25 seviyede hasar ×2' },
  { id: 'crit',    name: 'Kartal Gözü',   icon: 'target', baseCost: 100,  growth: 1.4,  max: 48,       desc: 'Kritik vuruş şansı (en fazla %50)' },
  { id: 'critDmg', name: 'Ölümcül Darbe', icon: 'bolt',   baseCost: 400,  growth: 1.55, max: Infinity, desc: 'Kritik vuruşların hasar çarpanı' },
  { id: 'greed',   name: 'Altın Kese',    icon: 'bag',    baseCost: 250,  growth: 1.5,  max: Infinity, desc: 'Düşmanlardan düşen altın' },
  { id: 'spirit',  name: 'Savaş Ruhu',    icon: 'flame',  baseCost: 3000, growth: 1.6,  max: Infinity, desc: 'Yoldaş hasarının bir kısmı dokunuşa eklenir' },
];

// Companions that deal damage per second. `sprite` picks the body, `colors` recolors it,
// `shot` and `shotColor` drive the projectile they throw at the enemy.
export const HELPERS = [
  { id: 'archer',   name: 'Okçu Elif',        baseCost: 50,    baseDps: 5,      sprite: 'hood', colors: { H: '#38b764', C: '#257179' }, shot: 'arrow', shotColor: '#f4f4f4' },
  { id: 'mage',     name: 'Büyücü Kaan',      baseCost: 250,   baseDps: 22,     sprite: 'hat',  colors: { H: '#3b5dc9', C: '#29366f' }, shot: 'orb',   shotColor: '#73eff7' },
  { id: 'guard',    name: 'Muhafız Deniz',    baseCost: 1e3,   baseDps: 74,     sprite: 'helm', colors: { H: '#94b0c2', C: '#b13e53' }, shot: 'arrow', shotColor: '#ffcd75' },
  { id: 'rogue',    name: 'Hırsız Ece',       baseCost: 4e3,   baseDps: 245,    sprite: 'hood', colors: { H: '#566c86', C: '#333c57' }, shot: 'arrow', shotColor: '#94b0c2' },
  { id: 'healer',   name: 'Şifacı Can',       baseCost: 2e4,   baseDps: 976,    sprite: 'hood', colors: { H: '#f4f4f4', C: '#ffcd75' }, shot: 'orb',   shotColor: '#ffcd75' },
  { id: 'witch',    name: 'Ateş Cadısı Ayla', baseCost: 1e5,   baseDps: 3725,   sprite: 'hat',  colors: { H: '#b13e53', C: '#5d275d' }, shot: 'orb',   shotColor: '#ef7d57' },
  { id: 'paladin',  name: 'Şövalye Mert',     baseCost: 4e5,   baseDps: 10859,  sprite: 'helm', colors: { H: '#ffcd75', C: '#3b5dc9' }, shot: 'spark', shotColor: '#ffcd75' },
  { id: 'druid',    name: 'Druid Nil',        baseCost: 2.5e6, baseDps: 47143,  sprite: 'hood', colors: { H: '#a7f070', C: '#38b764' }, shot: 'orb',   shotColor: '#a7f070' },
  { id: 'hunter',   name: 'Avcı Barış',       baseCost: 1.5e7, baseDps: 186000, sprite: 'hood', colors: { H: '#ef7d57', C: '#7a4b2a' }, shot: 'arrow', shotColor: '#ffcd75' },
  { id: 'archmage', name: 'Başbüyücü Selin',  baseCost: 1e8,   baseDps: 782000, sprite: 'hat',  colors: { H: '#5d275d', C: '#29366f' }, shot: 'orb',   shotColor: '#c879f0' },
  { id: 'titan',    name: 'Dev Tunç',         baseCost: 8e8,   baseDps: 3.72e6, sprite: 'helm', colors: { H: '#566c86', C: '#333c57' }, shot: 'spark', shotColor: '#f4f4f4' },
  { id: 'dragon',   name: 'Ejder Binici Ada', baseCost: 6.5e9, baseDps: 1.7e7,  sprite: 'helm', colors: { H: '#b13e53', C: '#ef7d57' }, shot: 'orb',   shotColor: '#ef7d57' },
].map((h) => ({ growth: 1.07, max: Infinity, ...h }));

// Zones cycle every STAGES_PER_ZONE stages. `enemies` entries pick a sprite and recolor it.
// Background: `sky` top→horizon, `far`/`near` silhouettes, `ground` [edge, top, body, speckle].
export const ZONES = [
  {
    name: 'Yeşil Çayır',
    sky: ['#3b5dc9', '#41a6f6', '#73eff7'],
    far: { shape: 'peaks', color: '#94b0c2' },
    near: { shape: 'hills', color: '#38b764' },
    ground: ['#a7f070', '#38b764', '#7a4b2a', '#5c3a26'],
    deco: 'clouds',
    enemies: [
      { sprite: 'slime',    name: 'Yeşil Balçık',   colors: { G: '#38b764', g: '#a7f070', D: '#257179' } },
      { sprite: 'bat',      name: 'Mor Yarasa',     colors: { P: '#5d275d', p: '#b13e53' } },
      { sprite: 'mushroom', name: 'Kızıl Mantar',   colors: { R: '#b13e53', C: '#f4e4c0' } },
    ],
  },
  {
    name: 'Karanlık Orman',
    sky: ['#1a1c2c', '#29366f', '#257179'],
    far: { shape: 'trees', color: '#1f4a4f' },
    near: { shape: 'trees', color: '#143329' },
    ground: ['#38b764', '#257179', '#3b2a20', '#2a1d16'],
    deco: 'fireflies',
    enemies: [
      { sprite: 'mushroom', name: 'Zehirli Mantar', colors: { R: '#5d275d', C: '#c8d8b0' } },
      { sprite: 'slime',    name: 'Bataklık Balçığı', colors: { G: '#257179', g: '#38b764', D: '#1a3a3a' } },
      { sprite: 'skeleton', name: 'Orman İskeleti', colors: { W: '#c8d8b0' } },
    ],
  },
  {
    name: 'Kristal Mağara',
    sky: ['#1a1c2c', '#1a1c2c', '#333c57'],
    far: { shape: 'stalactites', color: '#29366f' },
    near: { shape: 'rocks', color: '#333c57' },
    ground: ['#94b0c2', '#566c86', '#333c57', '#29366f'],
    deco: 'sparkles',
    enemies: [
      { sprite: 'bat',      name: 'Mağara Yarasası', colors: { P: '#333c57', p: '#73eff7' } },
      { sprite: 'slime',    name: 'Kristal Balçık',  colors: { G: '#41a6f6', g: '#73eff7', D: '#29366f' } },
      { sprite: 'skeleton', name: 'Madenci İskelet', colors: { W: '#f4f4f4' } },
    ],
  },
  {
    name: 'Kızıl Çöl',
    sky: ['#ef7d57', '#ffcd75', '#fff1c0'],
    far: { shape: 'peaks', color: '#d9775a' },
    near: { shape: 'dunes', color: '#e8a55a' },
    ground: ['#fff1c0', '#ffcd75', '#e0a050', '#c58a3e'],
    deco: 'sun',
    enemies: [
      { sprite: 'skeleton', name: 'Kum İskeleti',   colors: { W: '#fff1c0' } },
      { sprite: 'slime',    name: 'Lav Balçığı',    colors: { G: '#ef7d57', g: '#ffcd75', D: '#b13e53' } },
      { sprite: 'bat',      name: 'Akbaba Yarasa',  colors: { P: '#7a4b2a', p: '#ef7d57' } },
    ],
  },
  {
    name: 'Buz Diyarı',
    sky: ['#29366f', '#3b5dc9', '#94b0c2'],
    far: { shape: 'peaks', color: '#f4f4f4' },
    near: { shape: 'hills', color: '#94b0c2' },
    ground: ['#f4f4f4', '#d4e4f0', '#94b0c2', '#73eff7'],
    deco: 'snow',
    enemies: [
      { sprite: 'slime',    name: 'Buz Balçığı',    colors: { G: '#73eff7', g: '#f4f4f4', D: '#41a6f6' } },
      { sprite: 'ghost',    name: 'Kar Hayaleti',   colors: { W: '#f4f4f4' } },
      { sprite: 'bat',      name: 'Ayaz Yarasası',  colors: { P: '#94b0c2', p: '#41a6f6' } },
    ],
  },
  {
    name: 'Volkan',
    sky: ['#1a1c2c', '#5d275d', '#b13e53'],
    far: { shape: 'peaks', color: '#333c57' },
    near: { shape: 'rocks', color: '#1a1c2c' },
    ground: ['#ef7d57', '#b13e53', '#333c57', '#1a1c2c'],
    deco: 'embers',
    enemies: [
      { sprite: 'ghost',    name: 'Alev Ruhu',      colors: { W: '#ef7d57' } },
      { sprite: 'skeleton', name: 'Kor İskelet',    colors: { W: '#94b0c2' } },
      { sprite: 'slime',    name: 'Magma Balçığı',  colors: { G: '#b13e53', g: '#ef7d57', D: '#5d275d' } },
    ],
  },
];
