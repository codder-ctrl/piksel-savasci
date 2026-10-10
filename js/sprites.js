import { SPRITES } from './sprite-data.js';

// Turns text sprites into canvases. Each built sprite has the normal image, a white silhouette
// (hit flash) and its opaque pixel list (death particles). Builds are cached per color override.

const cache = new Map();

function build(rows, pal) {
  const h = rows.length;
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  const white = document.createElement('canvas');
  canvas.width = white.width = w;
  canvas.height = white.height = h;
  const ctx = canvas.getContext('2d');
  const wctx = white.getContext('2d');
  wctx.fillStyle = '#ffffff';
  const pixels = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = pal[rows[y][x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
      wctx.fillRect(x, y, 1, 1);
      pixels.push({ x, y, c });
    }
  }
  return { w, h, canvas, white, pixels };
}

export function sprite(name, colors = null) {
  const key = colors ? name + JSON.stringify(colors) : name;
  let s = cache.get(key);
  if (!s) {
    const def = SPRITES[name];
    s = build(def.rows, colors ? { ...def.pal, ...colors } : def.pal);
    cache.set(key, s);
  }
  return s;
}

// The same sprite rotated 90° clockwise (used for the sword mid-swing).
export function spriteRotated(name) {
  const key = name + '@cw';
  let s = cache.get(key);
  if (!s) {
    const { rows, pal } = SPRITES[name];
    const h = rows.length;
    const w = rows[0].length;
    const out = [];
    for (let x = 0; x < w; x++) {
      let line = '';
      for (let y = h - 1; y >= 0; y--) line += rows[y][x];
      out.push(line);
    }
    s = build(out, pal);
    cache.set(key, s);
  }
  return s;
}

// A sprite as a scaled-up PNG data URL for <img> icons in the UI.
export function spriteUrl(name, colors = null, scale = 4) {
  const s = sprite(name, colors);
  const c = document.createElement('canvas');
  c.width = s.w * scale;
  c.height = s.h * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.canvas, 0, 0, c.width, c.height);
  return c.toDataURL();
}
