/* ==========================================
   A school of small folded proteins.

   Each swimmer is a real Cα trace from ubiquitin (PDB 1UBQ): the whole
   76-residue fold, or one of its halves. It keeps its native 3D shape,
   tumbles slowly, and is drawn as a tube coloured by secondary structure
   (helix / strand / loop), shaded by depth.

   The school moves as boids (Reynolds, 1987): separation, alignment and
   cohesion between neighbours, plus soft walls.

   Click the empty page: the school streams over and circles that point.
   data-sparse: fewer proteins (subpages, so reading stays easy).
   data-mode="aggregate" (404): proteins collapse into one clump and stay there.
   ========================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('protein-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var AGGREGATE = canvas.getAttribute('data-mode') === 'aggregate';
  var SPARSE = canvas.hasAttribute('data-sparse');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Chain A of 1UBQ (Vijay-Kumar, Bugg & Cook, 1987), Cα only, in Å.
  // SS from the PDB HELIX/SHEET records: E strand, H α-helix, G 3₁₀-helix, L loop.
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
  // Folds the school is made of, 0-based [start, end): whole ubiquitin,
  // N-terminal half (β-hairpin + α-helix), C-terminal half (β-sheet + 3₁₀).
  var FOLDS = [[0, 76], [0, 36], [38, 76], [0, 76]];

  var MAX_FORCE = 0.035;     // steering acceleration cap, px/frame²
  var FOCUS_MS = 6000;       // how long a click gathers the school

  var W = 0, H = 0, dpr = 1;
  var colors = {};
  var school = [];
  var focus = null;          // {x, y, r, until}
  var running = false;
  var last = 0;

  function settings() {
    var s = Math.min(W, H), o;
    if (s < 500) o = { count: 5, scale: 2.2 };
    else if (s < 900) o = { count: 8, scale: 2.8 };
    else o = { count: 10, scale: 3.4 };
    if (SPARSE) o.count = Math.max(3, Math.round(o.count * 0.4));
    return o;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Native coordinates of a fold, centred on its own centroid.
  function foldCoords(f) {
    var a = f[0], n = f[1] - f[0], x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
    var mx = 0, my = 0, mz = 0, i;
    for (i = 0; i < n; i++) { mx += XYZ[3 * (a + i)]; my += XYZ[3 * (a + i) + 1]; mz += XYZ[3 * (a + i) + 2]; }
    mx /= n; my /= n; mz /= n;
    for (i = 0; i < n; i++) { x[i] = XYZ[3 * (a + i)] - mx; y[i] = XYZ[3 * (a + i) + 1] - my; z[i] = XYZ[3 * (a + i) + 2] - mz; }
    return { n: n, ss: SS.slice(a, a + n), x: x, y: y, z: z };
  }

  function makeProtein(scale, k) {
    var fold = foldCoords(FOLDS[k % FOLDS.length]);
    var depth = Math.random();                                  // 0 far, 1 near
    var a = rand(0, Math.PI * 2), speed = rand(0.35, 0.8) * (0.8 + 0.4 * depth);
    return {
      fold: fold, depth: depth,
      scale: scale * (0.65 + 0.55 * depth),                     // px per Å
      x: rand(0.1, 0.9) * W, y: rand(0.1, 0.9) * H,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, maxSpeed: speed,
      // Orientation (Euler angles) and a slow, steady tumble.
      rx: rand(0, 6.3), ry: rand(0, 6.3), rz: rand(0, 6.3),
      wx: rand(-1, 1) * 0.004, wy: rand(-1, 1) * 0.006, wz: rand(-1, 1) * 0.003,
      px: new Float32Array(fold.n), py: new Float32Array(fold.n), pz: new Float32Array(fold.n)
    };
  }

  function limit(x, y, m) {
    var d = Math.sqrt(x * x + y * y);
    return d > m ? [x / d * m, y / d * m] : [x, y];
  }

  // ---- Steering (one boid) --------------------------------------------
  function steer(c, k) {
    var sepR = 170, nbrR = 300, sepX = 0, sepY = 0, sepN = 0;
    var aliX = 0, aliY = 0, cohX = 0, cohY = 0, cohN = 0, nbrN = 0, v, i;

    for (i = 0; i < school.length; i++) {
      var o = school[i];
      if (o === c) continue;
      var dx = c.x - o.x, dy = c.y - o.y, d2 = dx * dx + dy * dy;
      if (d2 < sepR * sepR && d2 > 0) {
        var d = Math.sqrt(d2);
        sepX += dx / d * (1 - d / sepR); sepY += dy / d * (1 - d / sepR); sepN++;
      }
      if (d2 < nbrR * nbrR) {
        aliX += o.vx; aliY += o.vy; nbrN++;
        if (d2 >= sepR * sepR) { cohX += o.x; cohY += o.y; cohN++; }
      }
    }

    var ax = 0, ay = 0, cap = c.maxSpeed;
    if (sepN) { v = limit(sepX, sepY, MAX_FORCE * (AGGREGATE ? 0.6 : 1.6)); ax += v[0]; ay += v[1]; }
    if (nbrN) {
      v = limit(aliX / nbrN - c.vx, aliY / nbrN - c.vy, MAX_FORCE * 0.7); ax += v[0]; ay += v[1];
      var coh = AGGREGATE ? 1 : 1 - nbrN / 4;                   // groups form, then drift apart
      if (cohN && coh > 0) { v = limit(cohX / cohN - c.x, cohY / cohN - c.y, MAX_FORCE * 0.5 * coh); ax += v[0]; ay += v[1]; }
    }

    // Gather: stream toward the point, then orbit it in a shared spin.
    var f = AGGREGATE ? { x: W * 0.62, y: H * 0.58, r: 40 } : focus;
    if (f) {
      cap = c.maxSpeed * (AGGREGATE ? 0.8 : 2.6);
      var fx = f.x - c.x, fy = f.y - c.y, fd = Math.sqrt(fx * fx + fy * fy) || 1e-4;
      var ux = fx / fd, uy = fy / fd;
      var radial = fd > f.r ? cap : -cap * 0.4;
      v = limit(ux * radial - uy * cap * 0.6 - c.vx, uy * radial + ux * cap * 0.6 - c.vy, MAX_FORCE * 4);
      ax += v[0]; ay += v[1];
    }

    // Soft walls: turn back before the edge.
    var m = 110;
    if (c.x < m) ax += MAX_FORCE * 2 * (m - c.x) / m; else if (c.x > W - m) ax -= MAX_FORCE * 2 * (c.x - W + m) / m;
    if (c.y < m) ay += MAX_FORCE * 2 * (m - c.y) / m; else if (c.y > H - m) ay -= MAX_FORCE * 2 * (c.y - H + m) / m;

    c.vx += ax * k; c.vy += ay * k;
    var sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1e-4;
    var target = Math.max(cap * 0.4, Math.min(cap, sp));        // never stall, never exceed the cap
    c.vx *= target / sp; c.vy *= target / sp;
  }

  function move(c, k) {
    c.x += c.vx * k; c.y += c.vy * k;
    // Tumble faster while swimming fast (e.g. rushing to a click).
    var spin = k * (1 + 1.5 * Math.sqrt(c.vx * c.vx + c.vy * c.vy) / c.maxSpeed);
    c.rx += c.wx * spin; c.ry += c.wy * spin; c.rz += c.wz * spin;
  }

  // Rotate the native fold into screen space (orthographic).
  function project(c) {
    var f = c.fold, s = c.scale;
    var cx = Math.cos(c.rx), sx = Math.sin(c.rx), cy = Math.cos(c.ry), sy = Math.sin(c.ry), cz = Math.cos(c.rz), sz = Math.sin(c.rz);
    for (var i = 0; i < f.n; i++) {
      var x = f.x[i], y = f.y[i], z = f.z[i], t;
      t = y * cx - z * sx; z = y * sx + z * cx; y = t;           // about x
      t = x * cy + z * sy; z = -x * sy + z * cy; x = t;          // about y
      t = x * cz - y * sz; y = x * sz + y * cz; x = t;           // about z
      c.px[i] = c.x + x * s; c.py[i] = c.y + y * s; c.pz[i] = z;
    }
  }

  // ---- Drawing --------------------------------------------------------
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) { return s.getPropertyValue(name).trim() || fallback; }
    colors.E = v('--ss-strand', '#16687a');
    colors.H = colors.G = v('--ss-helix', '#b13a2c');
    colors.L = v('--ss-loop', '#9f968a');
  }

  var segs = [];
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (var k = 0; k < school.length; k++) {                   // sorted far → near
      var c = school[k], f = c.fold, i, n = f.n;
      project(c);
      // Tube segments between consecutive Cα, drawn back to front within the fold.
      segs.length = 0;
      for (i = 0; i < n - 1; i++) segs.push(i);
      segs.sort(function (a, b) { return (c.pz[a] + c.pz[a + 1]) - (c.pz[b] + c.pz[b + 1]); });
      var base = 0.45 + 0.45 * c.depth;
      for (var j = 0; j < segs.length; j++) {
        i = segs[j];
        var zt = Math.max(-1, Math.min(1, (c.pz[i] + c.pz[i + 1]) / 30));   // -1 back … 1 front
        ctx.globalAlpha = base * (0.6 + 0.4 * zt);
        ctx.strokeStyle = colors[f.ss[i]];
        ctx.lineWidth = c.scale * (f.ss[i] === 'L' ? 0.55 : 0.95) * (1 + 0.3 * zt);
        ctx.beginPath();
        // Smooth the trace: run through the midpoints, with the Cα as control points.
        var x0 = i > 0 ? (c.px[i - 1] + c.px[i]) / 2 : c.px[i], y0 = i > 0 ? (c.py[i - 1] + c.py[i]) / 2 : c.py[i];
        var x2 = (c.px[i] + c.px[i + 1]) / 2, y2 = (c.py[i] + c.py[i + 1]) / 2;
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(c.px[i], c.py[i], x2, y2);
        if (i === n - 2) ctx.lineTo(c.px[i + 1], c.py[i + 1]);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- Setup & loop ---------------------------------------------------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var s = settings();
    while (school.length > s.count) school.pop();
    while (school.length < s.count) school.push(makeProtein(s.scale, school.length));
    school.sort(function (a, b) { return a.depth - b.depth; });
  }

  function frame(t) {
    if (!running) return;
    var k = last ? Math.min((t - last) / 16.67, 3) : 1;        // frame-rate independent
    last = t;
    if (focus && t > focus.until) focus = null;
    for (var i = 0; i < school.length; i++) steer(school[i], k);
    for (i = 0; i < school.length; i++) move(school[i], k);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  resize();
  readColors();
  canvas.classList.add('is-ready');

  // Click on empty page (not a link, button, image or selected text) to gather the school.
  window.addEventListener('click', function (e) {
    if (AGGREGATE || e.button !== 0 || e.target.closest('a, button, input, textarea, select, label, img, summary')) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    focus = { x: e.clientX, y: e.clientY, r: 150, until: performance.now() + FOCUS_MS };
  });
  window.addEventListener('resize', function () { resize(); if (reduceMotion) draw(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false; else start();
  });
  document.addEventListener('themechange', function () { readColors(); if (reduceMotion) draw(); });

  // Below the hero the school dims so text stays easy to read.
  var hero = document.querySelector('.profile-section');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      canvas.classList.toggle('is-dim', !entries[0].isIntersecting);
    }).observe(hero);
  }

  if (reduceMotion) draw(); else start();
})();
