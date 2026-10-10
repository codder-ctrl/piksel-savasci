import { sprite } from './sprites.js';
import { DUNGEON } from './config.js';
import { formatNumber } from './logic.js';
import { findCompanion } from './dungeon.js';

// Draws the live dungeon fight (state.dungeonRun) into the canvas on the Zindan tab, with the
// same approach as render.js: a small pixel buffer scaled up by a whole number, text on top.
// main.js only calls frame() and handle() while the tab is open.

const TARGET_W = 120;

export function createDungeonView(canvas) {
  const ctx = canvas.getContext('2d');
  const buf = document.createElement('canvas');
  const b = buf.getContext('2d');
  let W = 1, H = 1, S = 2, floorY = 0;
  let bg = null, bgKey = '';
  let time = 0;
  let banner = null;
  const numbers = [];
  const shots = [];
  const particles = [];
  const flash = { team: [0, 0, 0], enemy: [0, 0, 0] };
  const lunge = { team: [0, 0, 0], enemy: [0, 0, 0] };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    S = Math.max(2, Math.round(canvas.width / TARGET_W));
    W = Math.ceil(canvas.width / S);
    H = Math.ceil(canvas.height / S);
    buf.width = W;
    buf.height = H;
    floorY = H - 7;
    bgKey = '';
  }

  // ---- Layout: the team on the left (slot 0 in front), enemies on the right ----

  const fighterPos = (i) => ({ x: Math.round(W * 0.36) - 10 - i * 13, y: floorY - 11 });

  function enemyBox(run, i) {
    const e = run.enemies[i];
    const look = DUNGEON.enemies[e.look];
    const sp = sprite(look.sprite, look.colors);
    const sc = e.boss ? 2 : 1;
    const float = look.sprite === 'bat' ? 5 : look.sprite === 'ghost' ? 2 : 0;
    const w = sp.w * sc, h = sp.h * sc;
    const x = e.boss ? Math.round(W * 0.72 - w / 2) : Math.round(W * 0.56) + i * 17;
    const y = floorY - h + sc - float * sc + (float ? Math.round(Math.sin(time * 4 + i) * 1.2) : 0);
    return { sp, sc, x, y, w, h, cx: x + w / 2, cy: y + h * 0.6 };
  }

  function fighterBox(run, i) {
    const f = run.fighters[i];
    const def = findCompanion(f.id);
    const sp = sprite(def.sprite, def.colors);
    const p = fighterPos(i);
    return { def, sp, x: p.x, y: p.y, w: sp.w, h: sp.h, cx: p.x + sp.w / 2, cy: p.y + 6 };
  }

  // ---- Background: brick wall, torches, stone floor ----

  function buildBackground() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#1f2133';
    g.fillRect(0, 0, W, floorY);
    g.fillStyle = '#282b40';
    for (let y = 0; y < floorY; y += 5) {
      const off = (y / 5) % 2 ? 4 : 0;
      for (let x = -off; x < W; x += 8) g.fillRect(x + 1, y + 1, 6, 3);
    }
    g.fillStyle = '#333c57';
    g.fillRect(0, floorY, W, H - floorY);
    g.fillStyle = '#566c86';
    g.fillRect(0, floorY, W, 1);
    g.fillStyle = '#29366f';
    for (let x = 0; x < W; x += 6) g.fillRect(x, floorY + 3, 4, 1);
    return c;
  }

  function drawTorches() {
    for (const tx of [Math.round(W * 0.2), Math.round(W * 0.8)]) {
      b.fillStyle = '#7a4b2a';
      b.fillRect(tx, 6, 1, 4);
      const f = Math.floor(time * 8 + tx) % 3;
      b.fillStyle = '#ef7d57';
      b.fillRect(tx - 1, 3 + (f === 1 ? 1 : 0), 3, 3);
      b.fillStyle = '#ffcd75';
      b.fillRect(tx, 3 + f % 2, 1, 2);
      b.globalAlpha = 0.08 + (f === 2 ? 0.03 : 0);
      b.fillStyle = '#ffcd75';
      b.fillRect(tx - 6, 0, 13, 14);
      b.globalAlpha = 1;
    }
  }

  // ---- Drawing helpers ----

  function hpBar(x, y, w, frac, color) {
    b.fillStyle = '#1a1c2c';
    b.fillRect(x, y, w, 2);
    b.fillStyle = color;
    b.fillRect(x, y, Math.max(0, Math.round(w * frac)), 1);
  }

  function text(str, x, y, size, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${Math.round(size * S)}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, S * 0.8);
    ctx.strokeStyle = '#1a1c2c';
    ctx.strokeText(str, x * S, y * S);
    ctx.fillStyle = color;
    ctx.fillText(str, x * S, y * S);
    ctx.globalAlpha = 1;
  }

  function burst(box) {
    for (const p of box.sp.pixels) {
      if (Math.random() < 0.5) continue;
      const x = box.x + p.x * box.sc, y = box.y + p.y * box.sc;
      particles.push({ x, y, vx: (x - box.cx) * 3 + Math.random() * 10 - 5, vy: -20 - Math.random() * 30, life: 0.5 + Math.random() * 0.3, c: p.c });
    }
  }

  // ---- Events from dungeon.js ----

  function handle(ev, state) {
    const run = state.dungeonRun;
    if (!run || !W) return;
    if (ev.type === 'dg-attack') {
      const fromTeam = ev.side === 'team';
      const from = fromTeam ? fighterBox(run, ev.from) : enemyBox(run, ev.from);
      const to = fromTeam ? enemyBox(run, ev.to) : fighterBox(run, ev.to);
      (fromTeam ? lunge.team : lunge.enemy)[ev.from] = 0.12;
      const color = fromTeam ? from.def.shotColor : '#b13e53';
      shots.push({ x0: from.cx, y0: from.cy, x1: to.cx, y1: to.cy, t: 0, dur: 0.22, color, kind: fromTeam ? from.def.shot : 'orb', side: ev.side, to: ev.to, dmg: ev.dmg });
    } else if (ev.type === 'dg-heal') {
      const to = fighterBox(run, ev.to);
      numbers.push({ text: '+' + formatNumber(Math.round(ev.amount)), x: to.cx, y: to.y - 2, t: 0, life: 0.8, color: '#a7f070' });
      for (let i = 0; i < 5; i++) particles.push({ x: to.x + Math.random() * to.w, y: to.y + 4 + Math.random() * 8, vx: 0, vy: -15, life: 0.5, c: '#a7f070', g: 0 });
    } else if (ev.type === 'dg-kill') {
      burst(enemyBox(run, ev.to));
      numbers.push({ text: '+' + ev.kristal, x: enemyBox(run, ev.to).cx, y: floorY - 20, t: 0, life: 0.9, color: '#a7f070' });
    } else if (ev.type === 'dg-start') {
      banner = { text: `KAT ${ev.floor}`, color: '#f4f4f4', t: 0, life: 1.1 };
    } else if (ev.type === 'dg-clear') {
      banner = { text: ev.elmas ? `TEMİZLENDİ! +${ev.elmas} elmas` : 'TEMİZLENDİ!', color: '#ffcd75', t: 0, life: 1.2 };
    } else if (ev.type === 'dg-defeat') {
      banner = { text: 'YENİLDİNİZ · bir kat geri', color: '#ef7d57', t: 0, life: 2.5 };
    }
  }

  // ---- Frame ----

  function frame(state, dt) {
    const run = state.dungeonRun;
    if (!run || W < 2) return;
    time += dt;
    if (bgKey !== `${W}x${H}`) { bg = buildBackground(); bgKey = `${W}x${H}`; }
    b.drawImage(bg, 0, 0);
    drawTorches();

    for (const side of ['team', 'enemy']) {
      for (let i = 0; i < 3; i++) {
        flash[side][i] = Math.max(0, flash[side][i] - dt);
        lunge[side][i] = Math.max(0, lunge[side][i] - dt);
      }
    }

    // Team: back slots first so the front one overlaps.
    for (let i = run.fighters.length - 1; i >= 0; i--) {
      const f = run.fighters[i];
      const box = fighterBox(run, i);
      const down = f.hp <= 0;
      const x = box.x + (lunge.team[i] > 0 ? 2 : 0);
      const bob = down ? 0 : Math.floor(time * 2 + i) % 2;
      b.globalAlpha = down ? 0.3 : 1;
      b.drawImage(flash.team[i] > 0 ? box.sp.white : box.sp.canvas, x, box.y + bob);
      b.globalAlpha = 1;
      if (!down) hpBar(box.x, box.y - 3, box.w, f.hp / f.maxHp, '#38b764');
    }

    for (let i = 0; i < run.enemies.length; i++) {
      const e = run.enemies[i];
      if (e.hp <= 0) continue;
      const box = enemyBox(run, i);
      const x = box.x - (lunge.enemy[i] > 0 ? 2 : 0);
      b.drawImage(flash.enemy[i] > 0 ? box.sp.white : box.sp.canvas, x, box.y, box.w, box.h);
      const top = box.sp.pixels.reduce((m, p) => Math.min(m, p.y), box.sp.h) * box.sc;
      hpBar(box.x + 2, box.y + top - 4, box.w - 4, e.hp / e.maxHp, '#b13e53');
      if (e.boss) {
        const crown = sprite('crown');
        b.drawImage(crown.canvas, Math.round(box.cx - crown.w / 2), box.y + top - 10);
      }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.t += dt / s.dur;
      if (s.t >= 1) {
        shots.splice(i, 1);
        (s.side === 'team' ? flash.enemy : flash.team)[s.to] = 0.08;
        numbers.push({ text: formatNumber(Math.round(s.dmg)), x: s.x1 + Math.random() * 6 - 3, y: s.y1 - 8, t: 0, life: 0.7, color: s.side === 'team' ? '#f4f4f4' : '#ef7d57' });
        continue;
      }
      const x = Math.round(s.x0 + (s.x1 - s.x0) * s.t);
      const y = Math.round(s.y0 + (s.y1 - s.y0) * s.t - (s.kind === 'arrow' ? Math.sin(Math.PI * s.t) * 4 : 0));
      b.fillStyle = s.color;
      if (s.kind === 'arrow') b.fillRect(x - 2, y, 3, 1);
      else b.fillRect(x - 1, y - 1, 2, 2);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += (p.g ?? 140) * dt;
      p.x += p.vx * dt;
      p.y = Math.min(floorY, p.y + p.vy * dt);
      b.globalAlpha = Math.min(1, p.life * 4);
      b.fillStyle = p.c;
      b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    b.globalAlpha = 1;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(buf, 0, 0, W * S, H * S);

    for (let i = numbers.length - 1; i >= 0; i--) {
      const n = numbers[i];
      n.t += dt;
      if (n.t >= n.life) { numbers.splice(i, 1); continue; }
      n.y -= 10 * dt;
      text(n.text, n.x, n.y, 4, n.color, n.t / n.life > 0.7 ? (1 - n.t / n.life) / 0.3 : 1);
    }
    if (banner) {
      banner.t += dt;
      if (banner.t >= banner.life) banner = null;
      else text(banner.text, W / 2, H * 0.3, 6, banner.color, banner.t / banner.life > 0.8 ? (1 - banner.t / banner.life) / 0.2 : 1);
    }
    if (run.phase === 'idle') text('Takıma yoldaş ekle', W / 2, H / 2, 5, '#94b0c2');
  }

  return { resize, frame, handle };
}
