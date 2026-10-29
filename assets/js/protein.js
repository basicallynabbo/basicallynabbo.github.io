/* ==========================================
   Ubiquitin (PDB 1UBQ) as a live Cα chain.

   Simulated in 3D (units: Å), drawn as an orthographic projection.
   Verlet integration + position-based constraints:
     - bonds          Cα–Cα = 3.8 Å (trans peptide)
     - bend           d(i, i+2) ≥ 5.2 Å  (virtual bond angle ≥ ~87°)
     - excluded vol.  non-bonded Cα ≥ 3.9 Å
     - local          helices/strands keep their native i..i+4 distances
     - Gō contacts    in "fold" mode, the 177 native contacts (< 8 Å, |i−j| ≥ 3)
                      pull toward their native distance -> chain folds to 1UBQ
   Modes: follow (cursor) -> fold (idle) -> wander (unfolds) -> fold ...
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
  var N = SEQ.length;

  var BOND = 3.8, MIN_NB = 3.9, MIN_I2 = 5.2, CONTACT = 8;
  var DAMP = 0.9, ITER = 6, NOISE = 0.04;
  var IDLE_MS = 1500, FOLD_MS = 12000, WANDER_MS = 7000;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Topology -------------------------------------------------------
  var element = [], labels = [];
  (function () {
    var count = { E: 0, H: 0, G: 0, L: 0 }, names = { E: 'β', H: 'α', G: '3₁₀ ', L: 'loop' };
    var kinds = { E: 'strand', H: 'helix', G: 'helix', L: '' };
    for (var i = 0; i < N; i++) {
      if (i === 0 || SS[i] !== SS[i - 1]) count[SS[i]]++;
      element.push(SS[i] + count[SS[i]]);
      var tag = SS[i] === 'L' ? 'loop' : names[SS[i]] + (SS[i] === 'G' ? '' : count[SS[i]]) + ' ' + kinds[SS[i]];
      labels.push(SEQ[i] + (i + 1) + ' · ' + tag);
    }
  })();

  function nativeDist(i, j) {
    var dx = XYZ[3 * i] - XYZ[3 * j], dy = XYZ[3 * i + 1] - XYZ[3 * j + 1], dz = XYZ[3 * i + 2] - XYZ[3 * j + 2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  var local = [], native = [];
  for (var i = 0; i < N; i++) {
    for (var j = i + 2; j < N; j++) {
      var d0 = nativeDist(i, j);
      if (SS[i] !== 'L' && element[i] === element[j] && j - i <= 4) local.push(i, j, d0);
      else if (j - i >= 3 && d0 < CONTACT) native.push(i, j, d0);
    }
  }

  // ---- State ----------------------------------------------------------
  var px = new Float64Array(N), py = new Float64Array(N), pz = new Float64Array(N);
  var ox = new Float64Array(N), oy = new Float64Array(N), oz = new Float64Array(N);
  var inv = new Float64Array(N);   // inverse mass; 0 pins the bead (head while driven)
  var w = 0, h = 0, dpr = 1, scale = 3;   // scale: px per Å
  var colors = {};
  var mode = 'fold', idleSince = 0, running = false, visible = true, frameNo = 0;
  var pointer = { x: 0, y: 0, t: -Infinity }, hover = -1;
  var headV = { x: 0, y: 0 };
  var qEl = document.querySelector('[data-q]');

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) { return s.getPropertyValue(name).trim() || fallback; }
    colors.E = v('--ss-strand', '#e0a526');
    colors.H = colors.G = v('--ss-helix', '#e05a47');
    colors.L = v('--ss-loop', '#8a9ab0');
    colors.backbone = v('--ss-backbone', 'rgba(120,130,150,0.35)');
    colors.text = v('--text', '#1d2330');
    colors.bg = v('--bg-elev', '#fff');
    colors.border = v('--border', '#ddd');
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
    scale = Math.max(2.2, Math.min(4, w / 320));
  }

  // Place the chain at a screen point: native fold, or a straight coil.
  function place(cx, cy, folded) {
    for (var i = 0; i < N; i++) {
      px[i] = cx / scale + (folded ? XYZ[3 * i] : (i - N / 2) * BOND * 0.95);
      py[i] = cy / scale + (folded ? XYZ[3 * i + 1] : Math.sin(i * 0.5) * 2);
      pz[i] = folded ? XYZ[3 * i + 2] : 0;
      ox[i] = px[i]; oy[i] = py[i]; oz[i] = pz[i];
      inv[i] = 1;
    }
  }

  function wanderTarget(t) {
    return {
      x: (w * (0.5 + 0.32 * Math.sin(t * 0.00031) + 0.12 * Math.sin(t * 0.00087 + 1.3))) / scale,
      y: (h * (0.45 + 0.28 * Math.cos(t * 0.00023) + 0.10 * Math.sin(t * 0.00113 + 0.4))) / scale
    };
  }

  // ---- Constraints ----------------------------------------------------
  // kind: 0 = keep distance d0, 1 = at least d0. k = stiffness (0..1).
  function constrain(i, j, d0, k, kind, cap) {
    var dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i];
    var d2 = dx * dx + dy * dy + dz * dz;
    if (kind === 1 && d2 >= d0 * d0) return;
    var d = Math.sqrt(d2) || 1e-6;
    var delta = d - d0;
    if (cap) delta = Math.max(-cap, Math.min(cap, delta));
    var ws = inv[i] + inv[j];
    if (!ws) return;
    var s = k * delta / d / ws;
    px[i] += dx * s * inv[i]; py[i] += dy * s * inv[i]; pz[i] += dz * s * inv[i];
    px[j] -= dx * s * inv[j]; py[j] -= dy * s * inv[j]; pz[j] -= dz * s * inv[j];
  }

  function solve(folding) {
    var a, b;
    for (var it = 0; it < ITER; it++) {
      if (folding && !AGGREGATE) {
        for (a = 0; a < native.length; a += 3) constrain(native[a], native[a + 1], native[a + 2], 0.008, 0, 0.5);
      }
      if (folding && AGGREGATE) {
        // Misfolding: every bead sticks to every bead -> amorphous blob.
        for (a = 0; a < N; a++) for (b = a + 3; b < N; b++) constrain(a, b, 5, 0.004, 0, 1);
      }
      for (a = 0; a < local.length; a += 3) constrain(local[a], local[a + 1], local[a + 2], 0.5, 0);
      for (a = 0; a < N - 2; a++) constrain(a, a + 2, MIN_I2, 1, 1);
      for (a = 0; a < N; a++) for (b = a + 3; b < N; b++) constrain(a, b, MIN_NB, 1, 1);
      for (a = 0; a < N - 1; a++) constrain(a, a + 1, BOND, 1, 0);
    }
  }

  function currentMode(now) {
    if (now - pointer.t < IDLE_MS) return 'follow';
    if (mode === 'follow') idleSince = now;
    return (now - idleSince) % (FOLD_MS + WANDER_MS) < FOLD_MS ? 'fold' : 'wander';
  }

  function step(now) {
    mode = currentMode(now);
    var driven = mode !== 'fold';
    var i;

    // Head: damped spring toward the target, moved kinematically (pinned).
    if (driven) {
      var tgt = mode === 'follow' ? { x: pointer.x / scale, y: pointer.y / scale } : wanderTarget(now);
      headV.x = (headV.x + (tgt.x - px[0]) * 0.02) * 0.86;
      headV.y = (headV.y + (tgt.y - py[0]) * 0.02) * 0.86;
      px[0] += headV.x; py[0] += headV.y; pz[0] *= 0.9;
      ox[0] = px[0]; oy[0] = py[0]; oz[0] = pz[0];
    } else {
      headV.x = headV.y = 0;
    }
    inv[0] = driven ? 0 : 1;

    // Verlet with friction + small random kicks (a cartoon of Langevin dynamics).
    for (i = driven ? 1 : 0; i < N; i++) {
      var vx = (px[i] - ox[i]) * DAMP, vy = (py[i] - oy[i]) * DAMP, vz = (pz[i] - oz[i]) * DAMP;
      ox[i] = px[i]; oy[i] = py[i]; oz[i] = pz[i];
      px[i] += vx + (Math.random() - 0.5) * NOISE;
      py[i] += vy + (Math.random() - 0.5) * NOISE;
      pz[i] += vz + (Math.random() - 0.5) * NOISE;
      if (driven) pz[i] *= 0.995;   // a dragged chain flattens toward the screen
    }

    // While folded, turn slowly about the vertical axis so the 3D shape reads.
    if (mode === 'fold') rotateY(0.004);

    solve(mode === 'fold');

    // Soft walls keep the chain on screen.
    var m = 4, maxX = w / scale - m, maxY = h / scale - m;
    for (i = 0; i < N; i++) {
      if (px[i] < m) px[i] += (m - px[i]) * 0.2; else if (px[i] > maxX) px[i] += (maxX - px[i]) * 0.2;
      if (py[i] < m) py[i] += (m - py[i]) * 0.2; else if (py[i] > maxY) py[i] += (maxY - py[i]) * 0.2;
    }
  }

  function rotateY(a) {
    var cx = 0, cz = 0, i;
    for (i = 0; i < N; i++) { cx += px[i]; cz += pz[i]; }
    cx /= N; cz /= N;
    var c = Math.cos(a), s = Math.sin(a);
    for (i = 0; i < N; i++) {
      var x = px[i] - cx, z = pz[i] - cz;
      px[i] = cx + x * c + z * s; pz[i] = cz - x * s + z * c;
      x = ox[i] - cx; z = oz[i] - cz;
      ox[i] = cx + x * c + z * s; oz[i] = cz - x * s + z * c;
    }
  }

  // Fraction of native contacts formed (d < 1.2 d0): the standard folding order parameter.
  function nativeQ() {
    var formed = 0, total = 0, lists = [native, local];
    for (var l = 0; l < 2; l++) {
      var arr = lists[l];
      for (var a = 0; a < arr.length; a += 3) {
        var i = arr[a], j = arr[a + 1];
        var dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.2 * arr[a + 2]) formed++;
        total++;
      }
    }
    return formed / total;
  }

  // ---- Drawing --------------------------------------------------------
  var order = [];
  for (var o = 0; o < N; o++) order.push(o);

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var cz = 0, i;
    for (i = 0; i < N; i++) cz += pz[i];
    cz /= N;

    // Backbone: quadratic curve through bead midpoints.
    ctx.beginPath();
    ctx.moveTo(px[0] * scale, py[0] * scale);
    for (i = 1; i < N - 1; i++) {
      ctx.quadraticCurveTo(px[i] * scale, py[i] * scale, (px[i] + px[i + 1]) / 2 * scale, (py[i] + py[i + 1]) / 2 * scale);
    }
    ctx.lineTo(px[N - 1] * scale, py[N - 1] * scale);
    ctx.strokeStyle = colors.backbone;
    ctx.lineWidth = Math.max(1.5, 0.7 * scale);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.stroke();

    // Beads, back to front. Nearer beads are larger and more opaque.
    order.sort(function (a, b) { return pz[a] - pz[b]; });
    for (var k = 0; k < N; k++) {
      i = order[k];
      var depth = Math.max(-1, Math.min(1, (pz[i] - cz) / 15));
      var r = scale * 1.25 * (1 + 0.25 * depth) * (i === 0 ? 1.25 : 1);
      ctx.globalAlpha = 0.75 + 0.25 * depth;
      ctx.beginPath();
      ctx.arc(px[i] * scale, py[i] * scale, r, 0, Math.PI * 2);
      ctx.fillStyle = colors[SS[i]];
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (hover >= 0 && mode !== 'follow') drawLabel(hover);
  }

  function drawLabel(i) {
    var x = px[i] * scale, y = py[i] * scale, text = labels[i];
    ctx.beginPath();
    ctx.arc(x, y, scale * 2.6, 0, Math.PI * 2);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    var tw = ctx.measureText(text).width, bx = x + 12, by = y - 26;
    if (bx + tw + 16 > w) bx = x - tw - 28;
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, tw + 16, 22, 6); else ctx.rect(bx, by, tw + 16, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.fillText(text, bx + 8, by + 15);
  }

  // ---- Loop & input ---------------------------------------------------
  function frame(now) {
    if (!running) return;
    step(now);
    draw();
    if (qEl && ++frameNo % 10 === 0) qEl.textContent = nativeQ().toFixed(2);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  function nearestBead(x, y) {
    var best = -1, bd = Infinity;
    for (var i = 0; i < N; i++) {
      var dx = px[i] * scale - x, dy = py[i] * scale - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return { i: best, d: Math.sqrt(bd) };
  }

  // Near the folded chain the pointer inspects residues; farther away it calls the chain.
  function onPointer(x, y, force) {
    var near = nearestBead(x, y);
    hover = near.d < 14 ? near.i : -1;
    if (force || mode === 'follow' || near.d > 60) {
      pointer.t = performance.now();
    }
    pointer.x = x;
    pointer.y = y;
    if (reduceMotion) draw();
  }

  resize();
  readColors();
  if (AGGREGATE) place(w * 0.5, h * 0.55, false);
  // Start folded in the empty right-hand gutter when there is room, else near the top.
  else if (w >= 1180) place((3 * w + 820) / 4, h * 0.3, true);   // centre of the gutter right of the 820px column
  else place(w * (w < 760 ? 0.72 : 0.62), h * (w < 760 ? 0.16 : 0.12), true);
  idleSince = performance.now();
  if (qEl) qEl.textContent = nativeQ().toFixed(2);

  window.addEventListener('pointermove', function (e) {
    onPointer(e.clientX, e.clientY, e.pointerType === 'touch');
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') onPointer(e.clientX, e.clientY, true);
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (t) onPointer(t.clientX, t.clientY, true);
  }, { passive: true });
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
