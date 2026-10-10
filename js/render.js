import { sprite, spriteRotated } from './sprites.js';
import { HERO_HAND, SWORD_GRIP_ROW } from './sprite-data.js';
import { HELPERS, ZONES } from './config.js';
import { zoneIndex, formatNumber } from './logic.js';

// Draws the battle into a small pixel buffer (about TARGET_W pixels wide), scales it up by a
// whole number onto the visible canvas, then draws text (damage numbers, banners) at full
// resolution on top. All positions below are in buffer pixels unless named css*.

const TARGET_W = 104;
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOut = (t) => 1 - (1 - t) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const buf = document.createElement('canvas');
  const b = buf.getContext('2d');

  let W = 1, H = 1, S = 2, dpr = 1, groundY = 0;
  let bg = null, bgKey = '';
  let time = 0;
  let current = null;           // look of the enemy on screen: { stage, sprite, colors, boss }
  let onCoin = () => {};
  let coinTargetCss = { x: 24, y: 24 };

  const fx = { heroAttack: 0, slash: 0, slashY: 0, flash: 0, knock: 0, enter: 1, dying: null, shake: 0 };
  const particles = [];
  const coins = [];
  const numbers = [];
  const shots = [];
  const ripples = [];
  const weather = [];
  let banner = null;
  const helperTimer = HELPERS.map((_, i) => 0.4 + i * 0.13);
  const helperAtk = HELPERS.map(() => 0);

  // ---- Layout ----

  const heroX = () => Math.round(W * 0.42) - 8;
  const heroY = () => groundY - 15;
  const enemyCx = () => Math.round(W * 0.77);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    S = Math.max(2, Math.round(canvas.width / TARGET_W));
    W = Math.ceil(canvas.width / S);
    H = Math.ceil(canvas.height / S);
    buf.width = W;
    buf.height = H;
    groundY = H - Math.max(12, Math.round(H * 0.17));
    bgKey = '';
  }

  function enemyBox(look) {
    const sc = look.boss ? 2 : 1;
    const sp = sprite(look.sprite, look.colors);
    const float = look.sprite === 'bat' ? 10 : look.sprite === 'ghost' ? 3 : 0;
    const bob = float ? Math.round(Math.sin(time * 4) * 1.5) : 0;
    const w = sp.w * sc;
    const h = sp.h * sc;
    const enter = (1 - easeOut(Math.min(1, fx.enter))) * 40;
    const x = Math.round(enemyCx() - w / 2 + enter + fx.knock);
    const y = Math.round(groundY - h + sc - float * sc + bob);
    return { sp, sc, x, y, w, h, cx: x + w / 2, cy: y + h * 0.62, float };
  }

  // ---- Background ----

  function silhouette(g, spec, rand, base, maxH) {
    const tops = new Array(W).fill(base);
    if (spec.shape === 'hills' || spec.shape === 'dunes') {
      const f = spec.shape === 'dunes' ? 0.045 : 0.08;
      const p1 = rand() * 6, p2 = rand() * 6;
      for (let x = 0; x < W; x++) {
        tops[x] = Math.round(base - maxH * (0.55 + 0.3 * Math.sin(x * f + p1) + 0.15 * Math.sin(x * f * 2.3 + p2)));
      }
    } else if (spec.shape === 'peaks' || spec.shape === 'rocks' || spec.shape === 'trees') {
      const step = spec.shape === 'trees' ? 6 : spec.shape === 'rocks' ? 9 : 22;
      const slope = spec.shape === 'trees' ? 2 : spec.shape === 'rocks' ? 1.4 : 1.1;
      for (let px = -step; px < W + step; px += step * (0.6 + rand() * 0.8)) {
        const peak = base - maxH * (0.45 + rand() * 0.55);
        for (let x = 0; x < W; x++) {
          let y = peak + Math.abs(x - px) * slope;
          if (spec.shape === 'trees') y += (Math.floor(Math.abs(x - px) / 2) % 2); // layered pine edges
          tops[x] = Math.min(tops[x], Math.round(y));
        }
      }
    } else if (spec.shape === 'stalactites') {
      // Hangs from the ceiling: fill from the top down to a jagged edge.
      g.fillStyle = spec.color;
      const bottoms = new Array(W).fill(3);
      for (let px = 0; px < W; px += 4 + rand() * 8) {
        const len = 6 + rand() * maxH;
        for (let x = 0; x < W; x++) bottoms[x] = Math.max(bottoms[x], Math.round(len - Math.abs(x - px) * 2.2));
      }
      for (let x = 0; x < W; x++) g.fillRect(x, 0, 1, bottoms[x]);
      return;
    }
    g.fillStyle = spec.color;
    for (let x = 0; x < W; x++) g.fillRect(x, tops[x], 1, groundY - tops[x] + 1);
  }

  function buildBackground(zone, zi) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const rand = mulberry32(zi * 7919 + 13);

    // Sky in three bands with checkerboard dithering between them.
    const [s0, s1, s2] = zone.sky;
    const b1 = Math.round(groundY * 0.42);
    const b2 = Math.round(groundY * 0.72);
    g.fillStyle = s0; g.fillRect(0, 0, W, b1);
    g.fillStyle = s1; g.fillRect(0, b1, W, b2 - b1);
    g.fillStyle = s2; g.fillRect(0, b2, W, groundY - b2);
    for (const [y0, upper, lower] of [[b1, s0, s1], [b2, s1, s2]]) {
      for (let x = 0; x < W; x++) {
        g.fillStyle = lower;
        if ((x + y0) % 2 === 0) g.fillRect(x, y0 - 1, 1, 1);
        if (x % 4 === 0) g.fillRect(x, y0 - 2, 1, 1);
        g.fillStyle = upper;
        if ((x + y0) % 2 === 1) g.fillRect(x, y0, 1, 1);
      }
    }

    if (zone.deco === 'sun') {
      const cx = Math.round(W * 0.8), cy = Math.round(groundY * 0.5), r = 7;
      g.fillStyle = '#fff1c0';
      for (let y = -r; y <= r; y++) {
        const half = Math.round(Math.sqrt(r * r - y * y));
        g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
      }
    }

    silhouette(g, zone.far, rand, groundY - 3, Math.min(30, groundY * 0.35));
    silhouette(g, zone.near, rand, groundY, Math.min(12, groundY * 0.14));

    // Ground: an edge line with tufts, a top layer and a speckled body.
    const [edge, top, body, speck] = zone.ground;
    g.fillStyle = body; g.fillRect(0, groundY, W, H - groundY);
    g.fillStyle = top; g.fillRect(0, groundY, W, 3);
    g.fillStyle = edge; g.fillRect(0, groundY, W, 1);
    for (let x = 0; x < W; x++) if (rand() < 0.18) g.fillRect(x, groundY - 1, 1, 1);
    g.fillStyle = speck;
    for (let y = groundY + 4; y < H; y++) {
      for (let x = 0; x < W; x++) if (rand() < 0.07) g.fillRect(x, y, rand() < 0.3 ? 2 : 1, 1);
    }
    g.fillStyle = top;
    for (let y = groundY + 4; y < H; y++) {
      for (let x = 0; x < W; x++) if (rand() < 0.025) g.fillRect(x, y, 1, 1);
    }
    return c;
  }

  function initWeather(deco) {
    weather.length = 0;
    const r = Math.random;
    const n = { clouds: 3, fireflies: 9, sparkles: 10, snow: 34, embers: 22 }[deco] || 0;
    for (let i = 0; i < n; i++) {
      weather.push({ x: r() * W, y: r() * groundY, p: r() * 6.28, s: 0.5 + r(), w: 8 + Math.floor(r() * 10) });
    }
  }

  function drawWeather(deco, dt) {
    for (const p of weather) {
      if (deco === 'clouds') {
        p.x += p.s * 2 * dt;
        if (p.x > W + 20) p.x = -p.w - 10;
        // Keep clouds in the open sky below the HUD.
        const x = Math.round(p.x), y = Math.round(groundY * (0.4 + (p.y / groundY) * 0.22));
        b.fillStyle = '#f4f4f4';
        b.fillRect(x, y + 2, p.w, 3);
        b.fillRect(x + 2, y, p.w - 6, 2);
        b.fillStyle = '#c8e0f0';
        b.fillRect(x + 1, y + 5, p.w - 2, 1);
      } else if (deco === 'fireflies') {
        const a = (Math.sin(time * 2 + p.p) + 1) / 2;
        if (a < 0.3) continue;
        b.globalAlpha = a;
        b.fillStyle = '#ffcd75';
        b.fillRect(Math.round(p.x + Math.sin(time * 0.7 + p.p) * 4), Math.round(p.y * 0.8 + groundY * 0.2 + Math.cos(time + p.p) * 3), 1, 1);
        b.globalAlpha = 1;
      } else if (deco === 'sparkles') {
        const a = Math.sin(time * 1.5 + p.p * 3);
        if (a < 0.6) continue;
        const x = Math.round(p.x), y = Math.round(p.y * 0.85);
        b.fillStyle = '#73eff7';
        b.fillRect(x, y, 1, 1);
        if (a > 0.85) { b.fillRect(x - 1, y, 3, 1); b.fillRect(x, y - 1, 1, 3); }
      } else if (deco === 'snow') {
        p.y += p.s * 10 * dt;
        p.x += Math.sin(time + p.p) * 3 * dt;
        if (p.y > groundY) { p.y = -2; p.x = Math.random() * W; }
        b.fillStyle = '#f4f4f4';
        b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      } else if (deco === 'embers') {
        p.y -= p.s * 9 * dt;
        p.x += Math.sin(time * 2 + p.p) * 4 * dt;
        if (p.y < 0) { p.y = groundY; p.x = Math.random() * W; }
        b.fillStyle = p.s > 1 ? '#ffcd75' : '#ef7d57';
        b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    }
  }

  // ---- Actors ----

  function ownedHelpers(state) {
    const out = [];
    HELPERS.forEach((h, i) => { if (state.helpers[h.id] > 0) out.push(i); });
    return out;
  }

  // Up to 12 companions in three staggered rows behind the hero; slot 0 is nearest. Columns
  // squeeze together when the scene is narrow.
  function helperPos(slot) {
    const row = slot % 3;
    const col = Math.floor(slot / 3);
    const first = heroX() - 11;
    const step = Math.min(8, Math.max(4, (first - 6) / 3));
    return { x: Math.round(first - col * step - row * 2), y: groundY - 11 - row * 4 };
  }

  function drawHelpers(state, dt, enemyReady, box) {
    const owned = ownedHelpers(state);
    const placed = owned.map((i, slot) => ({ i, slot, ...helperPos(slot) }));
    placed.sort((a, b2) => (b2.slot % 3) - (a.slot % 3)); // back rows first
    for (const p of placed) {
      const def = HELPERS[p.i];
      helperTimer[p.i] -= dt;
      helperAtk[p.i] = Math.max(0, helperAtk[p.i] - dt);
      if (helperTimer[p.i] <= 0) {
        helperTimer[p.i] = 1.1 + (p.i % 4) * 0.22 + Math.random() * 0.2;
        if (enemyReady) {
          helperAtk[p.i] = 0.15;
          shots.push({
            x0: p.x + 9, y0: p.y + 7, x1: box.x + 2 + Math.random() * 4, y1: box.cy + (Math.random() * 6 - 3),
            t: 0, dur: 0.3 + Math.random() * 0.1, kind: def.shot, color: def.shotColor,
          });
        }
      }
      const sp = sprite(def.sprite, def.colors);
      const bob = Math.floor(time * 2 + p.i * 0.5) % 2;
      const x = p.x + (helperAtk[p.i] > 0 ? 1 : 0);
      if ((p.slot % 3) > 0) b.globalAlpha = 0.85;
      b.drawImage(sp.canvas, x, p.y + bob);
      b.globalAlpha = 1;
    }
  }

  function drawShadow(cx, w) {
    b.fillStyle = 'rgba(26,28,44,0.35)';
    b.fillRect(Math.round(cx - w / 2), groundY, Math.round(w), 1);
  }

  function drawHero(dt) {
    fx.heroAttack = Math.max(0, fx.heroAttack - dt);
    const atk = fx.heroAttack > 0;
    const hx = heroX() + (atk ? 3 : 0);
    const hy = heroY() + (!atk && Math.floor(time * 2) % 2 ? 1 : 0);
    drawShadow(hx + 8, 10);
    b.drawImage(sprite('hero').canvas, hx, hy);
    if (atk) {
      b.drawImage(spriteRotated('sword').canvas, hx + HERO_HAND.x - 1, hy + HERO_HAND.y - 1);
    } else {
      b.drawImage(sprite('sword').canvas, hx + HERO_HAND.x - 1, hy + HERO_HAND.y - SWORD_GRIP_ROW);
    }
  }

  function drawEnemy(state, dt) {
    fx.enter = Math.min(1, fx.enter + dt / 0.28);
    fx.knock = Math.max(0, fx.knock - dt * 20);
    fx.flash = Math.max(0, fx.flash - dt);
    if (state.enemy.respawn > 0 || !current) return null;
    const box = enemyBox(current);
    if (!box.float) drawShadow(box.cx, box.w * 0.7);
    else drawShadow(box.cx, box.w * 0.4);
    const img = fx.flash > 0 ? box.sp.white : box.sp.canvas;
    if (current.sprite === 'ghost') b.globalAlpha = 0.85;
    b.drawImage(img, box.x, box.y, box.w, box.h);
    b.globalAlpha = 1;
    if (current.boss) {
      const crown = sprite('crown');
      const top = box.sp.pixels.reduce((m, p) => Math.min(m, p.y), box.sp.h) * box.sc;
      b.drawImage(crown.canvas, Math.round(box.cx - crown.w), box.y + top - crown.h * 2 + 2, crown.w * 2, crown.h * 2);
    }
    return box;
  }

  // ---- Effects ----

  function burst(box) {
    for (const p of box.sp.pixels) {
      if (box.sc === 1 && Math.random() < 0.25) continue;
      const x = box.x + p.x * box.sc;
      const y = box.y + p.y * box.sc;
      particles.push({
        x, y,
        vx: (x - box.cx) * (2 + Math.random() * 3) + (Math.random() * 20 - 10),
        vy: -30 - Math.random() * 50,
        life: 0.5 + Math.random() * 0.5,
        c: p.c,
        size: box.sc,
      });
    }
  }

  function spark(x, y, color, n = 4) {
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: Math.random() * 60 - 30, vy: -Math.random() * 40, life: 0.2 + Math.random() * 0.2, c: color, size: 1 });
    }
  }

  // Ongoing skill effects: embers off the hero (Öfke), sparkles over the companions
  // (Savaş Narası) and blue glints around the enemy (Keskin Bakış).
  function skillAuras(state, dt, box) {
    const t = state.skillTimers;
    const emit = (rate) => Math.random() < rate * dt;
    if (t.rage.active > 0 && emit(30)) {
      particles.push({ x: heroX() + 4 + Math.random() * 9, y: heroY() + 4 + Math.random() * 11, vx: Math.random() * 8 - 4, vy: -18 - Math.random() * 12, g: -10, life: 0.5, c: Math.random() < 0.5 ? '#ef7d57' : '#b13e53', size: 1 });
    }
    if (t.warcry.active > 0) {
      ownedHelpers(state).forEach((_, slot) => {
        if (!emit(4)) return;
        const p = helperPos(slot);
        particles.push({ x: p.x + Math.random() * 10, y: p.y - 1, vx: 0, vy: -14, g: 0, life: 0.45, c: '#ffcd75', size: 1 });
      });
    }
    if (t.focus.active > 0 && box && emit(10)) {
      particles.push({ x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h, vx: 0, vy: -6, g: 0, life: 0.3, c: '#73eff7', size: 1 });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += (p.g ?? 160) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > groundY) { p.y = groundY; p.vy *= -0.3; p.vx *= 0.6; }
      b.globalAlpha = Math.min(1, p.life * 4);
      b.fillStyle = p.c;
      b.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    b.globalAlpha = 1;
  }

  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.t += dt / s.dur;
      if (s.t >= 1) {
        shots.splice(i, 1);
        spark(s.x1, s.y1, s.color, 3);
        fx.flash = Math.max(fx.flash, 0.03);
        continue;
      }
      const arc = s.kind === 'arrow' ? -Math.sin(Math.PI * s.t) * 6 : 0;
      const x = Math.round(lerp(s.x0, s.x1, s.t));
      const y = Math.round(lerp(s.y0, s.y1, s.t) + arc);
      b.fillStyle = s.color;
      if (s.kind === 'arrow') {
        b.fillRect(x - 3, y, 3, 1);
        b.fillStyle = '#f4f4f4';
        b.fillRect(x, y, 1, 1);
      } else if (s.kind === 'orb') {
        b.globalAlpha = 0.5;
        b.fillRect(x - 3, y, 2, 2);
        b.globalAlpha = 1;
        b.fillRect(x - 1, y - 1, 3, 3);
        b.fillStyle = '#f4f4f4';
        b.fillRect(x, y, 1, 1);
      } else {
        const on = Math.floor(s.t * 10) % 2;
        if (on) { b.fillRect(x - 1, y, 3, 1); b.fillRect(x, y - 1, 1, 3); } else { b.fillRect(x - 1, y - 1, 1, 1); b.fillRect(x + 1, y + 1, 1, 1); b.fillRect(x + 1, y - 1, 1, 1); b.fillRect(x - 1, y + 1, 1, 1); }
      }
    }
  }

  function coinTarget() {
    return { x: (coinTargetCss.x * dpr) / S, y: (coinTargetCss.y * dpr) / S };
  }

  function updateCoins(dt) {
    const target = coinTarget();
    const cs = sprite('coin');
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.t += dt;
      if (c.t < c.drop) {
        c.vy += 200 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > groundY - 4) { c.y = groundY - 4; c.vy *= -0.45; c.vx *= 0.7; }
        c.sx = c.x; c.sy = c.y;
      } else {
        const k = Math.min(1, (c.t - c.drop) / 0.4);
        const e = k * k;
        c.x = lerp(c.sx, target.x, e);
        c.y = lerp(c.sy, target.y, e) - Math.sin(Math.PI * k) * 10;
        if (k >= 1) { coins.splice(i, 1); onCoin(); continue; }
      }
      const spin = Math.floor(c.t * 10 + c.p) % 4;
      const w = spin === 1 || spin === 3 ? 3 : 5;
      b.drawImage(cs.canvas, 0, 0, cs.w, cs.h, Math.round(c.x) + (5 - w) / 2, Math.round(c.y), w, cs.h);
    }
  }

  function drawRipples(dt) {
    b.fillStyle = '#f4f4f4';
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt;
      if (r.t > 0.22) { ripples.splice(i, 1); continue; }
      const rad = 2 + r.t * 22;
      b.globalAlpha = 1 - r.t / 0.22;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        b.fillRect(Math.round(r.x + Math.cos(ang) * rad), Math.round(r.y + Math.sin(ang) * rad), 1, 1);
      }
    }
    b.globalAlpha = 1;
  }

  // Text at full resolution. Sizes are in buffer pixels so they scale with the scene.
  function text(str, x, y, size, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${Math.round(size * S)}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, S * 0.9);
    ctx.strokeStyle = '#1a1c2c';
    ctx.strokeText(str, x * S, y * S);
    ctx.fillStyle = color;
    ctx.fillText(str, x * S, y * S);
    ctx.globalAlpha = 1;
  }

  function drawNumbers(dt) {
    for (let i = numbers.length - 1; i >= 0; i--) {
      const n = numbers[i];
      n.t += dt;
      if (n.t >= n.life) { numbers.splice(i, 1); continue; }
      n.y -= n.vy * dt;
      const k = n.t / n.life;
      const pop = n.t < 0.08 ? 1.3 - n.t * 3.75 : 1;
      text(n.text, n.x, n.y, n.size * pop, n.color, k > 0.7 ? (1 - k) / 0.3 : 1);
    }
  }

  function drawBanner(dt) {
    if (!banner) return;
    banner.t += dt;
    if (banner.t >= banner.life) { banner = null; return; }
    const k = banner.t / banner.life;
    const pop = banner.t < 0.15 ? 0.6 + banner.t / 0.15 * 0.4 : 1;
    text(banner.text, W / 2, groundY * 0.62, 8 * pop, banner.color, k > 0.8 ? (1 - k) / 0.2 : 1);
  }

  // ---- Public ----

  function sync(state) {
    const zone = ZONES[zoneIndex(state.stage)];
    const def = zone.enemies[state.enemy.kind] ?? zone.enemies[0];
    current = { stage: state.stage, sprite: def.sprite, colors: def.colors, boss: state.enemy.boss };
    fx.enter = 0;
  }

  function handle(ev, state) {
    if (ev.type === 'hit') {
      fx.heroAttack = 0.14;
      fx.flash = 0.06;
      fx.knock = ev.crit ? 4 : 2;
      if (current) {
        const box = enemyBox(current);
        fx.slash = 0.12;
        fx.slashY = box.cy - 6 * box.sc + Math.round(Math.random() * 4 - 2);
        numbers.push({
          text: formatNumber(ev.dmg) + (ev.crit ? '!' : ''),
          x: box.cx + Math.random() * 16 - 8, y: box.y + 4, vy: 14, t: 0, life: 0.8,
          size: ev.crit ? 7 : 5, color: ev.crit ? '#ef7d57' : '#f4f4f4',
        });
        if (ev.crit) { spark(box.x + 2, box.cy, '#ffcd75', 6); if (!reduceMotion) fx.shake = 0.12; }
      }
    } else if (ev.type === 'kill') {
      if (current) {
        const box = enemyBox(current);
        burst(box);
        fx.dying = { box, t: 0.08 };
        const n = ev.boss ? 12 : 3;
        for (let i = 0; i < n; i++) {
          coins.push({ x: box.cx, y: box.cy, vx: Math.random() * 60 - 40, vy: -40 - Math.random() * 40, t: 0, drop: 0.5 + Math.random() * 0.2, p: Math.random() * 4 });
        }
        numbers.push({ text: '+' + formatNumber(ev.gold), x: box.cx, y: box.y - 2, vy: 8, t: 0, life: 1.1, size: 4.5, color: '#ffcd75' });
        if (ev.boss && !reduceMotion) fx.shake = 0.3;
      }
    } else if (ev.type === 'skill' && ev.id === 'goldRain') {
      for (let i = 0; i < 28; i++) {
        coins.push({ x: 4 + Math.random() * (W - 8), y: -4 - Math.random() * 30, vx: Math.random() * 10 - 5, vy: Math.random() * 20, t: 0, drop: 1 + Math.random() * 0.5, p: Math.random() * 4 });
      }
    } else if (ev.type === 'spawn' || (ev.type === 'stage' && state.enemy.respawn <= 0)) {
      sync(state);
    }
  }

  function frame(state, dt) {
    time += dt;
    if (!current) sync(state);
    const zi = zoneIndex(current.stage);
    const zone = ZONES[zi];
    const key = `${zi}:${W}x${H}`;
    if (key !== bgKey) {
      bg = buildBackground(zone, zi);
      initWeather(zone.deco);
      bgKey = key;
    }

    b.drawImage(bg, 0, 0);
    drawWeather(zone.deco, dt);
    const enemyReady = state.enemy.respawn <= 0 && fx.enter >= 1;
    drawHero(dt);
    const box = drawEnemy(state, dt);
    drawHelpers(state, dt, enemyReady && box, box);

    if (fx.dying) {
      fx.dying.t -= dt;
      const d = fx.dying.box;
      if (fx.dying.t > 0) b.drawImage(d.sp.white, d.x, d.y, d.w, d.h);
      else fx.dying = null;
    }
    if (fx.slash > 0 && box) {
      fx.slash -= dt;
      const sl = sprite('slash');
      b.drawImage(sl.canvas, box.x - 4, fx.slashY, sl.w * box.sc, sl.h * box.sc);
    }
    updateShots(dt);
    skillAuras(state, dt, box);
    updateParticles(dt);
    drawRipples(dt);
    updateCoins(dt);

    let ox = 0, oy = 0;
    if (fx.shake > 0) {
      fx.shake -= dt;
      ox = Math.round(Math.random() * 2 - 1) * S;
      oy = Math.round(Math.random() * 2 - 1) * S;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buf, ox, oy, W * S, H * S);
    drawNumbers(dt);
    drawBanner(dt);
  }

  return {
    resize,
    frame,
    handle,
    sync,
    tapAt(cssX, cssY) { ripples.push({ x: (cssX * dpr) / S, y: (cssY * dpr) / S, t: 0 }); },
    showBanner(textStr, color = '#f4f4f4', life = 1.6) { banner = { text: textStr, color, t: 0, life }; },
    setCoinTarget(cssX, cssY) { coinTargetCss = { x: cssX, y: cssY }; },
    onCoinArrive(cb) { onCoin = cb; },
  };
}
