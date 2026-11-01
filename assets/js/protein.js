/* ==========================================
   A school of short peptide chains.

   Each chain is a boid (Reynolds, 1987): it steers by three local rules —
     separation  keep clear of very close neighbours
     alignment   match the heading of nearby chains
     cohesion    drift toward neighbours a little further out
   plus soft walls. The body follows the head bead by bead at a fixed spacing,
   so every turn of the head travels down the chain like a swimming tail.
   Beads are coloured by secondary structure (helix / strand / loop), taken
   from a real stretch of ubiquitin (PDB 1UBQ).

   Click the empty page: the school streams over and circles that point.
   data-sparse: fewer chains (subpages, so reading stays easy).
   data-mode="aggregate" (404): chains collapse into one clump and stay there.
   ========================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('protein-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var AGGREGATE = canvas.getAttribute('data-mode') === 'aggregate';
  var SPARSE = canvas.hasAttribute('data-sparse');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Secondary structure of ubiquitin, one letter per residue: E strand, H/G helix, L loop.
  var SS = 'EEEEEEELLEEEEEEEELLLLLHHHHHHHHHHHHLLLLLEEEEEELLEEELLLLLGGGGLLLLEEEEEEEEELLLL';

  var MAX_FORCE = 0.04;      // steering acceleration cap, px/frame²
  var FOCUS_MS = 6000;       // how long a click gathers the school

  var W = 0, H = 0, dpr = 1;
  var colors = {};
  var school = [];
  var focus = null;          // {x, y, r, until}
  var running = false;
  var last = 0;

  function settings() {
    var s = Math.min(W, H), o;
    if (s < 500) o = { count: 18, scale: 0.8 };
    else if (s < 900) o = { count: 34, scale: 0.95 };
    else o = { count: 40, scale: 1.1 };
    if (SPARSE) o.count = Math.round(o.count * 0.4);
    return o;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeChain(scale) {
    var n = 6 + Math.floor(Math.random() * 5);                 // 6–10 residues
    var start = Math.floor(Math.random() * (SS.length - n));
    var z = Math.random();                                      // depth: 0 far, 1 near
    var size = scale * (0.9 + 0.9 * z);
    var x = rand(0.1, 0.9) * W, y = rand(0.1, 0.9) * H, a = rand(0, Math.PI * 2);
    var speed = rand(0.55, 1.3) * (0.8 + 0.4 * z);
    var c = {
      ss: SS.slice(start, start + n), n: n, z: z, size: size,
      gap: 5.2 * size,
      maxSpeed: speed,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      phase: Math.random() * Math.PI * 2,
      bx: new Float32Array(n), by: new Float32Array(n)
    };
    for (var i = 0; i < n; i++) {                               // laid out behind the head
      c.bx[i] = x - Math.cos(a) * c.gap * i;
      c.by[i] = y - Math.sin(a) * c.gap * i;
    }
    return c;
  }

  function limit(x, y, m) {
    var d = Math.sqrt(x * x + y * y);
    return d > m ? [x / d * m, y / d * m] : [x, y];
  }

  // ---- Steering (one boid) --------------------------------------------
  function steer(c, k) {
    var hx = c.bx[0], hy = c.by[0];
    var sepX = 0, sepY = 0, sepN = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, cohN = 0, nbrN = 0;
    var crdX = 0, crdY = 0, v, i;

    for (i = 0; i < school.length; i++) {
      var o = school[i];
      if (o === c) continue;
      var dx = hx - o.bx[0], dy = hy - o.by[0], d2 = dx * dx + dy * dy;
      if (d2 < 1600 && d2 > 0) {                                // separation < 40 px
        var d = Math.sqrt(d2);
        sepX += dx / d / d; sepY += dy / d / d; sepN++;
      }
      if (d2 < 6400) {                                          // neighbours < 80 px
        aliX += o.vx; aliY += o.vy; crdX += o.bx[0]; crdY += o.by[0]; nbrN++;
        if (d2 >= 1600) { cohX += o.bx[0]; cohY += o.by[0]; cohN++; }
      }
    }

    var ax = 0, ay = 0, cap = c.maxSpeed;
    if (sepN) { v = limit(sepX * 40, sepY * 40, MAX_FORCE * 1.6); ax += v[0]; ay += v[1]; }
    if (nbrN) {
      v = limit(aliX / nbrN - c.vx, aliY / nbrN - c.vy, MAX_FORCE); ax += v[0]; ay += v[1];
      // Cohere only to the outer ring, and less as the neighbourhood fills,
      // so groups form and drift apart instead of collapsing into one clump.
      var coh = AGGREGATE ? 1 : 1 - nbrN / 5;
      if (cohN && coh > 0) { v = limit(cohX / cohN - hx, cohY / cohN - hy, MAX_FORCE * coh); ax += v[0]; ay += v[1]; }
      if (!AGGREGATE && nbrN > 3) {                             // gentle shove out of a crowd
        var ox = hx - crdX / nbrN, oy = hy - crdY / nbrN, od = Math.sqrt(ox * ox + oy * oy) || 1e-4;
        v = limit(ox / od * c.maxSpeed - c.vx, oy / od * c.maxSpeed - c.vy, MAX_FORCE * 0.6 * Math.min((nbrN - 3) / 3, 1));
        ax += v[0]; ay += v[1];
      }
    }

    // Gather: stream toward the point, then orbit it in a shared spin.
    var f = AGGREGATE ? { x: W * 0.62, y: H * 0.58, r: 50 } : focus;
    if (f) {
      cap = c.maxSpeed * (AGGREGATE ? 0.7 : 2.2);
      var fx = f.x - hx, fy = f.y - hy, fd = Math.sqrt(fx * fx + fy * fy) || 1e-4;
      var ux = fx / fd, uy = fy / fd;
      var radial = fd > f.r ? cap : -cap * 0.4;
      v = limit(ux * radial - uy * cap * 0.7 - c.vx, uy * radial + ux * cap * 0.7 - c.vy, MAX_FORCE * 4);
      ax += v[0]; ay += v[1];
    }

    // Soft walls: turn back before the edge (chains have tails, so no wrap-around).
    var m = 70;
    if (hx < m) ax += MAX_FORCE * 2 * (m - hx) / m; else if (hx > W - m) ax -= MAX_FORCE * 2 * (hx - W + m) / m;
    if (hy < m) ay += MAX_FORCE * 2 * (m - hy) / m; else if (hy > H - m) ay -= MAX_FORCE * 2 * (hy - H + m) / m;

    c.vx += ax * k; c.vy += ay * k;
    // Never stall, never exceed the cap.
    var sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1e-4;
    var target = Math.max(cap * 0.5, Math.min(cap, sp));
    c.vx *= target / sp; c.vy *= target / sp;
  }

  // ---- Body: follow the leader ----------------------------------------
  function move(c, k, t) {
    // A sideways wiggle on the head makes the body undulate as it swims.
    var sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1e-4;
    var wig = 0.7 * Math.sin(t * 0.005 + c.phase) * sp;
    c.bx[0] += (c.vx - c.vy / sp * wig) * k;
    c.by[0] += (c.vy + c.vx / sp * wig) * k;
    for (var i = 1; i < c.n; i++) {
      var dx = c.bx[i] - c.bx[i - 1], dy = c.by[i] - c.by[i - 1];
      var d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
      // Helical residues sit closer together along the screen than strand residues.
      var gap = c.gap * (c.ss[i] === 'E' ? 1 : c.ss[i] === 'L' ? 0.9 : 0.7);
      c.bx[i] = c.bx[i - 1] + dx / d * gap;
      c.by[i] = c.by[i - 1] + dy / d * gap;
    }
  }

  // ---- Drawing --------------------------------------------------------
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    function v(name, fallback) { return s.getPropertyValue(name).trim() || fallback; }
    colors.E = v('--ss-strand', '#16687a');
    colors.H = colors.G = v('--ss-helix', '#b13a2c');
    colors.L = v('--ss-loop', '#9f968a');
    colors.backbone = v('--ss-backbone', 'rgba(110,103,89,0.32)');
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = ctx.lineJoin = 'round';
    for (var k = 0; k < school.length; k++) {                  // sorted far → near
      var c = school[k], i;
      ctx.globalAlpha = 0.35 + 0.55 * c.z;
      ctx.strokeStyle = colors.backbone;
      ctx.lineWidth = Math.max(1, 1.1 * c.size);
      ctx.beginPath();
      ctx.moveTo(c.bx[0], c.by[0]);
      for (i = 1; i < c.n - 1; i++) {
        ctx.quadraticCurveTo(c.bx[i], c.by[i], (c.bx[i] + c.bx[i + 1]) / 2, (c.by[i] + c.by[i + 1]) / 2);
      }
      ctx.lineTo(c.bx[c.n - 1], c.by[c.n - 1]);
      ctx.stroke();
      for (i = c.n - 1; i >= 0; i--) {                          // head drawn last, on top
        ctx.beginPath();
        ctx.arc(c.bx[i], c.by[i], c.size * (i === 0 ? 2.6 : 2.1 - 0.06 * i), 0, Math.PI * 2);
        ctx.fillStyle = colors[c.ss[i]];
        ctx.fill();
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
    while (school.length < s.count) school.push(makeChain(s.scale));
    school.sort(function (a, b) { return a.z - b.z; });
  }

  function frame(t) {
    if (!running) return;
    var k = last ? Math.min((t - last) / 16.67, 3) : 1;        // frame-rate independent
    last = t;
    if (focus && t > focus.until) focus = null;
    for (var i = 0; i < school.length; i++) steer(school[i], k);
    for (i = 0; i < school.length; i++) move(school[i], k, t);
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
    focus = { x: e.clientX, y: e.clientY, r: 60, until: performance.now() + FOCUS_MS };
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
