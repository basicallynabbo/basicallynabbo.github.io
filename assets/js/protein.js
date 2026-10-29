/* ==========================================
   A small school of peptide chains, swimming on their own.

   Each chain is a real fragment of ubiquitin (PDB 1UBQ, Cα only), so it
   carries its native local structure: the β-hairpin stays a hairpin, the
   α-helix stays a helix. Simulated in 3D (units: Å), drawn as an
   orthographic projection.

   Body:  Verlet integration + position-based constraints
            bonds          Cα–Cα = 3.8 Å
            bend           d(i, i+2) ≥ 5.2 Å  (virtual bond angle ≥ ~87°)
            excluded vol.  non-bonded Cα ≥ 3.9 Å
            native shape   soft springs to native distances within the fragment
   Swim:  the head is pushed along a heading that drifts with smooth noise;
          heads steer away from walls, from other chains and, gently, from the cursor.
   404:   chains attract each other and clump, like an aggregate.
   ========================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('protein-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var AGGREGATE = canvas.getAttribute('data-mode') === 'aggregate';

  // Chain A of 1UBQ (Vijay-Kumar, Bugg & Cook, 1987). Cα only, centred and
  // rotated onto principal axes. SS from the PDB HELIX/SHEET records:
  // E β-strand, H α-helix, G 3₁₀-helix, L loop.
  var SEQ = 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG';
  var SS = 'EEEEEEELLEEEEEEEELLLLLHHHHHHHHHHHHLLLLLEEEEEELLEEELLLLLGGGGLLLLEEEEEEEEELLLL';
  var XYZ = [
    11.9, -6, -3.7, 8.9, -7.9, -2.5, 6.5, -6.4, 0.1, 3.3, -7.7, 1.6, -0, -5.8, 1.8, -2.4, -7.3, 4.4, -6.1, -6.5, 4, -8.8, -6.5, 6.6,
    -10.3, -9.7, 5.2, -7.2, -11.8, 5.9, -6, -11.8, 2.3, -2.3, -10.8, 1.9, -1.2, -9.5, -1.5, 2.5, -9.6, -2.6, 3.8, -6.7, -4.7, 7.1, -6.1, -6.4,
    8.3, -2.6, -5.8, 11.4, -0.4, -5.6, 12, 1.9, -2.6, 12, 4.8, -5.1, 8.4, 4.2, -6, 5.9, 6.7, -4.7, 2.9, 5.7, -2.6, 0.6, 6.8, -5.5,
    2.4, 4.2, -7.6, 2, 1.4, -5, -1.8, 2.2, -4.9, -2, 1.9, -8.7, -0.2, -1.5, -8.6, -2.8, -2.6, -5.9, -5.6, -1.4, -8.2, -4.2, -3.2, -11.1,
    -3.9, -6.5, -9.2, -7, -6.6, -6.9, -9.2, -3.9, -8.5, -9.5, -1.6, -5.5, -9.7, 2.1, -6.5, -6.8, 4.2, -5.2, -9.2, 6.7, -3.6, -10.5, 3.9, -1.3,
    -7, 2.8, -0.1, -5.5, 3.9, 3.2, -1.9, 2.4, 3.6, -0.4, 2, 7.1, 3.2, 1.2, 8.1, 4.7, 1.5, 11.5, 1.6, 3.3, 12.7, 1.9, 6.1, 10.1,
    -0.7, 6.6, 7.2, 1.4, 6.7, 4, 1, 9.9, 1.8, 0.8, 9.7, -2, 3.7, 11.9, -3, 6.3, 10.3, -0.7, 8.4, 7.3, -1.8, 8.7, 4, 0.2,
    12.3, 5, 1, 11, 8.1, 2.8, 9.4, 5.7, 5.3, 12.4, 3.3, 5.5, 10.3, 0.4, 4.2, 12.7, -2.5, 3.6, 12.3, -5.8, 1.7, 9.7, -8.1, 3,
    7.9, -5.4, 5.1, 4.1, -5.7, 5.5, 1.9, -2.6, 5, -1.7, -2.7, 6.2, -4.5, -1.7, 3.8, -7.7, -0.2, 5.3, -10.5, 0.7, 2.9, -12.3, 4, 3.2,
    -15.6, 3.7, 1.1, -17.4, 6.9, -0.1, -20.9, 6.5, 1.2, -22.7, 4.8, 4.1
  ];

  // Fragments, 0-based [start, end): β-hairpin 1–17, α1 21–36, β3–β4 40–50,
  // C-terminal strand 63–76, 3₁₀ segment 52–62.
  var FRAGMENTS = [[0, 17], [20, 36], [39, 50], [62, 76], [51, 62]];

  var BOND = 3.8, MIN_NB = 3.9, MIN_I2 = 5.2, CONTACT = 8;
  var DAMP = 0.94, ITER = 4;
  var SPEED = 32;            // cruise speed, px/s
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var w = 0, h = 0, dpr = 1, scale = 3;   // scale: px per Å
  var colors = {};
  var chains = [];
  var pointer = null;        // {x, y} in px, or null when the cursor is away
  var running = false, visible = true;

  function nativeDist(i, j) {
    var dx = XYZ[3 * i] - XYZ[3 * j], dy = XYZ[3 * i + 1] - XYZ[3 * j + 1], dz = XYZ[3 * i + 2] - XYZ[3 * j + 2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function makeChain(frag, k, cx, cy) {
    var a = frag[0], n = frag[1] - frag[0], c = {
      res: a, n: n, ss: SS.slice(a, a + n),
      px: new Float64Array(n), py: new Float64Array(n), pz: new Float64Array(n),
      ox: new Float64Array(n), oy: new Float64Array(n), oz: new Float64Array(n),
      springs: [],
      seed: k * 2.39996,     // golden angle: spreads phases evenly
      heading: Math.random() * Math.PI * 2,
      boost: 0
    };
    // Centre the fragment's native coordinates on (cx, cy).
    var mx = 0, my = 0, mz = 0, i, j;
    for (i = 0; i < n; i++) { mx += XYZ[3 * (a + i)]; my += XYZ[3 * (a + i) + 1]; mz += XYZ[3 * (a + i) + 2]; }
    mx /= n; my /= n; mz /= n;
    for (i = 0; i < n; i++) {
      c.px[i] = c.ox[i] = cx / scale + XYZ[3 * (a + i)] - mx;
      c.py[i] = c.oy[i] = cy / scale + XYZ[3 * (a + i) + 1] - my;
      c.pz[i] = c.oz[i] = XYZ[3 * (a + i) + 2] - mz;
    }
    // Native shape: local helix/strand geometry is stiff, other contacts are soft.
    for (i = 0; i < n; i++) {
      for (j = i + 2; j < n; j++) {
        var d0 = nativeDist(a + i, a + j), same = c.ss[i] !== 'L' && c.ss[i] === c.ss[j] && SS.slice(a + i, a + j + 1).indexOf('L') < 0;
        if (same && j - i <= 4) c.springs.push(i, j, d0, 0.5);
        else if (j - i >= 3 && d0 < CONTACT) c.springs.push(i, j, d0, 0.03);
      }
    }
    return c;
  }

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) { return s.getPropertyValue(name).trim() || fallback; }
    colors.E = v('--ss-strand', '#e0a526');
    colors.H = colors.G = v('--ss-helix', '#e05a47');
    colors.L = v('--ss-loop', '#8a9ab0');
    colors.backbone = v('--ss-backbone', 'rgba(120,130,150,0.35)');
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    resize();
    readColors();
    scale = Math.max(3, Math.min(5, w / 256));
    var count = w < 760 ? 3 : w < 1180 ? 4 : 5;
    chains = [];
    for (var k = 0; k < count; k++) {
      // Spread the school across the viewport, slightly jittered.
      var cx = w * (0.15 + 0.7 * (k + 0.5) / count) + (Math.random() - 0.5) * 60;
      var cy = h * (0.25 + 0.5 * ((k * 0.618) % 1));
      chains.push(makeChain(FRAGMENTS[k], k, cx, cy));
    }
  }

  // ---- Constraints ----------------------------------------------------
  // kind: 0 = keep distance d0, 1 = at least d0. The head is heavy (inverse mass
  // HEAD_INV), so corrections mostly move the body and the head leads the swim.
  var HEAD_INV = 0.15;
  function constrain(c, i, j, d0, k, kind) {
    var dx = c.px[j] - c.px[i], dy = c.py[j] - c.py[i], dz = c.pz[j] - c.pz[i];
    var d2 = dx * dx + dy * dy + dz * dz;
    if (kind === 1 && d2 >= d0 * d0) return;
    var wi = i === 0 ? HEAD_INV : 1, wj = j === 0 ? HEAD_INV : 1;
    var d = Math.sqrt(d2) || 1e-6, s = k * (d - d0) / d / (wi + wj);
    c.px[i] += dx * s * wi; c.py[i] += dy * s * wi; c.pz[i] += dz * s * wi;
    c.px[j] -= dx * s * wj; c.py[j] -= dy * s * wj; c.pz[j] -= dz * s * wj;
  }

  function solve(c) {
    var a, b, n = c.n, sp = c.springs;
    for (var it = 0; it < ITER; it++) {
      for (a = 0; a < sp.length; a += 4) constrain(c, sp[a], sp[a + 1], sp[a + 2], sp[a + 3], 0);
      for (a = 0; a < n - 2; a++) constrain(c, a, a + 2, MIN_I2, 1, 1);
      for (a = 0; a < n; a++) for (b = a + 3; b < n; b++) constrain(c, a, b, MIN_NB, 1, 1);
      for (a = 0; a < n - 1; a++) constrain(c, a, a + 1, BOND, 1, 0);
    }
  }

  // ---- Swimming -------------------------------------------------------
  function steer(c, k, t) {
    var hx = c.px[0] * scale, hy = c.py[0] * scale, sx = 0, sy = 0, d, i, m;

    // Walls: push back in when within 60 px of an edge.
    m = 60;
    if (hx < m) sx += (m - hx) / m; else if (hx > w - m) sx -= (hx - (w - m)) / m;
    if (hy < m) sy += (m - hy) / m; else if (hy > h - m) sy -= (hy - (h - m)) / m;

    // Separation from other chains (not on the 404 page, where they should meet).
    for (var o = 0; o < chains.length && !AGGREGATE; o++) {
      if (o === k) continue;
      var other = chains[o];
      for (i = 0; i < other.n; i += 2) {
        var dx = hx - other.px[i] * scale, dy = hy - other.py[i] * scale;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < 80 && d > 0) { sx += dx / d * (1 - d / 80) * 0.4; sy += dy / d * (1 - d / 80) * 0.4; }
      }
    }

    // Gentle nudge away from the cursor, like a fish avoiding a hand.
    // Distance is measured to the chain's nearest bead, so touching any part of it counts.
    if (pointer) {
      var px = 0, py = 0;
      d = Infinity;
      for (i = 0; i < c.n; i++) {
        var ex = c.px[i] * scale - pointer.x, ey = c.py[i] * scale - pointer.y, ed = Math.sqrt(ex * ex + ey * ey);
        if (ed < d) { d = ed; px = ex; py = ey; }
      }
      if (d < 140 && d > 0) {
        var f = 1 - d / 140;
        sx += px / d * f * 2.5; sy += py / d * f * 2.5;
        c.boost = Math.max(c.boost, f);
      }
    }

    // Wander: heading drifts with smooth, per-chain noise, then bends toward the steering vector.
    c.heading += 0.012 * Math.sin(t * 0.00041 + c.seed) + 0.008 * Math.sin(t * 0.00097 + c.seed * 1.7);
    var vx = Math.cos(c.heading) + sx * 0.08, vy = Math.sin(c.heading) + sy * 0.08;
    c.heading = Math.atan2(vy, vx);
    c.boost *= 0.97;
  }

  function step(t) {
    for (var k = 0; k < chains.length; k++) {
      var c = chains[k], i;
      steer(c, k, t);

      // Push the head along its heading (desired velocity in Å/frame),
      // plus a sideways undulation that makes the body swim.
      var speed = SPEED * (AGGREGATE ? 0.3 : 1) * (1 + 1.5 * c.boost) / 60 / scale;
      var ch = Math.cos(c.heading), sh = Math.sin(c.heading);
      var wig = 0.6 * speed * Math.sin(t * 0.004 + c.seed);
      var tvx = ch * speed - sh * wig, tvy = sh * speed + ch * wig;
      var vmax = 3 * SPEED / 60 / scale;

      for (i = 0; i < c.n; i++) {
        var vx = (c.px[i] - c.ox[i]) * DAMP, vy = (c.py[i] - c.oy[i]) * DAMP, vz = (c.pz[i] - c.oz[i]) * DAMP;
        if (i === 0) { vx += (tvx - vx) * 0.25; vy += (tvy - vy) * 0.25; }
        // Speed cap: constraint corrections must never become a launch.
        var v2 = vx * vx + vy * vy + vz * vz;
        if (v2 > vmax * vmax) { var f = vmax / Math.sqrt(v2); vx *= f; vy *= f; vz *= f; }
        c.ox[i] = c.px[i]; c.oy[i] = c.py[i]; c.oz[i] = c.pz[i];
        c.px[i] += vx; c.py[i] += vy; c.pz[i] += vz + (Math.random() - 0.5) * 0.02;
      }

      roll(c, ch, sh, 0.008);
      solve(c);
    }
    if (AGGREGATE) { collapse(); stick(); }
    walls();
  }

  // 404 only: "poor solvent". A weak harmonic pull of every bead toward one fixed
  // point gathers the chains. It is external, so a clump can't propel itself anywhere.
  function collapse() {
    var tx = w * 0.62 / scale, ty = h * 0.58 / scale;
    for (var k = 0; k < chains.length; k++) {
      var c = chains[k];
      for (var i = 0; i < c.n; i++) {
        c.px[i] += (tx - c.px[i]) * 0.0015;
        c.py[i] += (ty - c.py[i]) * 0.0015;
      }
    }
  }

  // Safety net: beads can never leave the viewport (steering normally keeps them well inside).
  function walls() {
    var m = 2, maxX = w / scale - m, maxY = h / scale - m;
    for (var k = 0; k < chains.length; k++) {
      var c = chains[k];
      for (var i = 0; i < c.n; i++) {
        if (c.px[i] < m) c.px[i] += (m - c.px[i]) * 0.2; else if (c.px[i] > maxX) c.px[i] += (maxX - c.px[i]) * 0.2;
        if (c.py[i] < m) c.py[i] += (m - c.py[i]) * 0.2; else if (c.py[i] > maxY) c.py[i] += (maxY - c.py[i]) * 0.2;
      }
    }
  }

  // Slow roll about the swimming direction so the 3D shape reads.
  function roll(c, ux, uy, a) {
    var cx = 0, cy = 0, cz = 0, i, n = c.n;
    for (i = 0; i < n; i++) { cx += c.px[i]; cy += c.py[i]; cz += c.pz[i]; }
    cx /= n; cy /= n; cz /= n;
    var cos = Math.cos(a), sin = Math.sin(a);
    function rot(X, Y, Z, idx) {
      var x = X[idx] - cx, y = Y[idx] - cy, z = Z[idx] - cz;
      var dot = ux * x + uy * y;
      // Rodrigues' rotation about the unit axis u = (ux, uy, 0)
      X[idx] = cx + x * cos + (uy * z) * sin + ux * dot * (1 - cos);
      Y[idx] = cy + y * cos + (-ux * z) * sin + uy * dot * (1 - cos);
      Z[idx] = cz + z * cos + (ux * y - uy * x) * sin;
    }
    for (i = 0; i < n; i++) { rot(c.px, c.py, c.pz, i); rot(c.ox, c.oy, c.oz, i); }
  }

  // 404 only: beads of different chains stick when they touch.
  function stick() {
    for (var a = 0; a < chains.length; a++) for (var b = a + 1; b < chains.length; b++) {
      var A = chains[a], B = chains[b];
      for (var i = 0; i < A.n; i++) for (var j = 0; j < B.n; j++) {
        var dx = B.px[j] - A.px[i], dy = B.py[j] - A.py[i], dz = B.pz[j] - A.pz[i];
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 144) continue;   // only within 12 Å
        // Soft on both sides: a hard correction here turns into velocity and launches the chains.
        var d = Math.sqrt(d2) || 1e-6, s = (d - 5) / d * (d < 5 ? 0.1 : 0.01);
        A.px[i] += dx * s; A.py[i] += dy * s; A.pz[i] += dz * s;
        B.px[j] -= dx * s; B.py[j] -= dy * s; B.pz[j] -= dz * s;
      }
    }
  }

  // ---- Drawing --------------------------------------------------------
  function draw() {
    ctx.clearRect(0, 0, w, h);
    var beads = [], k, i, c;

    ctx.strokeStyle = colors.backbone;
    ctx.lineWidth = Math.max(1.5, 0.7 * scale);
    ctx.lineCap = ctx.lineJoin = 'round';
    for (k = 0; k < chains.length; k++) {
      c = chains[k];
      ctx.beginPath();
      ctx.moveTo(c.px[0] * scale, c.py[0] * scale);
      for (i = 1; i < c.n - 1; i++) {
        ctx.quadraticCurveTo(c.px[i] * scale, c.py[i] * scale,
          (c.px[i] + c.px[i + 1]) / 2 * scale, (c.py[i] + c.py[i + 1]) / 2 * scale);
      }
      ctx.lineTo(c.px[c.n - 1] * scale, c.py[c.n - 1] * scale);
      ctx.stroke();
      var cz = 0;
      for (i = 0; i < c.n; i++) cz += c.pz[i];
      cz /= c.n;
      for (i = 0; i < c.n; i++) beads.push({ c: c, i: i, z: c.pz[i], depth: Math.max(-1, Math.min(1, (c.pz[i] - cz) / 8)) });
    }

    // Beads back to front; nearer beads are larger and more opaque.
    beads.sort(function (a, b) { return a.z - b.z; });
    for (k = 0; k < beads.length; k++) {
      var b = beads[k];
      c = b.c; i = b.i;
      ctx.globalAlpha = 0.75 + 0.25 * b.depth;
      ctx.beginPath();
      ctx.arc(c.px[i] * scale, c.py[i] * scale, scale * 1.25 * (1 + 0.25 * b.depth) * (i === 0 ? 1.2 : 1), 0, Math.PI * 2);
      ctx.fillStyle = colors[c.ss[i]];
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- Loop & input ---------------------------------------------------
  function frame(t) {
    if (!running) return;
    step(t);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  init();

  window.addEventListener('pointermove', function (e) { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  window.addEventListener('pointerdown', function (e) { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer = null; });
  window.addEventListener('blur', function () { pointer = null; });
  window.addEventListener('resize', function () {
    resize();
    if (reduceMotion) draw();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  document.addEventListener('themechange', function () {
    readColors();
    if (reduceMotion) draw();
  });

  // Only animate while the hero is on screen; fade the canvas out below it.
  var hero = document.querySelector('.profile-section');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      canvas.classList.toggle('is-hidden', !visible);
      if (visible) start(); else stop();
    }).observe(hero);
  }

  if (reduceMotion) draw(); else start();
})();
