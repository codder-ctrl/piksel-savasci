import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import {
  UPGRADES, HELPERS, ZONES, KILLS_PER_STAGE, BOSS_TIME, BOSS_HP_MULT, RESPAWN_DELAY,
  PRESTIGE_MIN_STAGE, OFFLINE_MIN, OFFLINE_CAP, MAX_CRIT_CHANCE,
} from '../js/config.js';
import { SPRITES } from '../js/sprite-data.js';

const noCrit = () => 0.99;   // rng that never crits and always picks enemy kind 2
const alwaysCrit = () => 0;

function fresh() {
  return L.newGame(noCrit, 0);
}

// Taps until the current enemy dies, then lets it respawn.
function killOne(state, events = []) {
  let guard = 0;
  while (state.enemy.respawn <= 0 && guard++ < 1e6) L.tap(state, noCrit, events);
  L.tick(state, RESPAWN_DELAY + 0.01, noCrit, events);
  return events;
}

test('sprites have equal-length rows and every pixel has a color', () => {
  for (const [name, s] of Object.entries(SPRITES)) {
    const w = s.rows[0].length;
    for (const row of s.rows) {
      assert.equal(row.length, w, `${name}: row "${row}"`);
      for (const ch of row) if (ch !== '.') assert.ok(s.pal[ch], `${name}: no color for '${ch}'`);
    }
  }
});

test('content tables point at existing sprites', () => {
  for (const u of UPGRADES) assert.ok(SPRITES[u.icon], u.id);
  for (const h of HELPERS) assert.ok(SPRITES[h.sprite], h.id);
  for (const z of ZONES) for (const e of z.enemies) assert.ok(SPRITES[e.sprite], e.name);
});

test('enemy hp grows each stage and bosses are tougher', () => {
  for (let s = 1; s < 60; s++) assert.ok(L.enemyMaxHp(s + 1) > L.enemyMaxHp(s));
  assert.ok(L.enemyMaxHp(5, true) > (L.enemyMaxHp(5) - 1) * BOSS_HP_MULT);
  assert.equal(L.isBossStage(5), true);
  assert.equal(L.isBossStage(6), false);
});

test('ten kills unlock the next stage and auto-advance moves there', () => {
  const s = fresh();
  for (let i = 0; i < KILLS_PER_STAGE - 1; i++) killOne(s);
  assert.equal(s.maxStage, 1);
  assert.equal(s.kills, KILLS_PER_STAGE - 1);
  const events = killOne(s);
  assert.equal(s.maxStage, 2);
  assert.equal(s.stage, 2);
  assert.equal(s.kills, 0);
  assert.ok(events.some((e) => e.type === 'unlock' && e.stage === 2));
  assert.ok(s.gold > 0);
});

test('without auto-advance the player stays on the stage after unlocking', () => {
  const s = fresh();
  s.autoAdvance = false;
  for (let i = 0; i < KILLS_PER_STAGE; i++) killOne(s);
  assert.equal(s.maxStage, 2);
  assert.equal(s.stage, 1);
});

test('taps do nothing while the next enemy is on its way', () => {
  const s = fresh();
  killOne(s);
  while (s.enemy.respawn <= 0) L.tap(s, noCrit);
  const taps = s.stats.taps;
  assert.equal(L.tap(s, noCrit), null);
  assert.equal(s.stats.taps, taps);
});

test('crits multiply tap damage', () => {
  const s = fresh();
  const normal = L.tap(s, noCrit).dmg;
  const s2 = fresh();
  const crit = L.tap(s2, alwaysCrit);
  assert.equal(crit.crit, true);
  assert.equal(crit.dmg, normal * L.critMultiplier(s2));
  s2.upgrades.crit = 1000;
  assert.equal(L.critChance(s2), MAX_CRIT_CHANCE);
});

test('a boss that runs out of time sends the player back and stops auto-advance', () => {
  const s = fresh();
  s.maxStage = 5;
  L.setStage(s, 5, noCrit);
  assert.equal(s.enemy.boss, true);
  const events = L.tick(s, BOSS_TIME + 1, noCrit);
  assert.ok(events.some((e) => e.type === 'bossFail'));
  assert.equal(s.stage, 4);
  assert.equal(s.autoAdvance, false);
  assert.equal(s.enemy.boss, false);
});

test('killing a boss unlocks the next stage at once', () => {
  const s = fresh();
  s.maxStage = 5;
  L.setStage(s, 5, noCrit);
  killOne(s);
  assert.equal(s.maxStage, 6);
  assert.equal(s.stats.bossKills, 1);
});

test('helpers deal damage over time', () => {
  const s = fresh();
  s.helpers.archer = 10;
  assert.equal(L.totalDps(s), HELPERS[0].baseDps * 10);
  const hp = s.enemy.hp;
  L.tick(s, 0.1, noCrit);
  assert.ok(s.enemy.hp < hp);
});

test('milestones double damage every 25 levels', () => {
  const s = fresh();
  const def = HELPERS[0];
  assert.equal(L.helperDps(s, def, 25), def.baseDps * 25 * 2);
  assert.equal(L.helperDps(s, def, 50), def.baseDps * 50 * 4);
  assert.equal(L.swordDamage(s, 24), 25);
  assert.equal(L.swordDamage(s, 25), 52);
});

test('bulk cost matches buying one level at a time', () => {
  const def = HELPERS[3];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += def.baseCost * def.growth ** (7 + i);
  assert.ok(Math.abs(L.costFor(def, 7, 10) - sum) <= 1);
});

test('maxAffordable buys as many levels as the gold allows', () => {
  const def = UPGRADES[0];
  for (const gold of [0, 4, 5, 100, 12345, 1e9]) {
    const n = L.maxAffordable(def, 3, gold);
    if (n > 0) assert.ok(L.costFor(def, 3, n) <= gold, `gold ${gold}`);
    assert.ok(L.costFor(def, 3, n + 1) > gold, `gold ${gold}`);
  }
});

test('purchase plans respect level caps and show a price when broke', () => {
  const crit = UPGRADES.find((u) => u.id === 'crit');
  assert.deepEqual(L.purchasePlan(crit, crit.max, 1e99, 1), { n: 0, cost: Infinity });
  assert.equal(L.purchasePlan(crit, crit.max - 3, 1e99, 100).n, 3);
  assert.equal(L.purchasePlan(crit, crit.max - 3, 1e99, 'max').n, 3);
  const plan = L.purchasePlan(crit, 0, 0, 'max');
  assert.equal(plan.n, 1);
  assert.equal(plan.cost, crit.baseCost);
});

test('buy spends gold and refuses when short', () => {
  const s = fresh();
  assert.equal(L.buy(s, 'helper', 'archer'), false);
  s.gold = 1000;
  assert.equal(L.buy(s, 'helper', 'archer', 10), true);
  assert.equal(s.helpers.archer, 10);
  assert.equal(s.gold, 1000 - L.costFor(HELPERS[0], 0, 10));
  assert.equal(L.buy(s, 'helper', 'nope'), false);
});

test('prestige needs the minimum stage, then resets the run but keeps souls and stats', () => {
  const s = fresh();
  s.maxStage = PRESTIGE_MIN_STAGE - 1;
  assert.equal(L.prestigeSouls(s), 0);
  assert.equal(L.prestige(s), 0);

  s.maxStage = 40;
  s.gold = 999;
  s.helpers.mage = 5;
  s.upgrades.sword = 50;
  s.stats.kills = 77;
  s.settings.sound = false;
  const gain = L.prestigeSouls(s);
  assert.ok(gain > 0);
  assert.equal(L.prestige(s, noCrit), gain);
  assert.equal(s.souls, gain);
  assert.equal(s.gold, 0);
  assert.equal(s.stage, 1);
  assert.equal(s.maxStage, 1);
  assert.equal(s.helpers.mage, 0);
  assert.equal(s.upgrades.sword, 0);
  assert.equal(s.stats.kills, 77);
  assert.equal(s.stats.prestiges, 1);
  assert.equal(s.settings.sound, false);
  assert.ok(L.tapDamage(s) > 1);
});

test('offline gold needs helpers, a minimum absence and is capped', () => {
  const s = fresh();
  assert.equal(L.offlineGold(s, 3600), 0);
  s.helpers.archer = 20;
  assert.equal(L.offlineGold(s, OFFLINE_MIN - 1), 0);
  const hour = L.offlineGold(s, 3600);
  assert.ok(hour > 0);
  assert.equal(L.offlineGold(s, OFFLINE_CAP * 3), L.offlineGold(s, OFFLINE_CAP));
  assert.equal(L.applyOffline(s, 3600), hour);
  assert.equal(s.gold, hour);
});

test('loadState accepts its own output and repairs bad data', () => {
  const s = fresh();
  s.gold = 1234;
  s.maxStage = 9;
  s.stage = 7;
  s.helpers.guard = 3;
  s.settings.buyAmount = 'max';
  const round = L.loadState(JSON.parse(JSON.stringify(L.serializeState(s))), noCrit);
  assert.equal(round.gold, 1234);
  assert.equal(round.stage, 7);
  assert.equal(round.helpers.guard, 3);
  assert.equal(round.settings.buyAmount, 'max');
  assert.ok(round.enemy);

  const bad = L.loadState({ gold: -5, stage: 50, maxStage: 'x', upgrades: { crit: 1e9, bogus: 3 }, helpers: null, stats: { kills: NaN } }, noCrit);
  assert.equal(bad.gold, 0);
  assert.equal(bad.maxStage, 1);
  assert.equal(bad.stage, 1);
  assert.equal(bad.upgrades.crit, UPGRADES.find((u) => u.id === 'crit').max);
  assert.equal('bogus' in bad.upgrades, false);
  assert.equal(bad.stats.kills, 0);
  assert.equal(L.loadState(null).stage, 1);
  assert.equal(L.loadState('junk').gold, 0);
});

test('formatNumber uses short suffixes', () => {
  assert.equal(L.formatNumber(0), '0');
  assert.equal(L.formatNumber(999), '999');
  assert.equal(L.formatNumber(1.95), '1.9');
  assert.equal(L.formatNumber(1000), '1K');
  assert.equal(L.formatNumber(1500), '1.5K');
  assert.equal(L.formatNumber(999999), '999K');
  assert.equal(L.formatNumber(1e6), '1M');
  assert.equal(L.formatNumber(12.34e9), '12.3B');
  assert.equal(L.formatNumber(1e15), '1aa');
  assert.equal(L.formatNumber(2.5e18), '2.5ab');
  assert.equal(L.formatNumber(Infinity), '∞');
});

test('formatDuration', () => {
  assert.equal(L.formatDuration(5), '5 sn');
  assert.equal(L.formatDuration(125), '2 dk 5 sn');
  assert.equal(L.formatDuration(7260), '2 sa 1 dk');
});
