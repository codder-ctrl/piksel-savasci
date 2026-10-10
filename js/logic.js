import {
  SAVE_VERSION, KILLS_PER_STAGE, BOSS_EVERY, BOSS_TIME, BOSS_HP_MULT, STAGES_PER_ZONE,
  HP_BASE, HP_GROWTH, GOLD_PER_HP, RESPAWN_DELAY, BASE_CRIT_CHANCE, CRIT_CHANCE_STEP,
  MAX_CRIT_CHANCE, BASE_CRIT_MULT, CRIT_MULT_STEP, GREED_STEP, SPIRIT_STEP, MILESTONE_EVERY,
  MILESTONE_MULT, PRESTIGE_MIN_STAGE, SOUL_BONUS, OFFLINE_MIN, OFFLINE_CAP, OFFLINE_RATE,
  BUY_AMOUNTS, UPGRADES, HELPERS, ZONES,
} from './config.js';

// Pure game rules: no DOM, no timers. Functions that change the game take the state object,
// mutate it, and push what happened ({ type: 'hit' | 'kill' | 'unlock' | 'stage' | 'spawn' |
// 'bossFail', ... }) onto an `events` array so the renderer can animate it.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function newGame(rng = Math.random, now = Date.now()) {
  const state = {
    v: SAVE_VERSION,
    gold: 0,
    souls: 0,
    stage: 1,
    maxStage: 1,        // highest unlocked stage in this run
    kills: 0,           // progress on maxStage
    autoAdvance: true,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    helpers: Object.fromEntries(HELPERS.map((h) => [h.id, 0])),
    stats: { taps: 0, crits: 0, kills: 0, bossKills: 0, totalGold: 0, prestiges: 0, playTime: 0, bestStage: 1 },
    settings: { sound: true, buyAmount: 1 },
    enemy: null,
    lastSeen: now,
  };
  spawnEnemy(state, rng);
  return state;
}

// ---- Stages and enemies ----

export const isBossStage = (stage) => stage % BOSS_EVERY === 0;
export const zoneIndex = (stage) => Math.floor((stage - 1) / STAGES_PER_ZONE) % ZONES.length;

export function enemyMaxHp(stage, boss = false) {
  const hp = HP_BASE * HP_GROWTH ** (stage - 1);
  return Math.ceil(boss ? hp * BOSS_HP_MULT : hp);
}

export function enemyGold(state, stage, boss = false) {
  return Math.max(1, Math.ceil(enemyMaxHp(stage, boss) * GOLD_PER_HP * goldMultiplier(state)));
}

export function spawnEnemy(state, rng = Math.random) {
  const boss = isBossStage(state.stage);
  const zone = ZONES[zoneIndex(state.stage)];
  const maxHp = enemyMaxHp(state.stage, boss);
  state.enemy = {
    kind: Math.floor(rng() * zone.enemies.length),
    boss,
    hp: maxHp,
    maxHp,
    timeLeft: boss ? BOSS_TIME : 0,
    respawn: 0,
  };
}

// Moves to another unlocked stage and spawns its enemy right away.
export function setStage(state, stage, rng = Math.random, events = []) {
  stage = clamp(Math.round(stage), 1, state.maxStage);
  if (stage === state.stage) return false;
  state.stage = stage;
  spawnEnemy(state, rng);
  events.push({ type: 'stage', stage });
  return true;
}

// ---- Damage ----

export const milestoneMultiplier = (level) => MILESTONE_MULT ** Math.floor(level / MILESTONE_EVERY);
export const soulMultiplier = (state) => 1 + state.souls * SOUL_BONUS;
export const goldMultiplier = (state) => 1 + state.upgrades.greed * GREED_STEP;
export const critChance = (state) => Math.min(MAX_CRIT_CHANCE, BASE_CRIT_CHANCE + state.upgrades.crit * CRIT_CHANCE_STEP);
export const critMultiplier = (state) => BASE_CRIT_MULT + state.upgrades.critDmg * CRIT_MULT_STEP;

export function helperDps(state, def, level = state.helpers[def.id]) {
  return level > 0 ? def.baseDps * level * milestoneMultiplier(level) * soulMultiplier(state) : 0;
}

export function totalDps(state) {
  let sum = 0;
  for (const h of HELPERS) sum += helperDps(state, h);
  return sum;
}

export function swordDamage(state, level = state.upgrades.sword) {
  return (1 + level) * milestoneMultiplier(level) * soulMultiplier(state);
}

export function tapDamage(state, spirit = state.upgrades.spirit) {
  return swordDamage(state) + totalDps(state) * spirit * SPIRIT_STEP;
}

function addGold(state, amount) {
  state.gold += amount;
  state.stats.totalGold += amount;
}

function killEnemy(state, events) {
  const e = state.enemy;
  const gold = enemyGold(state, state.stage, e.boss);
  e.hp = 0;
  e.respawn = RESPAWN_DELAY;
  addGold(state, gold);
  state.stats.kills++;
  if (e.boss) state.stats.bossKills++;
  events.push({ type: 'kill', gold, boss: e.boss });

  if (state.stage === state.maxStage) {
    state.kills = e.boss ? KILLS_PER_STAGE : state.kills + 1;
    if (state.kills >= KILLS_PER_STAGE) {
      state.maxStage++;
      state.kills = 0;
      state.stats.bestStage = Math.max(state.stats.bestStage, state.maxStage);
      events.push({ type: 'unlock', stage: state.maxStage });
    }
  }
  // The next enemy spawns from the new stage once the respawn delay ends.
  if (state.autoAdvance && state.stage < state.maxStage) {
    state.stage++;
    events.push({ type: 'stage', stage: state.stage });
  }
}

function damageEnemy(state, dmg, events) {
  const e = state.enemy;
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(state, events);
}

// A player tap. Returns the hit event, or null while the next enemy is still on its way.
export function tap(state, rng = Math.random, events = []) {
  if (state.enemy.respawn > 0) return null;
  state.stats.taps++;
  const crit = rng() < critChance(state);
  const dmg = tapDamage(state) * (crit ? critMultiplier(state) : 1);
  if (crit) state.stats.crits++;
  const hit = { type: 'hit', dmg, crit };
  events.push(hit);
  damageEnemy(state, dmg, events);
  return hit;
}

// Advances time: respawn delay, helper damage and the boss timer.
export function tick(state, dt, rng = Math.random, events = []) {
  state.stats.playTime += dt;
  const e = state.enemy;
  if (e.respawn > 0) {
    e.respawn -= dt;
    if (e.respawn <= 0) {
      spawnEnemy(state, rng);
      events.push({ type: 'spawn' });
    }
    return events;
  }
  const dps = totalDps(state);
  if (dps > 0) damageEnemy(state, dps * dt, events);
  if (e.boss && e.hp > 0) {
    e.timeLeft -= dt;
    if (e.timeLeft <= 0) {
      // Failing a boss drops back a stage and stops auto-advance until the player retries.
      state.autoAdvance = false;
      events.push({ type: 'bossFail' });
      setStage(state, state.stage - 1, rng, events);
    }
  }
  return events;
}

// ---- Shop ----

export const findDef = (kind, id) => (kind === 'helper' ? HELPERS : UPGRADES).find((d) => d.id === id);
const levelsOf = (state, kind) => (kind === 'helper' ? state.helpers : state.upgrades);

// Total cost of the next `n` levels starting from `level` (geometric series).
export function costFor(def, level, n = 1) {
  const g = def.growth;
  const first = def.baseCost * g ** level;
  return Math.ceil(n === 1 ? first : first * (g ** n - 1) / (g - 1));
}

export function maxAffordable(def, level, gold) {
  const room = def.max - level;
  if (room <= 0 || gold < costFor(def, level, 1)) return 0;
  const g = def.growth;
  const first = def.baseCost * g ** level;
  let n = Math.floor(Math.log(gold * (g - 1) / first + 1) / Math.log(g));
  n = clamp(n, 1, room);
  // Correct for float error in the closed form.
  while (n > 1 && costFor(def, level, n) > gold) n--;
  while (n < room && costFor(def, level, n + 1) <= gold) n++;
  return n;
}

// How many levels a buy button would purchase and what it costs. For 'max' with nothing
// affordable it reports the next single level, so the button can show a price.
export function purchasePlan(def, level, gold, amount) {
  const room = def.max - level;
  if (room <= 0) return { n: 0, cost: Infinity };
  const n = amount === 'max' ? Math.max(1, maxAffordable(def, level, gold)) : Math.min(room, amount);
  return { n, cost: costFor(def, level, n) };
}

export function buy(state, kind, id, amount = 1) {
  const def = findDef(kind, id);
  if (!def) return false;
  const levels = levelsOf(state, kind);
  const { n, cost } = purchasePlan(def, levels[id], state.gold, amount);
  if (n <= 0 || cost > state.gold) return false;
  state.gold -= cost;
  levels[id] += n;
  return true;
}

// ---- Prestige ----

export function prestigeSouls(state) {
  if (state.maxStage < PRESTIGE_MIN_STAGE) return 0;
  return Math.floor((state.maxStage - 15) ** 1.5 / 5);
}

// Resets the run for souls. Keeps souls, stats and settings. Returns the souls gained.
export function prestige(state, rng = Math.random) {
  const gain = prestigeSouls(state);
  if (gain <= 0) return 0;
  const fresh = newGame(rng, state.lastSeen);
  fresh.souls = state.souls + gain;
  fresh.stats = { ...state.stats, prestiges: state.stats.prestiges + 1 };
  fresh.settings = state.settings;
  Object.assign(state, fresh);
  return gain;
}

// ---- Offline progress ----

// Gold the helpers would have earned while the game was closed, farming the current stage
// (or the one before it on a boss stage) at OFFLINE_RATE efficiency.
export function offlineGold(state, seconds) {
  const sec = Math.min(seconds, OFFLINE_CAP);
  if (!(sec >= OFFLINE_MIN)) return 0;
  const dps = totalDps(state);
  if (dps <= 0) return 0;
  const stage = isBossStage(state.stage) ? state.stage - 1 : state.stage;
  const secondsPerKill = enemyMaxHp(stage) / dps + RESPAWN_DELAY;
  return Math.floor((sec / secondsPerKill) * enemyGold(state, stage) * OFFLINE_RATE);
}

export function applyOffline(state, seconds) {
  const gold = offlineGold(state, seconds);
  if (gold > 0) addGold(state, gold);
  return gold;
}

// ---- Saving ----

export function serializeState(state) {
  const { enemy, ...rest } = state;
  return rest;
}

// Builds a valid state from untrusted saved data, falling back to defaults field by field.
export function loadState(raw, rng = Math.random, now = Date.now()) {
  const s = newGame(rng, now);
  if (!raw || typeof raw !== 'object') return s;
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const int = (v, d) => Math.floor(num(v, d));

  s.gold = num(raw.gold, 0);
  s.souls = int(raw.souls, 0);
  s.maxStage = Math.max(1, int(raw.maxStage, 1));
  s.stage = clamp(int(raw.stage, 1), 1, s.maxStage);
  s.kills = clamp(int(raw.kills, 0), 0, KILLS_PER_STAGE - 1);
  s.autoAdvance = raw.autoAdvance !== false;
  for (const u of UPGRADES) s.upgrades[u.id] = Math.min(u.max, int(raw.upgrades?.[u.id], 0));
  for (const h of HELPERS) s.helpers[h.id] = int(raw.helpers?.[h.id], 0);
  for (const k of Object.keys(s.stats)) s.stats[k] = num(raw.stats?.[k], s.stats[k]);
  if (typeof raw.settings?.sound === 'boolean') s.settings.sound = raw.settings.sound;
  if (BUY_AMOUNTS.includes(raw.settings?.buyAmount)) s.settings.buyAmount = raw.settings.buyAmount;
  s.lastSeen = num(raw.lastSeen, now);
  spawnEnemy(s, rng);
  return s;
}

// ---- Formatting ----

const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

function suffix(tier) {
  if (tier < SUFFIXES.length) return SUFFIXES[tier];
  const i = tier - SUFFIXES.length; // aa, ab, … az, ba, …
  return String.fromCharCode(97 + Math.floor(i / 26) % 26, 97 + (i % 26));
}

export function formatNumber(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return Number.isInteger(n) ? String(n) : String(Math.floor(n * 10) / 10);
  let tier = Math.floor(Math.log10(n) / 3);
  let scaled = n / 10 ** (tier * 3);
  if (scaled >= 1000) { tier++; scaled /= 1000; }
  if (scaled < 1) { tier--; scaled *= 1000; }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const p = 10 ** digits;
  return String(Math.floor(scaled * p + 1e-9) / p) + suffix(tier);
}

export function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk ${s} sn`;
  return `${s} sn`;
}
