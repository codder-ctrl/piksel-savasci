// Game constants and content tables. Pure data with no DOM access, so tests can import it.

export const STORAGE_KEY = 'piksel-savasci-v1';
export const SAVE_VERSION = 2;           // 2: helpers became pets + dungeon companions

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
export const MILESTONE_EVERY = 25;    // the sword doubles its damage every 25 levels
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
  { id: 'spirit',  name: 'Savaş Ruhu',    icon: 'flame',  baseCost: 3000, growth: 1.6,  max: Infinity, desc: 'Pet hasarının bir kısmı dokunuşa eklenir' },
];

// Active skills: used from the skill bar, then they cool down. They unlock at `unlockStage`
// (in the current run) and are leveled with gold; effect per level is in logic.skillPower.
// `cooldown` starts when the skill is used, so it includes `duration`.
export const SKILLS = [
  { id: 'rage',     name: 'Öfke',            icon: 'skRage',  unlockStage: 5,  baseCost: 300,   growth: 4, max: 10, duration: 30, cooldown: 300, color: '#ef7d57' },
  { id: 'warcry',   name: 'Savaş Narası',    icon: 'skHorn',  unlockStage: 12, baseCost: 3000,  growth: 4, max: 10, duration: 30, cooldown: 300, color: '#ffcd75' },
  { id: 'storm',    name: 'Kılıç Fırtınası', icon: 'skStorm', unlockStage: 20, baseCost: 4e4,   growth: 4, max: 10, duration: 20, cooldown: 600, color: '#73eff7' },
  { id: 'focus',    name: 'Keskin Bakış',    icon: 'skEye',   unlockStage: 30, baseCost: 8e5,   growth: 4, max: 10, duration: 30, cooldown: 480, color: '#41a6f6' },
  { id: 'goldRain', name: 'Altın Yağmuru',   icon: 'skCoins', unlockStage: 40, baseCost: 2e7,   growth: 4, max: 10, duration: 0,  cooldown: 900, color: '#ffcd75' },
];
export const MAX_SKILL_CRIT_CHANCE = 0.95;

// ---- Pets (main battle) ----
// One pet fights beside the hero. Its damage is the shared "Pet Eğitimi" level (gold, resets
// on rebirth) times the pet's own multiplier: rarity × evolution form × stars.

export const PET_TRAINING = { id: 'train', name: 'Pet Eğitimi', icon: 'paw', baseCost: 50, growth: 1.07, max: Infinity };
export const PET_BASE_DPS = 5;
export const PET_DPS_GROWTH = 1.045;  // per training level; under the 1.07 cost growth, so runs hit a wall (~stage 80 with the starter dog)

export const EGG_COST = 100;          // elmas per random pet
export const STARTING_ELMAS = 100;
export const BOSS_ELMAS = 10;         // first time each main-battle boss stage is beaten (all-time)
export const STARTER_PET = 'dog';
export const FORM_MULT = [1, 2.5, 6];
export const STAR_BONUS = 0.2;        // +20% pet damage per duplicate
export const MAX_STARS = 5;
export const DUPLICATE_KRISTAL = 30;  // paid instead of a star once a pet has MAX_STARS

export const RARITIES = [
  { id: 'common',    name: 'Sıradan',  color: '#94b0c2', weight: 60,  mult: 1,   evolveCost: [40, 160] },
  { id: 'rare',      name: 'Nadir',    color: '#41a6f6', weight: 30,  mult: 1.6, evolveCost: [80, 320] },
  { id: 'epic',      name: 'Destansı', color: '#c879f0', weight: 8.5, mult: 2.5, evolveCost: [150, 600] },
  { id: 'legendary', name: 'Efsanevi', color: '#ffcd75', weight: 1.5, mult: 4,   evolveCost: [300, 1200] },
];

// Pet sprites mark evolution parts with digits: '1' is recolored per form (so form 1 maps it
// to the body color), '3' only shows from form 2 and '2' only on form 3.
export const PETS = [
  {
    id: 'dog', rarity: 'common', sprite: 'petDog', shot: 'spark', shotColor: '#f4f4f4',
    forms: [
      { name: 'Köpek',           colors: { B: '#c8a070', 1: '#c8a070' } },
      { name: 'Kurt',            colors: { B: '#94b0c2', 1: '#b13e53' } },
      { name: 'Cehennem Tazısı', colors: { B: '#333c57', 1: '#ffcd75', e: '#ef7d57', 2: '#ef7d57' } },
    ],
  },
  {
    id: 'cat', rarity: 'common', sprite: 'petCat', shot: 'spark', shotColor: '#f4a0b0',
    forms: [
      { name: 'Kedi',         colors: { B: '#ef7d57', 1: '#ef7d57' } },
      { name: 'Vaşak',        colors: { B: '#e0a050', 1: '#7a4b2a', 3: '#333c57' } },
      { name: 'Gölge Panter', colors: { B: '#29366f', 1: '#c879f0', 3: '#c879f0', w: '#c879f0' } },
    ],
  },
  {
    id: 'robot', rarity: 'rare', sprite: 'petRobot', shot: 'arrow', shotColor: '#73eff7',
    forms: [
      { name: 'Mini Robot',   colors: { M: '#94b0c2', 1: '#94b0c2' } },
      { name: 'Savaş Robotu', colors: { M: '#566c86', c: '#ef7d57', 1: '#b13e53', 3: '#94b0c2' } },
      { name: 'Mega Robot',   colors: { M: '#ffcd75', c: '#73eff7', 1: '#3b5dc9', 3: '#f4f4f4', 2: '#73eff7' } },
    ],
  },
  {
    id: 'drone', rarity: 'rare', sprite: 'petDrone', shot: 'arrow', shotColor: '#ef7d57', float: true,
    forms: [
      { name: 'Drone',         colors: { M: '#94b0c2', 1: '#94b0c2' } },
      { name: 'Saldırı Dronu', colors: { M: '#333c57', c: '#b13e53', 1: '#ef7d57', 3: '#94b0c2' } },
      { name: 'Uydu Dronu',    colors: { M: '#f4f4f4', c: '#73eff7', 1: '#ffcd75', 3: '#ffcd75', 2: '#73eff7' } },
    ],
  },
  {
    id: 'dragon', rarity: 'epic', sprite: 'petDragon', shot: 'orb', shotColor: '#ef7d57',
    forms: [
      { name: 'Ejder Yavrusu', colors: { G: '#38b764', W: '#a7f070', H: '#f4f4f4', 1: '#a7f070' } },
      { name: 'Genç Ejder',    colors: { G: '#257179', W: '#38b764', H: '#ffcd75', 1: '#ffcd75' } },
      { name: 'Kadim Ejder',   colors: { G: '#b13e53', W: '#5d275d', H: '#ffcd75', 1: '#ffcd75', e: '#ffcd75', 2: '#ef7d57' } },
    ],
  },
  {
    id: 'phoenix', rarity: 'legendary', sprite: 'petPhoenix', shot: 'orb', shotColor: '#ffcd75', float: true,
    forms: [
      { name: 'Anka Yavrusu', colors: { R: '#ef7d57', O: '#ffcd75', 1: '#ef7d57', 3: '#ffcd75' } },
      { name: 'Anka Kuşu',    colors: { R: '#b13e53', O: '#ffcd75', 1: '#ffcd75', 3: '#ef7d57' } },
      { name: 'Ebedi Anka',   colors: { R: '#41a6f6', O: '#f4f4f4', 1: '#73eff7', 3: '#73eff7', e: '#f4f4f4', 2: '#73eff7' } },
    ],
  },
];

// ---- Companions (dungeon fighters) ----
// Recruited and leveled with kristal; a team of TEAM_SIZE fights in the dungeon tab.
// `legacyCost` is what they cost as gold helpers before v0.4, used to refund old saves.

export const TEAM_SIZE = 3;
export const STARTER_TEAM = ['archer', 'guard', 'healer'];

// Base stats per role; `mage` hits every enemy, `healer` heals the most hurt ally.
export const ROLES = {
  tank:   { name: 'Tank',  hp: 60, atk: 4, interval: 1.2 },
  dps:    { name: 'Vurucu', hp: 30, atk: 9, interval: 1.0 },
  mage:   { name: 'Büyücü', hp: 24, atk: 5, interval: 1.6 },
  healer: { name: 'Şifacı', hp: 28, atk: 3, heal: 10, interval: 1.4 },
};

export const COMPANIONS = [
  { id: 'archer',   name: 'Okçu Elif',        role: 'dps',    sprite: 'hood', colors: { H: '#38b764', C: '#257179' }, shot: 'arrow', shotColor: '#f4f4f4', legacyCost: 50 },
  { id: 'mage',     name: 'Büyücü Kaan',      role: 'mage',   sprite: 'hat',  colors: { H: '#3b5dc9', C: '#29366f' }, shot: 'orb',   shotColor: '#73eff7', legacyCost: 250 },
  { id: 'guard',    name: 'Muhafız Deniz',    role: 'tank',   sprite: 'helm', colors: { H: '#94b0c2', C: '#b13e53' }, shot: 'spark', shotColor: '#ffcd75', legacyCost: 1e3 },
  { id: 'rogue',    name: 'Hırsız Ece',       role: 'dps',    sprite: 'hood', colors: { H: '#566c86', C: '#333c57' }, shot: 'arrow', shotColor: '#94b0c2', legacyCost: 4e3 },
  { id: 'healer',   name: 'Şifacı Can',       role: 'healer', sprite: 'hood', colors: { H: '#f4f4f4', C: '#ffcd75' }, shot: 'orb',   shotColor: '#ffcd75', legacyCost: 2e4 },
  { id: 'witch',    name: 'Ateş Cadısı Ayla', role: 'mage',   sprite: 'hat',  colors: { H: '#b13e53', C: '#5d275d' }, shot: 'orb',   shotColor: '#ef7d57', legacyCost: 1e5 },
  { id: 'paladin',  name: 'Şövalye Mert',     role: 'tank',   sprite: 'helm', colors: { H: '#ffcd75', C: '#3b5dc9' }, shot: 'spark', shotColor: '#ffcd75', legacyCost: 4e5 },
  { id: 'druid',    name: 'Druid Nil',        role: 'healer', sprite: 'hood', colors: { H: '#a7f070', C: '#38b764' }, shot: 'orb',   shotColor: '#a7f070', legacyCost: 2.5e6 },
  { id: 'hunter',   name: 'Avcı Barış',       role: 'dps',    sprite: 'hood', colors: { H: '#ef7d57', C: '#7a4b2a' }, shot: 'arrow', shotColor: '#ffcd75', legacyCost: 1.5e7 },
  { id: 'archmage', name: 'Başbüyücü Selin',  role: 'mage',   sprite: 'hat',  colors: { H: '#5d275d', C: '#29366f' }, shot: 'orb',   shotColor: '#c879f0', legacyCost: 1e8 },
  { id: 'titan',    name: 'Dev Tunç',         role: 'tank',   sprite: 'helm', colors: { H: '#566c86', C: '#333c57' }, shot: 'spark', shotColor: '#f4f4f4', legacyCost: 8e8 },
  { id: 'dragon',   name: 'Ejder Binici Ada', role: 'dps',    sprite: 'helm', colors: { H: '#b13e53', C: '#ef7d57' }, shot: 'orb',   shotColor: '#ef7d57', legacyCost: 6.5e9 },
];

// ---- Dungeon ----
export const DUNGEON = {
  companionPower: 1.3,     // each later companion is this much stronger than the one before
  levelGrowth: 1.12,       // stat growth per companion level
  recruitBase: 25,         // kristal; grows ×recruitGrowth per companion index
  recruitGrowth: 1.55,
  levelBase: 6,            // kristal for level 2; grows ×levelCostGrowth per level
  levelCostGrowth: 1.22,
  enemyHp: 22,
  enemyAtk: 3,
  hpGrowth: 1.16,          // per floor
  atkGrowth: 1.14,
  enemyInterval: 1.5,
  bossEvery: 5,
  bossHp: 5,
  bossAtk: 2.5,
  clearPause: 1.2,         // seconds between floors
  defeatPause: 4,          // seconds to regroup after a wipe
  healBetween: 0.3,        // fraction of max HP restored after each floor
  bossElmas: 10,           // first clear of each boss floor
  enemies: [
    { sprite: 'slime',    colors: { G: '#5d275d', g: '#b13e53', D: '#333c57' } },
    { sprite: 'skeleton', colors: { W: '#c8d8b0' } },
    { sprite: 'bat',      colors: { P: '#333c57', p: '#b13e53' } },
    { sprite: 'ghost',    colors: { W: '#94b0c2' } },
    { sprite: 'mushroom', colors: { R: '#566c86', C: '#c8d8b0' } },
  ],
};

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
