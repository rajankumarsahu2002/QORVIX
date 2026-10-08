// Generates QORVIX PWA icons (pure Node, no deps): rounded tile + progress arc +
// check + focus dot + timeline bar, matching public/qorvix-icon.svg.
// Run: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const C = { bg: [15, 23, 42], indigo: [79, 70, 229], green: [34, 197, 94], white: [255, 255, 255] };
const SS = 3; // supersampling per axis

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function toPng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.subarray(y * w * 4, (y + 1) * w * 4)).copy(raw, y * (w * 4 + 1) + 1);
  }
  const mk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    mk('IHDR', ihdr), mk('IDAT', deflateSync(raw)), mk('IEND', Buffer.alloc(0)),
  ]);
}

const dist2Seg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  if (x >= x0 + r && x <= x1 - r) return y >= y0 && y <= y1;
  if (y >= y0 + r && y <= y1 - r) return x >= x0 && x <= x1;
  return Math.hypot(x - cx, y - cy) <= r;
};

// Shape test in 64-unit space. Returns color or null (topmost wins).
function shapeAt(X, Y) {
  // timeline bar
  if (inRoundRect(X, Y, 18, 50, 46, 53, 1.5)) return C.indigo;
  // checkmark (green, over ring)
  if (dist2Seg(X, Y, 25, 30.5, 30, 35.5) <= 2) return C.green;
  if (dist2Seg(X, Y, 30, 35.5, 40, 24) <= 2) return C.green;
  // focus dot
  if (Math.hypot(X - 32, Y - 30) <= 3.5) return C.white;
  // progress ring: 75% arc starting at -45°
  const dx = X - 32, dy = Y - 30;
  const d = Math.hypot(dx, dy);
  if (Math.abs(d - 16) <= 2.5) {
    const norm = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    if (((norm - 315 + 360) % 360) <= 270) return C.indigo;
  }
  return null;
}

function render(size, { tileRadius = 16, zoom = 1, fullBleed = false }) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const X = ((x + (sx + 0.5) / SS) / size) * 64;
          const Y = ((y + (sy + 0.5) / SS) / size) * 64;
          const SX = 32 + (X - 32) / zoom;
          const SY = 32 + (Y - 32) / zoom;
          let col = null;
          let alpha = 1;
          if (!fullBleed && !inRoundRect(X, Y, 2, 2, 62, 62, tileRadius)) {
            alpha = 0;
          } else {
            col = shapeAt(SX, SY) ?? C.bg;
          }
          if (col) { r += col[0]; g += col[1]; b += col[2]; a += alpha; }
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      const af = a / n;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(af * 255);
    }
  }
  return out;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const jobs = [
  ['qorvix-192.png', 192, { tileRadius: 16, zoom: 1 }],
  ['qorvix-512.png', 512, { tileRadius: 16, zoom: 1 }],
  ['qorvix-maskable-512.png', 512, { tileRadius: 0, zoom: 0.72, fullBleed: true }],
  ['apple-touch-icon.png', 180, { tileRadius: 16, zoom: 1 }],
];
for (const [file, size, opts] of jobs) {
  writeFileSync(join(root, file), toPng(size, size, render(size, opts)));
  console.log('wrote', file);
}
