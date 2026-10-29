/* ==========================================
   Protein chain that swims after the cursor.

   Model: a chain of Cα beads. The head is pulled toward a target by a
   damped spring; every other bead keeps a fixed distance to the bead
   before it ("follow the leader" / single-pass FABRIK). Secondary
   structure only changes how the beads are drawn:
     helix  - 3.6 residues per turn  -> 100° phase step per residue
     strand - pleated, alternates side every residue (180° step)
     loop   - no offset
   ========================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('protein-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Secondary structure, head -> tail. H = helix, E = strand, L = loop.
  var SS = 'LLLHHHHHHHHHHHHLLLLEEEEEEELLLHHHHHHHHHLLLEEEEEELL'.split('');
  var N = SS.length;
  var BOND = 13;             // px between beads (stands in for 3.8 Å)
  var STIFFNESS = 0.018;     // spring constant pulling the head to the target
  var DAMPING = 0.88;        // velocity kept per frame
  var IDLE_MS = 2500;        // after this long without input, wander
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var w = 0, h = 0, dpr = 1;
  var beads = [];
  var head = { x: 0, y: 0, vx: 0, vy: 0 };
  var pointer = { x: 0, y: 0, t: -Infinity };
  var colors = {};
  var running = false;
  var t0 = performance.now();

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors.H = s.getPropertyValue('--ss-helix').trim() || '#e05a47';
    colors.E = s.getPropertyValue('--ss-strand').trim() || '#e0a526';
    colors.L = s.getPropertyValue('--ss-loop').trim() || '#7a8aa0';
    colors.backbone = s.getPropertyValue('--ss-backbone').trim() || 'rgba(120,130,150,0.35)';
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
    head.x = w * 0.7;
    head.y = h * 0.4;
    beads = [];
    for (var i = 0; i < N; i++) beads.push({ x: head.x + i * BOND, y: head.y });
  }

  // Smooth, non-repeating-looking path: a sum of incommensurate sines.
  function wander(t) {
    return {
      x: w * (0.5 + 0.32 * Math.sin(t * 0.00031) + 0.12 * Math.sin(t * 0.00087 + 1.3)),
      y: h * (0.5 + 0.30 * Math.cos(t * 0.00023) + 0.10 * Math.sin(t * 0.00113 + 0.4))
    };
  }

  function step(now) {
    var idle = now - pointer.t > IDLE_MS;
    var target = idle ? wander(now - t0) : pointer;

    // Damped spring on the head (semi-implicit Euler).
    head.vx = (head.vx + (target.x - head.x) * STIFFNESS) * DAMPING;
    head.vy = (head.vy + (target.y - head.y) * STIFFNESS) * DAMPING;
    head.x += head.vx;
    head.y += head.vy;

    beads[0].x = head.x;
    beads[0].y = head.y;

    // Distance constraint: pull each bead onto a circle of radius BOND around its predecessor.
    for (var i = 1; i < N; i++) {
      var a = beads[i - 1], b = beads[i];
      var dx = b.x - a.x, dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      b.x = a.x + dx / d * BOND;
      b.y = a.y + dy / d * BOND;
    }
  }

  // Lateral offset for drawing, perpendicular to the local chain direction.
  function drawnPoints(time) {
    var pts = [];
    for (var i = 0; i < N; i++) {
      var p = beads[i];
      var q = beads[Math.min(i + 1, N - 1)], r = beads[Math.max(i - 1, 0)];
      var tx = q.x - r.x, ty = q.y - r.y;
      var tl = Math.sqrt(tx * tx + ty * ty) || 1;
      var nx = -ty / tl, ny = tx / tl;
      var off = 0;
      if (SS[i] === 'H') off = 7 * Math.sin(i * (2 * Math.PI / 3.6) + time * 0.002);
      else if (SS[i] === 'E') off = (i % 2 ? 3 : -3);
      pts.push({ x: p.x + nx * off, y: p.y + ny * off, ss: SS[i], i: i });
    }
    return pts;
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    var pts = drawnPoints(time);

    // Backbone: quadratic curve through midpoints (smooth, passes near each bead).
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < N - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[N - 1].x, pts[N - 1].y);
    ctx.strokeStyle = colors.backbone;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Beads, tail first so the head sits on top. Taper toward the tail.
    for (var j = N - 1; j >= 0; j--) {
      var p = pts[j];
      var radius = 5.5 - 2.5 * (j / N);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors[p.ss];
      ctx.globalAlpha = 1 - 0.5 * (j / N);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    step(now);
    draw(now);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  function staticFrame() {
    // Settle the chain along the wander path, then draw it once.
    for (var k = 0; k < 600; k++) step(t0 + k * 16);
    draw(0);
  }

  function onPointer(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.t = performance.now();
  }

  init();
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', function () {
    resize();
    if (reduceMotion) staticFrame();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  document.addEventListener('themechange', function () {
    readColors();
    if (reduceMotion) staticFrame();
  });

  if (reduceMotion) staticFrame(); else start();
})();
