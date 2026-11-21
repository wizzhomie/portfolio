// Generates the hero artwork: isometric "engineering blueprint" of solid blocks.
// Usage: node tools/gen-schematic.js
const fs = require('fs');
const path = require('path');

const W = 1400, H = 1050;
const U = 74;
const OX = 0, OY = 0;

const iso = (x, y, z) => [OX + (x - y) * 0.866 * U, OY + (x + y) * 0.5 * U - z * U];
const pt = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
const poly = (points, fill, stroke, sw = 1, extra = '') =>
  `<polygon points="${points.map(pt).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;

// ---------- palette ----------
const P = {
  violet: { top: '#8f74ff', left: '#5b41d8', right: '#2c217e', edge: 'rgba(206,214,255,.42)' },
  blue:   { top: '#5786ff', left: '#3253cc', right: '#182a78', edge: 'rgba(196,214,255,.4)' },
  deep:   { top: '#6f55e0', left: '#40309f', right: '#201a5e', edge: 'rgba(190,200,255,.32)' },
  cyan:   { top: '#8ff4ff', left: '#35c6e6', right: '#116e8c', edge: 'rgba(216,252,255,.75)' },
};

// ---------- pieces ----------
// [x, y, z, palette, glow?]
const cubes = [];
const piece = (blocks, z, pal, glow = false) =>
  blocks.forEach(([x, y]) => cubes.push({ x, y, z, pal, glow }));

piece([[1, 1], [2, 1], [3, 1], [2, 2]], 0, 'violet');          // T on the base
piece([[5, 4], [5, 5], [5, 6], [6, 6]], 0, 'deep');            // L on the base
piece([[0, 4], [1, 4], [1, 5], [2, 5]], 3, 'blue');            // S floating
piece([[4, 0], [4, 1], [4, 2], [4, 3]], 5, 'cyan', true);      // I floating, accent
piece([[6, 1]], 2, 'violet');                                  // single cube

cubes.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));

// bounding box of every cube corner (iso, origin 0,0)
let BB = { minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9 };
cubes.forEach((c) => {
  for (const dx of [0, 1]) for (const dy of [0, 1]) for (const dz of [0, 1]) {
    const p = iso(c.x + dx, c.y + dy, c.z + dz);
    BB.minX = Math.min(BB.minX, p[0]); BB.maxX = Math.max(BB.maxX, p[0]);
    BB.minY = Math.min(BB.minY, p[1]); BB.maxY = Math.max(BB.maxY, p[1]);
  }
});
// extra points: nodes, ruler ends, landing outlines
[[-2.4, 3.6, 0], [4.4, -1.6, 0], [7.2, 8.6, 0], [-2, 7.2, 0], [7, 7.2, 0], [-0.4, 3.6, 0], [9, 3.6, 0]].forEach(([x, y, z]) => {
  const p = iso(x, y, z);
  BB.minX = Math.min(BB.minX, p[0]); BB.maxX = Math.max(BB.maxX, p[0]);
  BB.minY = Math.min(BB.minY, p[1]); BB.maxY = Math.max(BB.maxY, p[1]);
});
BB.minX -= 40; BB.maxX += 40; BB.minY -= 40; BB.maxY += 40;
const bw = BB.maxX - BB.minX, bh = BB.maxY - BB.minY;
const SC = Math.min(W * 0.9 / bw, H * 0.92 / bh);
const TX = (W - bw * SC) / 2 - BB.minX * SC;
const TY = (H - bh * SC) / 2 - BB.minY * SC;

function cubeSVG(c) {
  const { x, y, z } = c;
  const st = P[c.pal];
  const top = [iso(x, y, z + 1), iso(x + 1, y, z + 1), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)];
  const left = [iso(x, y + 1, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)];
  const right = [iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1), iso(x + 1, y, z + 1)];
  return poly(top, st.top, st.edge, 1.1) + poly(left, st.left, st.edge, 1) + poly(right, st.right, st.edge, 1);
}

// ---------- playfield grid ----------
const FIELD = 7;
let grid = '';
for (let i = 0; i <= FIELD; i++) {
  const a = iso(i, 0, 0), b = iso(i, FIELD, 0);
  const c = iso(0, i, 0), d = iso(FIELD, i, 0);
  grid += `<path d="M${pt(a)} L${pt(b)}" stroke="rgba(120,155,240,.13)" stroke-width="1"/>`;
  grid += `<path d="M${pt(c)} L${pt(d)}" stroke="rgba(120,155,240,.13)" stroke-width="1"/>`;
}
// outer guide grid, fading out
for (let i = -3; i <= FIELD + 3; i += 1) {
  if (i >= 0 && i <= FIELD) continue;
  const a = iso(i, -3, 0), b = iso(i, FIELD + 3, 0);
  const c = iso(-3, i, 0), d = iso(FIELD + 3, i, 0);
  grid += `<path d="M${pt(a)} L${pt(b)}" stroke="rgba(110,145,230,.05)" stroke-width="1"/>`;
  grid += `<path d="M${pt(c)} L${pt(d)}" stroke="rgba(110,145,230,.05)" stroke-width="1"/>`;
}
// field border + corner ticks
const FC = [iso(0, 0, 0), iso(FIELD, 0, 0), iso(FIELD, FIELD, 0), iso(0, FIELD, 0)];
const field = `<polygon points="${FC.map(pt).join(' ')}" fill="none" stroke="rgba(130,170,255,.38)" stroke-width="1.5"/>`;
let corners = '';
FC.forEach((p) => {
  corners += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="none" stroke="rgba(150,190,255,.7)" stroke-width="1.2"/>`;
});

// --- circuit traces removed in favour of the playfield ---
let traces = '';

// ---------- landing outlines for floating pieces ----------
function outline(cells, z, color) {
  return cells.map(([x, y]) => {
    const c = [iso(x, y, z), iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x, y + 1, z)];
    return `<polygon points="${c.map(pt).join(' ')}" fill="none" stroke="${color}" stroke-width="1.1" stroke-dasharray="5 6"/>`;
  }).join('');
}
const land = outline([[0, 4], [1, 4], [1, 5], [2, 5]], 0, 'rgba(135,175,255,.45)')
  + outline([[4, 0], [4, 1], [4, 2], [4, 3]], 0, 'rgba(135,235,255,.5)');

// ---------- drop guides ----------
function guide(x, y, zFrom, zTo, color) {
  const a = iso(x + 0.5, y + 0.5, zFrom), b = iso(x + 0.5, y + 0.5, zTo);
  return `<path d="M${pt(a)} L${pt(b)}" stroke="${color}" stroke-width="1" stroke-dasharray="2 6"/>`;
}
let guides = '';
[[0, 4, 3], [2, 5, 3], [4, 0, 5], [4, 3, 5]].forEach(([x, y, z]) => {
  guides += guide(x, y, z, 0, 'rgba(130,165,255,.25)');
});

// ---------- measurement ticks ----------
const a0 = iso(0, 7.35, 0), a1 = iso(7, 7.35, 0);
let ticks = `<path d="M${pt(a0)} L${pt(a1)}" stroke="rgba(130,165,235,.35)" stroke-width="1"/>`;
for (let i = 0; i <= 14; i++) {
  const t = i / 14;
  const p = [a0[0] + (a1[0] - a0[0]) * t, a0[1] + (a1[1] - a0[1]) * t];
  ticks += `<path d="M${pt(p)} l0 ${i % 7 === 0 ? 11 : 6}" stroke="rgba(130,165,235,.35)" stroke-width="1"/>`;
}

// corner brackets
const bracket = (x, y, dx, dy) =>
  `<path d="M${x + dx * 40} ${y} L${x} ${y} L${x} ${y + dy * 40}" fill="none" stroke="rgba(120,150,220,.22)" stroke-width="1.2"/>`;
const brackets = bracket(60, 60, 1, 1) + bracket(W - 60, 60, -1, 1) + bracket(60, H - 60, 1, -1) + bracket(W - 60, H - 60, -1, -1);

const solid = cubes.filter((c) => !c.glow);
const glow = cubes.filter((c) => c.glow);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#5b46ff" stop-opacity=".30"/>
      <stop offset=".55" stop-color="#34279e" stop-opacity=".12"/>
      <stop offset="1" stop-color="#161038" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cyanHalo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7de9ff" stop-opacity=".42"/>
      <stop offset="1" stop-color="#7de9ff" stop-opacity="0"/>
    </radialGradient>
    <filter id="bloom" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="16" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="34"/></filter>
    <radialGradient id="fade" cx=".52" cy=".5" r=".6">
      <stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity=".9"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>

  ${brackets}
  <g mask="url(#m)"><g transform="translate(${TX.toFixed(2)},${TY.toFixed(2)}) scale(${SC.toFixed(4)})">
    <ellipse cx="${iso(2.6, 2.6, 1.4)[0]}" cy="${iso(2.6, 2.6, 1.4)[1]}" rx="440" ry="330" fill="url(#halo)" filter="url(#soft)"/>
    <ellipse cx="${iso(2.6, 2.6, 0)[0]}" cy="${iso(2.6, 2.6, 0)[1]}" rx="300" ry="120" fill="#02030a" opacity=".55" filter="url(#soft)"/>
    ${grid}
    ${field}
    ${corners}
    ${land}
    ${ticks}
    ${traces}
    ${guides}
    <g>${solid.map(cubeSVG).join('')}</g>
    <ellipse cx="${iso(4.5, 1.5, 4.6)[0]}" cy="${iso(4.5, 1.5, 4.6)[1]}" rx="150" ry="150" fill="url(#cyanHalo)" filter="url(#soft)"/>
    <g filter="url(#bloom)">${glow.map(cubeSVG).join('')}</g>
  </g></g>
</svg>`;

const out = path.join(__dirname, '..', 'assets', 'hero-schematic.svg');
fs.writeFileSync(out, svg);
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
