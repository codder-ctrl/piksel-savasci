// Generates the app icons in icons/ from the pixel sprites: `npm run icons`.
// No dependencies: pixels are composed on a small grid, scaled up nearest-neighbor and
// written as PNG with node's zlib.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SPRITES, HERO_HAND, SWORD_GRIP_ROW } from '../js/sprite-data.js';

const GRID = 20;
const OUT = new URL('../icons/', import.meta.url);

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// The icon scene: sky, ground and the hero holding his sword.
function compose() {
  const px = Array.from({ length: GRID }, () => new Array(GRID));
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      let c = y < 10 ? '#41a6f6' : '#73eff7';
      if (y >= 17) c = y === 17 ? '#a7f070' : y === 18 ? '#38b764' : '#7a4b2a';
      px[y][x] = c;
    }
  }
  const stamp = (name, ox, oy) => {
    const { rows, pal } = SPRITES[name];
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const yy = oy + y, xx = ox + x;
      if (pal[ch] && yy >= 0 && yy < GRID && xx >= 0 && xx < GRID) px[yy][xx] = pal[ch];
    }));
  };
  const hx = 3, hy = 2;
  stamp('hero', hx, hy);
  stamp('sword', hx + HERO_HAND.x - 1, hy + HERO_HAND.y - SWORD_GRIP_ROW);
  return px;
}

// Scales the grid into `size` px using `fill` (0..1) of the width; the margin repeats the edge
// pixels, so maskable icons can be cropped to any shape without showing a border.
function render(px, size, fill) {
  const scale = Math.max(1, Math.floor((size * fill) / GRID));
  const off = Math.floor((size - GRID * scale) / 2);
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const gy = Math.min(GRID - 1, Math.max(0, Math.floor((y - off) / scale)));
    for (let x = 0; x < size; x++) {
      const gx = Math.min(GRID - 1, Math.max(0, Math.floor((x - off) / scale)));
      const [r, g, b] = hex(px[gy][gx]);
      rgba.set([r, g, b, 255], (y * size + x) * 4);
    }
  }
  return rgba;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ICONS = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.8],   // content inside the 80% safe zone
  ['apple-touch-icon.png', 180, 1],
  ['favicon-32.png', 32, 1],
];

mkdirSync(OUT, { recursive: true });
const px = compose();
for (const [file, size, fill] of ICONS) {
  writeFileSync(new URL(file, OUT), png(render(px, size, fill), size));
  console.log('icons/' + file);
}
