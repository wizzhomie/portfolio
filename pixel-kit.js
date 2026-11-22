/* ==========================================================================
   pixel-kit.js — no dependencies. Auto-inits on [data-px] and [data-px-icon].

   <canvas data-px="pipeline"></canvas>   multi-agent pipeline, data packets flow
   <canvas data-px="assemble"></canvas>   scattered pixels assemble into a document card
   <canvas data-px="planet"></canvas>     dithered rotating planet + orbiting nodes
   <div    data-px="field"></div>         dot grid reacting to cursor / clicks (fills the box)
   <span   data-px="typewriter" data-phrases="Design.|Build.|Scale."></span>
   <span   data-px-icon="arch"></span>    icons: arch agent llm dev backend product rnd biz

   Colors come from CSS variables (--px-accent etc., see pixel-kit.css).
   Canvases pause when off-screen and render one static frame for prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------ helpers ------------------------------ */
  const cssVar = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  const PAL = () => ({
    bg: cssVar('--px-bg', '#04050a'),
    panel: cssVar('--px-panel', '#0a0d18'),
    ink: cssVar('--px-ink', '#cfd6ee'),
    ink2: cssVar('--px-ink2', '#8a94b8'),
    dim: cssVar('--px-dim', '#2a3350'),
    accent: cssVar('--px-accent', '#5ef2d6'),
    accent2: cssVar('--px-accent2', '#ffb86b'),
    ok: cssVar('--px-ok', '#7cff8a'),
  });
  const hex = (c) => {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function setup(cv, W, H) {
    cv.width = W; cv.height = H;
    cv.classList.add('px-canvas');
    cv.style.aspectRatio = `${W} / ${H}`;
    if (!cv.hasAttribute('aria-label')) cv.setAttribute('aria-hidden', 'true');
    return cv.getContext('2d');
  }

  /* fixed-fps loop, paused off-screen, one static frame if reduced motion */
  function loop(el, step, fps = 30) {
    const dt = 1000 / fps;
    if (REDUCE) { for (let i = 0; i < 60; i++) step(dt); return; }
    let visible = true, last = 0, acc = 0, raf = 0;
    const tick = (ts) => {
      raf = 0;
      if (!visible) return;
      if (!last) last = ts;
      acc += ts - last; last = ts;
      if (acc > 250) acc = 250;
      while (acc >= dt) { step(dt); acc -= dt; }
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    }).observe(el);
    raf = requestAnimationFrame(tick);
  }

  /* tiny 3x5 pixel font (only the letters used for node labels) */
  const GL = {
    A: '010101111101101', E: '111100111100111', I: '111010010010111', L: '100100100100111',
    N: '101111111101101', O: '111101101101111', T: '111010010010010', U: '101101101101111',
    V: '101101101101010', X: '101101010101101',
  };
  function text(g, s, x, y, c) {
    g.fillStyle = c;
    for (const ch of s) {
      const m = GL[ch];
      if (m) for (let i = 0; i < 15; i++) if (m[i] === '1') g.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1);
      x += 4;
    }
  }

  /* ===================== 1. PIPELINE (multi-agent flow) ===================== */
  function pipeline(cv) {
    const W = 160, H = 112, g = setup(cv, W, H), P = PAL();
    const NW = 17, NH = 13;
    const N = [['IN', 3, 50], ['ANA', 38, 26], ['EXT', 73, 72], ['VAL', 108, 26], ['OUT', 140, 50]]
      .map(([l, x, y]) => ({ l, x, y, flash: 0 }));
    const E = [];
    for (let i = 0; i < N.length - 1; i++) {
      const a = N[i], b = N[i + 1];
      const ax = a.x + NW, ay = a.y + 6, bx = b.x, by = b.y + 6, mx = (ax + bx) >> 1;
      const pts = [[ax, ay], [mx, ay], [mx, by], [bx, by]];
      const seg = [0, 1, 2].map((k) => Math.abs(pts[k + 1][0] - pts[k][0]) + Math.abs(pts[k + 1][1] - pts[k][1]));
      E.push({ pts, seg, len: seg[0] + seg[1] + seg[2] });
    }
    const at = (e, d) => {
      let k = 0;
      while (k < 2 && d > e.seg[k]) { d -= e.seg[k]; k++; }
      const [x0, y0] = e.pts[k], [x1, y1] = e.pts[k + 1];
      const t = clamp01(d / (e.seg[k] || 1));
      return [Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)];
    };
    const wire = E.map((e) => { const a = []; for (let d = 0; d <= e.len; d += 2) a.push(at(e, d)); return a; });
    const EC = [P.accent2, P.accent2, P.accent, P.ok];
    const packets = [], queue = [];
    let clock = 0, nextIn = 0.2, jitter = [], jt = 0;

    function drawNode(n) {
      const lit = n.flash > 0;
      const bc = lit ? P.accent : P.dim;
      g.fillStyle = lit ? 'rgba(94,242,214,.16)' : P.panel;
      g.fillRect(n.x, n.y, NW, NH);
      g.fillStyle = bc;
      g.fillRect(n.x + 1, n.y, NW - 2, 1); g.fillRect(n.x + 1, n.y + NH - 1, NW - 2, 1);
      g.fillRect(n.x, n.y + 1, 1, NH - 2); g.fillRect(n.x + NW - 1, n.y + 1, 1, NH - 2);
      const w = n.l.length * 4 - 1;
      text(g, n.l, n.x + ((NW - w) >> 1), n.y + 4, lit ? P.accent : P.ink2);
    }

    loop(cv, (dt) => {
      const s = dt / 1000; clock += s; jt += s;
      if (clock >= nextIn) { packets.push({ e: 0, d: 0, sp: rnd(32, 40) }); nextIn = clock + 1.9; }
      for (let i = queue.length - 1; i >= 0; i--) {
        if (clock >= queue[i].at) { packets.push({ e: queue[i].e, d: 0, sp: rnd(32, 40) }); queue.splice(i, 1); }
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]; p.d += p.sp * s;
        if (p.d >= E[p.e].len) {
          N[p.e + 1].flash = 1;
          if (p.e + 1 < E.length) queue.push({ at: clock + 0.25, e: p.e + 1 });
          packets.splice(i, 1);
        }
      }
      N.forEach((n) => { n.flash = Math.max(0, n.flash - s * 2.5); });
      if (jt > 0.12 || !jitter.length) { jt = 0; jitter = Array.from({ length: 7 }, () => [3 + ((Math.random() * 15) | 0), 34 + ((Math.random() * 12) | 0)]); }

      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(138,148,184,.12)';
      for (let y = 4; y < H; y += 8) for (let x = 4; x < W; x += 8) g.fillRect(x, y, 1, 1);
      g.fillStyle = P.dim;
      wire.forEach((w) => w.forEach(([x, y]) => g.fillRect(x, y, 1, 1)));
      N.forEach(drawNode);
      g.fillStyle = P.accent2; g.globalAlpha = 0.9;
      jitter.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
      g.globalAlpha = 1;
      if (N[4].flash > 0) {                       // check mark above OUT
        g.fillStyle = P.ok;
        [[0, 3], [1, 4], [2, 3], [3, 2], [4, 1], [5, 0]].forEach(([x, y]) => g.fillRect(N[4].x + 5 + x, N[4].y - 9 + y, 1, 2));
      }
      packets.forEach((p) => {
        g.fillStyle = EC[p.e];
        for (let k = 3; k >= 1; k--) {
          const [x, y] = at(E[p.e], Math.max(0, p.d - k * 2));
          g.globalAlpha = 0.15 * (4 - k); g.fillRect(x, y, 1, 1);
        }
        g.globalAlpha = 1;
        const [x, y] = at(E[p.e], p.d);
        g.fillRect(x - 1, y - 1, 2, 2);
      });
    }, 30);
  }

  /* ===================== 2. ASSEMBLE (chaos -> document) ===================== */
  function assemble(cv) {
    const W = 160, H = 112, g = setup(cv, W, H), P = PAL();
    const OX = 52, OY = 16;
    const col = { dim: P.dim, ink2: P.ink2, accent: P.accent, accent2: P.accent2, ok: P.ok };
    const R = [];
    const box = (x, y, w, h, c) => R.push([x, y, w, 1, c], [x, y + h - 1, w, 1, c], [x, y, 1, h, c], [x + w - 1, y, 1, h, c]);
    box(0, 0, 56, 80, 'dim');
    R.push([5, 5, 34, 6, 'accent']);
    R.push([5, 16, 46, 2, 'ink2'], [5, 21, 40, 2, 'ink2'], [5, 26, 44, 2, 'ink2']);
    R.push([5, 34, 14, 2, 'accent2']); box(5, 38, 46, 9, 'dim'); R.push([8, 41, 20, 2, 'ink2']);
    R.push([5, 52, 18, 2, 'accent2']); box(5, 56, 46, 9, 'dim'); R.push([8, 59, 26, 2, 'ink2']);
    [[41, 41], [41, 59]].forEach(([x, y]) => [[0, 2], [1, 3], [2, 2], [3, 1], [4, 0]].forEach(([a, b]) => R.push([x + a, y + b, 1, 1, 'ok'])));
    R.push([5, 69, 22, 6, 'ok']);

    const T = [];
    R.forEach(([x, y, w, h, c]) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) T.push({ tx: OX + x + i, ty: OY + y + j, c: col[c] }); });
    T.forEach((p) => {
      p.sx = rnd(0, W); p.sy = rnd(0, H); p.ex = rnd(0, W); p.ey = rnd(0, H);
      p.d1 = rnd(0, 1.0); p.d2 = rnd(0, 0.6);
    });

    const A = 2.2, HOLD = 5.0, CYC = 6.4;
    let t = 0;
    loop(cv, (dt) => {
      t += dt / 1000;
      if (t >= CYC) { t -= CYC; T.forEach((p) => { p.sx = p.ex; p.sy = p.ey; p.ex = rnd(0, W); p.ey = rnd(0, H); p.d1 = rnd(0, 1.0); p.d2 = rnd(0, 0.6); }); }
      g.clearRect(0, 0, W, H);
      for (const p of T) {
        let x, y, moving = true;
        if (t < HOLD) {
          const k = ease(clamp01((t - p.d1) / 1.2));
          x = p.sx + (p.tx - p.sx) * k; y = p.sy + (p.ty - p.sy) * k; moving = k < 1;
        } else {
          const k = ease(clamp01((t - HOLD - p.d2) / 0.8));
          x = p.tx + (p.ex - p.tx) * k; y = p.ty + (p.ey - p.ty) * k; moving = k > 0;
        }
        g.globalAlpha = moving ? 0.75 : 1;
        g.fillStyle = moving ? P.accent2 : p.c;
        g.fillRect(x | 0, y | 0, 1, 1);
      }
      g.globalAlpha = 1;
      if (t > A + 0.4 && t < HOLD) {                // scan beam over the finished card
        const by = OY + (((t - A - 0.4) * 36) % 80);
        g.fillStyle = 'rgba(94,242,214,.35)'; g.fillRect(OX - 3, by | 0, 62, 1);
      }
    }, 30);
  }

  /* ===================== 3. PLANET (dithered, rotating) ===================== */
  const h3 = (x, y, z) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const vn = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let fx = x - xi, fy = y - yi, fz = z - zi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    return lerp(
      lerp(lerp(h3(xi, yi, zi), h3(xi + 1, yi, zi), fx), lerp(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), fx), fy),
      lerp(lerp(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), fx), lerp(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), fx), fy), fz);
  };
  function dline(g, x0, y0, x1, y1) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (n++ % 3 === 0) g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function planet(cv) {
    const W = 128, H = 128, g = setup(cv, W, H), P = PAL();
    const cx = 64, cy = 64, R = 42;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const og = off.getContext('2d'), img = og.createImageData(W, H), D = img.data;
    const Lr = [-0.55, -0.5, 0.67], ll = Math.hypot(...Lr), L = Lr.map((v) => v / ll);
    const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
    const pix = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R, r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      pix.push({ i: (y * W + x) * 4, nx: dx, ny: dy, nz, lit: Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]), b: B4[(y & 3) * 4 + (x & 3)] });
    }
    const ocean = [[10, 19, 48], [18, 48, 107], [31, 91, 179]];
    const land = [[12, 66, 60], [29, 143, 120], hex(P.accent)];
    const stars = Array.from({ length: 34 }, () => ({ x: (Math.random() * W) | 0, y: (Math.random() * H) | 0, p: Math.random() * 6 }));
    const sats = [
      { rx: 56, ry: 16, tilt: -0.35, w: 0.9, ph: 0, c: P.accent2 },
      { rx: 52, ry: 14, tilt: 0.5, w: -0.7, ph: 2, c: P.accent },
      { rx: 58, ry: 20, tilt: 1.2, w: 0.55, ph: 4, c: P.ok },
    ];
    let rot = 0, t = 0;

    loop(cv, (dt) => {
      t += dt / 1000; rot += dt * 0.0004;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      D.fill(0);
      for (const p of pix) {
        const qx = p.nx * cs + p.nz * sn, qz = -p.nx * sn + p.nz * cs;
        const n = 0.65 * vn(qx * 2.1 + 9, p.ny * 2.1, qz * 2.1) + 0.35 * vn(qx * 4.7, p.ny * 4.7 + 3, qz * 4.7);
        const isLand = n > 0.52;
        const v = (0.12 + 0.88 * p.lit) + (p.b - 0.5) * 0.32;
        const tone = v < 0.33 ? 0 : v < 0.62 ? 1 : 2;
        let c = (isLand ? land : ocean)[tone];
        if (p.nz < 0.14 && p.lit > 0.15) c = [90, 140, 210];
        D[p.i] = c[0]; D[p.i + 1] = c[1]; D[p.i + 2] = c[2]; D[p.i + 3] = 255;
      }
      og.putImageData(img, 0, 0);

      g.clearRect(0, 0, W, H);
      g.fillStyle = P.ink2;
      stars.forEach((s) => { g.globalAlpha = 0.25 + 0.5 * Math.max(0, Math.sin(t * 1.5 + s.p)); g.fillRect(s.x, s.y, 1, 1); });
      g.globalAlpha = 1;
      // back half of orbits & sats behind the planet are hidden by drawing planet on top of them
      const pos = sats.map((s) => {
        const a = t * s.w + s.ph, ex = s.rx * Math.cos(a), ey = s.ry * Math.sin(a);
        const x = cx + ex * Math.cos(s.tilt) - ey * Math.sin(s.tilt), y = cy + ex * Math.sin(s.tilt) + ey * Math.cos(s.tilt);
        return { x, y, front: Math.sin(a) > 0, c: s.c, s };
      });
      g.fillStyle = P.ink2; g.globalAlpha = 0.14;
      sats.forEach((s) => { for (let k = 0; k < 120; k++) { const a = (k / 120) * 6.2832, ex = s.rx * Math.cos(a), ey = s.ry * Math.sin(a); g.fillRect((cx + ex * Math.cos(s.tilt) - ey * Math.sin(s.tilt)) | 0, (cy + ex * Math.sin(s.tilt) + ey * Math.cos(s.tilt)) | 0, 1, 1); } });
      g.globalAlpha = 1;
      pos.filter((p) => !p.front).forEach((p) => { g.fillStyle = p.c; g.fillRect((p.x | 0) - 1, (p.y | 0) - 1, 3, 3); });
      g.drawImage(off, 0, 0);
      g.fillStyle = P.accent; g.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) { const a = pos[i], b = pos[(i + 1) % 3]; if (a.front && b.front) dline(g, a.x, a.y, b.x, b.y); }
      g.globalAlpha = 1;
      pos.filter((p) => p.front).forEach((p) => { g.fillStyle = p.c; g.fillRect((p.x | 0) - 1, (p.y | 0) - 1, 3, 3); });
    }, 20);
  }

  /* ===================== 4. FIELD (cursor-reactive dots) ===================== */
  function field(el) {
    const cv = document.createElement('canvas');
    cv.className = 'px-field-canvas'; cv.setAttribute('aria-hidden', 'true');
    el.prepend(cv);
    const g = cv.getContext('2d'), P = PAL(), [ar, ag, ab] = hex(P.accent);
    const CELL = +el.dataset.cell || 12;
    let w = 0, h = 0, dpr = 1, t = 0;
    const resize = () => {
      const r = el.getBoundingClientRect(); w = r.width; h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    };
    new ResizeObserver(resize).observe(el); resize();
    const m = { x: -999, y: -999, sx: -999, sy: -999, on: false }, ripples = [];
    window.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; if (!m.on) { m.sx = m.x; m.sy = m.y; } m.on = true; });
    window.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (x >= 0 && y >= 0 && x <= r.width && y <= r.height) ripples.push({ x, y, t: 0 });
    });
    loop(el, (dt) => {
      const s = dt / 1000; t += s;
      m.sx += (m.x - m.sx) * 0.25; m.sy += (m.y - m.sy) * 0.25;
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += s; if (ripples[i].t > 1.4) ripples.splice(i, 1); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      for (let y = CELL / 2; y < h; y += CELL) for (let x = CELL / 2; x < w; x += CELL) {
        let a = 0.08 + 0.05 * Math.sin(t * 1.2 + (x + y) * 0.02), size = 2;
        const sw = ((x + y) * 0.5 - t * 90) % 700;
        if (sw > 0 && sw < 24) a += 0.25 * (1 - sw / 24);
        if (m.on) {
          const dx = x - m.sx, dy = y - m.sy, d2 = dx * dx + dy * dy;
          if (d2 < 22500) { const f = 1 - Math.sqrt(d2) / 150; a += 0.8 * f * f; size = 2 + Math.round(f * 2); }
        }
        for (const r of ripples) {
          const dd = Math.abs(Math.hypot(x - r.x, y - r.y) - r.t * 320);
          if (dd < 14) { const f = (1 - dd / 14) * (1 - r.t / 1.4); a += 0.7 * f; if (f > 0.4) size = 4; }
        }
        if (a < 0.03) continue;
        g.fillStyle = `rgba(${ar},${ag},${ab},${Math.min(1, a).toFixed(2)})`;
        g.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      }
    }, 30);
  }

  /* ===================== 5. TYPEWRITER ===================== */
  function typewriter(el) {
    const phrases = (el.dataset.phrases || el.textContent).split('|').map((s) => s.trim()).filter(Boolean);
    const loopIt = el.dataset.loop !== 'false', speed = +el.dataset.speed || 70;
    const sr = document.createElement('span'); sr.className = 'px-sr'; sr.textContent = phrases.join(' ');
    const txt = document.createElement('span'), cur = document.createElement('span');
    txt.setAttribute('aria-hidden', 'true'); cur.className = 'px-cursor'; cur.setAttribute('aria-hidden', 'true');
    el.textContent = ''; el.append(sr, txt, cur);
    if (REDUCE) { txt.textContent = phrases.join(' '); return; }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (let i = 0; ; i++) {
        const p = phrases[i % phrases.length];
        for (let k = 1; k <= p.length; k++) { txt.textContent = p.slice(0, k); await sleep(speed + Math.random() * 40); }
        if (!loopIt && i >= phrases.length - 1) return;
        await sleep(1400);
        for (let k = p.length; k >= 0; k--) { txt.textContent = p.slice(0, k); await sleep(30); }
        await sleep(250);
      }
    })();
  }

  /* ===================== 6. ICONS (8x8 bitmaps -> SVG) ===================== */
  const ICONS = {
    arch:    ['..####..', '..####..', '...##...', '...##...', '########', '##....##', '##....##', '##....##'],
    agent:   ['...##...', '########', '#......#', '#.#..#.#', '#......#', '#.####.#', '########', '.#....#.'],
    llm:     ['..#..#..', '.######.', '##....##', '#..##..#', '#..##..#', '##....##', '.######.', '..#..#..'],
    dev:     ['########', '#......#', '#.#....#', '#..#...#', '#.#.##.#', '#......#', '########', '........'],
    backend: ['########', '#....#.#', '########', '#....#.#', '########', '#....#.#', '########', '.#....#.'],
    product: ['########', '#..##..#', '#..##..#', '########', '#..##..#', '#..##..#', '#..##..#', '########'],
    rnd:     ['..####..', '...##...', '...##...', '..#..#..', '.#....#.', '#.####.#', '#.####.#', '########'],
    biz:     ['......##', '......##', '...##.##', '...##.##', '.#.##.##', '.#.##.##', '.#.##.##', '########'],
  };
  function icon(name) {
    const b = ICONS[name]; if (!b) return '';
    let r = '';
    b.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
    return `<svg viewBox="0 0 8 8" aria-hidden="true" focusable="false">${r}</svg>`;
  }

  /* ------------------------------ auto init ------------------------------ */
  const REG = { pipeline, assemble, planet, field, typewriter };
  function init(root = document) {
    root.querySelectorAll('[data-px]').forEach((el) => { if (el.__px) return; el.__px = 1; const f = REG[el.dataset.px]; if (f) f(el); });
    root.querySelectorAll('[data-px-icon]').forEach((el) => { if (el.__pxi) return; el.__pxi = 1; el.classList.add('px-icon'); el.innerHTML = icon(el.dataset.pxIcon); });
  }
  window.PixelKit = { init, icon, icons: ICONS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
