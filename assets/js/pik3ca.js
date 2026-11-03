// PIK3CA project page: SVG charts from assets/data/pik3ca/pik3ca.json and py2Dmol structure viewers.
// Charts are drawn with plain SVG and coloured through CSS variables, so a theme switch only needs a
// rebuild for the structure viewers (their colours are read from the same variables).
(function () {
  'use strict';

  var DATA = new URL('../data/pik3ca/', document.currentScript.src).href;
  // py2Dmol (github.com/sokrypton/py2Dmol, beer-ware licence), pinned to one commit.
  var MOL_JS = 'https://cdn.jsdelivr.net/gh/sokrypton/py2Dmol@19317016a8c8fbef0a69e2a093c686b0d13d4415/py2Dmol/resources/bundles/py2Dmol.embed.min.js';
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reference structures, in the order used by the pose charts.
  var REFS = [
    { pdb: '7PG6', ligand: 'Alpelisib', variant: 'WT', site: 'orthosteric' },
    { pdb: '8AM0', ligand: 'Inavolisib', variant: 'WT', site: 'orthosteric' },
    { pdb: '8EXL', ligand: 'Taselisib', variant: 'WT', site: 'orthosteric' },
    { pdb: '8TSD', ligand: 'RLY-2608', variant: 'WT', site: 'allosteric' },
    { pdb: '8TDU', ligand: 'STX-478', variant: 'WT', site: 'allosteric' },
    { pdb: '8TGD', ligand: 'STX-478', variant: 'H1047R', site: 'allosteric' }
  ];
  var FAMILY = {
    cofold: { label: 'Co-folding', color: '--pk-c1' },
    dock: { label: 'Docking', color: '--pk-c2' },
    rescore: { label: 'Rescoring', color: '--pk-c3' },
    seq: { label: 'Sequence only', color: '--pk-c4' }
  };
  var POSE_TOOLS = [
    { tool: 'Boltz-2', color: '--pk-c1' },
    { tool: 'DiffDock-L', color: '--pk-c2' },
    { tool: 'Protenix', color: '--pk-c3' },
    { tool: 'FlowDock', color: '--pk-c4' }
  ];

  // ---------- helpers ----------
  function svgEl(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, s, attrs) {
    var t = svgEl('text', Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function fmt(v, d) {
    return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d);
  }
  function lin(d0, d1, r0, r1) {
    return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
  }
  function logScale(d0, d1, r0, r1) {
    var a = Math.log(d0), b = Math.log(d1);
    return function (v) { return r0 + (Math.log(Math.max(v, d0)) - a) / (b - a) * (r1 - r0); };
  }
  function widthOf(node) {
    return Math.max(300, Math.round(node.clientWidth || node.getBoundingClientRect().width));
  }
  function newSvg(node, w, h) {
    node.textContent = '';
    return svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, preserveAspectRatio: 'xMinYMin meet' }, node);
  }
  function legend(node, items) {
    node.textContent = '';
    items.forEach(function (it) {
      var k = document.createElement('span');
      k.className = 'pk-key';
      var sw = document.createElement('i');
      sw.className = 'pk-sw' + (it.shape ? ' pk-sw--' + it.shape : '');
      sw.style.setProperty('--sw', it.color);
      if (it.style) sw.setAttribute('style', sw.getAttribute('style') + ';' + it.style);
      k.appendChild(sw);
      k.appendChild(document.createTextNode(it.label));
      node.appendChild(k);
    });
  }
  function setPressed(group, btn) {
    group.querySelectorAll('.pk-btn').forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  // One tooltip for the page; follows the pointer, also opens on tap.
  var tip = document.createElement('div');
  tip.className = 'pk-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  function hover(node, html) {
    function show(e) {
      tip.innerHTML = typeof html === 'function' ? html() : html;
      tip.style.left = e.clientX + 'px';
      tip.style.top = e.clientY + 'px';
      tip.classList.add('is-on');
    }
    node.addEventListener('pointerenter', show);
    node.addEventListener('pointermove', show);
    node.addEventListener('pointerleave', function () { tip.classList.remove('is-on'); });
  }
  window.addEventListener('scroll', function () { tip.classList.remove('is-on'); }, { passive: true });

  function xAxisLog(g, x, ticks, y0, y1, labelY) {
    ticks.forEach(function (t) {
      svgEl('line', { x1: x(t), x2: x(t), y1: y0, y2: y1, class: 'grid' }, g);
      text(g, x(t), labelY, String(t), { 'text-anchor': 'middle' });
    });
  }

  // ---------- chart: label matrix ----------
  var MATRIX_LABEL = {
    biochemical: 'Measured IC₅₀ / Kᵢ',
    weaker: 'Weaker binding evidence',
    negative: 'Negative control',
    excluded: 'Excluded (no usable evidence)'
  };
  function drawMatrix(node, d) {
    var m = d.matrix, W = widthOf(node);
    var left = 92, top = 58;
    var cell = Math.min(30, Math.floor((W - left) / m.variants.length));
    var w = left + cell * m.variants.length, h = top + cell * m.ligands.length + 4;
    var svg = newSvg(node, w, h);
    m.variants.forEach(function (v, j) {
      var cx = left + j * cell + cell / 2;
      text(svg, cx, top - 8, v, { transform: 'rotate(-55 ' + cx + ' ' + (top - 8) + ')', 'text-anchor': 'start', class: v === 'WT' ? 't-strong' : null });
    });
    m.ligands.forEach(function (l, i) {
      var y = top + i * cell;
      text(svg, left - 8, y + cell / 2 + 4, l, { 'text-anchor': 'end' });
      m.cells[i].forEach(function (c, j) {
        var r = svgEl('rect', { x: left + j * cell + 1, y: y + 1, width: cell - 2, height: cell - 2, rx: 2, class: 'cell c-' + c }, svg);
        hover(r, '<b>' + l + ' · ' + m.variants[j] + '</b><br>' + MATRIX_LABEL[c]);
      });
    });
  }

  // ---------- chart: tool ranking ----------
  function drawRank(node, d, metric) {
    var tools = d.tools.slice().sort(function (a, b) { return b[metric] - a[metric]; });
    var W = widthOf(node), narrow = W < 520;
    var left = narrow ? 150 : 196, right = 16, top = 24, rowH = narrow ? 24 : 26;
    var h = top + rowH * tools.length + 10;
    var svg = newSvg(node, W, h);
    var dom = metric === 'rho' ? [-1, 1] : [0, 1];
    var x = lin(dom[0], dom[1], left, W - right);
    var ticks = metric === 'rho' ? [-1, -0.5, 0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
    ticks.forEach(function (t) {
      svgEl('line', { x1: x(t), x2: x(t), y1: top - 6, y2: h - 8, class: 'grid' }, svg);
      text(svg, x(t), top - 12, metric === 'rho' ? fmt(t, 1) : t.toFixed(2), { 'text-anchor': 'middle' });
    });
    var ref = metric === 'rho' ? 0 : 0.5;
    svgEl('line', { x1: x(ref), x2: x(ref), y1: top - 6, y2: h - 8, class: 'zero' }, svg);
    if (metric === 'auroc') text(svg, x(0.5) + 4, h - 2, 'chance', { 'font-size': 10 });
    tools.forEach(function (t, i) {
      var y = top + i * rowH + rowH / 2;
      var g = svgEl('g', { class: 'row' }, svg);
      svgEl('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'row-hover' }, g);
      var name = narrow ? t.tool.replace('GatorAffinity', 'Gator').replace('DiffDock-L', 'DD-L') : t.tool;
      var lab = text(g, left - 10, y + 4, name, { 'text-anchor': 'end', class: i < 3 ? 't-strong' : null });
      if (t.post) {
        lab.textContent = '';
        var tag = svgEl('tspan', { class: 't-tag' }, lab);
        tag.textContent = 'AFTER THESIS  ';
        var nm = svgEl('tspan', {}, lab);
        nm.textContent = name;
      }
      var fam = 'f-' + t.family;
      if (metric === 'rho') svgEl('line', { x1: x(t.lo), x2: x(t.hi), y1: y, y2: y, class: 'ci ' + fam }, g);
      svgEl('circle', { cx: x(t[metric]), cy: y, r: 5.5, class: 'dot ' + fam }, g);
      if (i < 3) text(g, x(metric === 'rho' ? t.hi : t[metric]) + 9, y + 4, t[metric].toFixed(2), { class: 't-strong' });
      svgEl('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'hit' }, g);
      hover(g, '<b>' + t.tool + '</b>' + (t.post ? ' (after thesis)' : '') +
        '<br>ρ ' + t.rho.toFixed(2) + ' [' + fmt(t.lo) + ', ' + fmt(t.hi) + ']' +
        '<br>AUROC ' + t.auroc.toFixed(2) + ' · AP ' + t.ap.toFixed(2) +
        '<br>Δp ρ ' + fmt(t.dp_rho) + ' (n = 9)');
    });
  }

  // ---------- chart: mutation response ----------
  function drawDp(node, d, tool) {
    var pts = d.dp_points, W = widthOf(node);
    var stats = d.tools.filter(function (t) { return t.tool === tool; })[0];
    var h = Math.round(Math.min(380, Math.max(260, W * 0.6)));
    var m = { l: 48, r: 16, t: 28, b: 40 };
    var svg = newSvg(node, W, h);
    var ys = pts.map(function (p) { return p[tool]; });
    var yMax = Math.max(0.4, Math.max.apply(null, ys.map(Math.abs))) * 1.15;
    var x = lin(-0.3, 1.3, m.l, W - m.r), y = lin(-yMax, yMax, h - m.b, m.t);
    // Quadrants where the predicted sign matches the measured one.
    svgEl('rect', { x: x(0), y: m.t, width: x(1.3) - x(0), height: y(0) - m.t, class: 'q-ok' }, svg);
    svgEl('rect', { x: m.l, y: y(0), width: x(0) - m.l, height: h - m.b - y(0), class: 'q-ok' }, svg);
    [-0.25, 0, 0.25, 0.5, 0.75, 1, 1.25].forEach(function (t) {
      svgEl('line', { x1: x(t), x2: x(t), y1: m.t, y2: h - m.b, class: t === 0 ? 'zero' : 'grid' }, svg);
      text(svg, x(t), h - m.b + 16, fmt(t), { 'text-anchor': 'middle' });
    });
    var step = yMax > 1.2 ? 0.5 : 0.25;
    for (var t = -Math.floor(yMax / step) * step; t <= yMax; t += step) {
      t = Math.round(t * 100) / 100;
      svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? 'zero' : 'grid' }, svg);
      text(svg, m.l - 6, y(t) + 4, fmt(t), { 'text-anchor': 'end' });
    }
    text(svg, (m.l + W - m.r) / 2, h - 4, 'Measured Δp (mutant − WT, log units)', { 'text-anchor': 'middle' });
    text(svg, m.l, m.t - 10, 'Predicted change', {});
    text(svg, W - m.r, m.t - 10, 'ρ = ' + fmt(stats.dp_rho) + ' · p = ' + stats.dp_p.toFixed(2), { 'text-anchor': 'end', class: 't-strong' });
    pts.forEach(function (p) {
      var cx = x(p.exp), cy = y(p[tool]);
      var g = svgEl('g', {}, svg);
      if (p.allosteric) {
        svgEl('path', { d: 'M' + cx + ' ' + (cy - 7) + 'l7 7l-7 7l-7 -7z', class: 'dot f-rescore' }, g);
      } else {
        svgEl('circle', { cx: cx, cy: cy, r: 6, class: 'dot f-rescore' }, g);
      }
      if (Math.abs(p.exp) > 1) text(g, cx - 10, cy + 4, p.variant + ' · ' + p.ligand, { 'text-anchor': 'end', 'font-size': 10 });
      svgEl('circle', { cx: cx, cy: cy, r: 12, class: 'hit' }, g);
      hover(g, '<b>' + p.ligand + ' · ' + p.variant + '</b><br>measured ' + fmt(p.exp) + '<br>predicted ' + fmt(p[tool]));
    });
  }

  // ---------- pose charts (shared frame) ----------
  function poseFrame(node, rowH, xDom, ticks) {
    var W = widthOf(node), narrow = W < 520;
    var left = narrow ? 112 : 150, right = 18, top = 48, bottom = 8;
    var h = top + rowH * REFS.length + bottom;
    var svg = newSvg(node, W, h);
    var x = logScale(xDom[0], xDom[1], left, W - right);
    // Allosteric rows are shaded so the jump across the 2 Å line reads as a group.
    svgEl('rect', { x: 0, y: top + 3 * rowH, width: W, height: 3 * rowH, class: 'band' }, svg);
    xAxisLog(svg, x, ticks, top - 6, h - bottom, top - 14);
    svgEl('line', { x1: x(2), x2: x(2), y1: top - 6, y2: h - bottom, class: 'thresh' }, svg);
    text(svg, left, top - 34, 'Ligand RMSD to crystal (Å, log scale)', { class: 't-strong' });
    REFS.forEach(function (r, i) {
      var y = top + i * rowH + rowH / 2;
      text(svg, left - 10, y - 2, r.ligand + (r.variant !== 'WT' ? ' ' + r.variant : ''), { 'text-anchor': 'end', class: 't-strong' });
      text(svg, left - 10, y + 12, narrow ? r.pdb + ' · ' + r.site.slice(0, 4) + '.' : r.pdb + ' · ' + r.site, { 'text-anchor': 'end', 'font-size': 9.5 });
    });
    return { svg: svg, x: x, top: top, rowH: rowH };
  }

  function drawLrmsd(node, d) {
    var f = poseFrame(node, 44, [0.2, 40], [0.2, 0.5, 1, 2, 5, 10, 20, 40]);
    REFS.forEach(function (r, i) {
      var y0 = f.top + i * f.rowH + f.rowH / 2;
      POSE_TOOLS.forEach(function (pt, k) {
        var row = d.lrmsd.filter(function (q) { return q.pdb === r.pdb && q.tool === pt.tool; })[0];
        if (!row) return;
        var cx = f.x(row.lrmsd), cy = y0 + (k - 1.5) * 7;
        var g = svgEl('g', {}, f.svg);
        svgEl('circle', { cx: cx, cy: cy, r: 5.5, class: 'dot', style: 'fill:var(' + pt.color + ')' }, g);
        svgEl('circle', { cx: cx, cy: cy, r: 10, class: 'hit' }, g);
        hover(g, '<b>' + pt.tool + '</b><br>' + r.ligand + ' (' + r.pdb + ')<br>LRMSD ' + row.lrmsd.toFixed(2) + ' Å');
      });
    });
  }

  function drawTfg(node, d) {
    var f = poseFrame(node, 64, [0.1, 40], [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 40]);
    var modes = [{ mode: 'notfg', label: 'Without TFG', color: '--pk-c2', dy: -14 }, { mode: 'tfg', label: 'With TFG', color: '--pk-c1', dy: 14 }];
    REFS.forEach(function (r, i) {
      var y0 = f.top + i * f.rowH + f.rowH / 2;
      modes.forEach(function (mo) {
        var poses = d.tfg.poses.filter(function (p) { return p.mode === mo.mode && p.ligand === r.ligand && p.variant === r.variant; });
        poses.forEach(function (p, s) {
          // Seeds are spread vertically within the mode's lane so near-identical poses stay visible.
          var cx = f.x(p.lrmsd), cy = y0 + mo.dy + (s - 2) * 3.5;
          var g = svgEl('g', {}, f.svg);
          var st = p.pb ? 'fill:var(' + mo.color + ')' : 'stroke:var(' + mo.color + ')';
          svgEl('circle', { cx: cx, cy: cy, r: 5, class: 'dot' + (p.pb ? '' : ' open'), style: st }, g);
          svgEl('circle', { cx: cx, cy: cy, r: 9, class: 'hit' }, g);
          hover(g, '<b>' + mo.label + ', seed ' + p.seed + '</b><br>' + r.ligand + ' (' + r.pdb + ')<br>LRMSD ' + p.lrmsd.toFixed(2) + ' Å<br>PoseBusters ' + (p.pb ? 'pass' : 'fail'));
        });
      });
    });
  }

  // ---------- 3D viewers (py2Dmol) ----------
  // The structure files are merged into one PDB per view, with chains renamed so each part can be coloured:
  // A = protein, C = crystal ligand, P = predicted ligand. Hydrogens are dropped.
  var molReady = null;
  function loadMol() {
    if (window.py2Dmol) return Promise.resolve(window.py2Dmol);
    if (!molReady) {
      molReady = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = MOL_JS;
        s.async = true;
        s.onload = function () { window.py2Dmol ? res(window.py2Dmol) : rej(new Error('py2Dmol missing')); };
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    return molReady;
  }
  function getText(name) {
    return fetch(DATA + name).then(function (r) {
      if (!r.ok) throw new Error(name + ' ' + r.status);
      return r.text();
    });
  }
  function viewerMsg(node, s) {
    var m = node.querySelector('.pk-viewer-msg');
    if (!m) { m = document.createElement('div'); m.className = 'pk-viewer-msg'; node.appendChild(m); }
    m.textContent = s;
    m.hidden = !s;
  }
  function atoms(text, record, chain) {
    return text.split('\n').filter(function (l) {
      if (l.indexOf(record) !== 0) return false;
      var el = l.slice(76, 78).trim() || l.slice(12, 14).trim().replace(/[0-9]/g, '');
      return el !== 'H';
    }).map(function (l) { return chain ? l.slice(0, 21) + chain + l.slice(22) : l; });
  }
  // py2Dmol.show() replaces the contents of its target, so the canvas lives in its own child.
  function molHost(node) {
    var host = node.querySelector('.pk-mol');
    if (!host) { host = document.createElement('div'); host.className = 'pk-mol'; node.insertBefore(host, node.firstChild); }
    return host;
  }
  function showMol(node, pdb, opts) {
    var host = molHost(node);
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var v = window.py2Dmol.show(host, pdb, Object.assign({
      width: host.clientWidth, height: node.clientHeight,
      style: 'richardson', bg: dark ? 'black' : 'white', box: false, biounit: false, select: false, controls: false
    }, opts || {}));
    v.setClearColor(true);  // transparent canvas: the page surface shows through (bg only sets the shading base)
    return v;
  }
  function colourParts(v) {
    v.setColor(cssVar('--pk-cartoon'), 'A');
    v.setColor(cssVar('--pk-c1'), 'C');
    v.setColor(cssVar('--pk-c2'), 'P');
    v.hideElements({ type: 'L' });
  }
  // Rebuild on theme change and on a real width change; py2Dmol takes its colours and size at show().
  function rebuildOn(node, build) {
    var w = node.clientWidth, t;
    document.addEventListener('themechange', build);
    window.addEventListener('resize', function () {
      if (node.clientWidth === w) return;
      w = node.clientWidth;
      clearTimeout(t);
      t = setTimeout(build, 200);
    });
  }

  function initRly(wrap) {
    var node = wrap.querySelector('.pk-viewer');
    viewerMsg(node, 'Loading structures…');
    return Promise.all([getText('8tsd_crystal.pdb'), getText('rly2608_boltz2.pdb')]).then(function (txt) {
      viewerMsg(node, '');
      var prot = atoms(txt[0], 'ATOM', 'A').filter(function (l) { return l[21] === 'A'; });
      var pdb = prot.concat(['TER'], atoms(txt[0], 'HETATM', 'C'), atoms(txt[1], 'HETATM', 'P'), ['END']).join('\n');
      var v;
      function build() {
        v = showMol(node, pdb);
        colourParts(v);
        home();
      }
      function home() {
        v.orient({ near: { type: 'L' }, angstroms: 14 }, { animate: false });
        v.clip({ near: { type: 'L' }, angstroms: 4 });  // a slab through both pockets, refitted as the reader turns it
      }
      build();
      wrap.querySelector('[data-action="reset"]').addEventListener('click', home);
      rebuildOn(node, build);
    });
  }

  function initTraj(wrap, d) {
    var node = wrap.querySelector('.pk-viewer');
    var v = null, pdb = null, n = 0, cur = 0, timer = null, playing = !reduceMotion, info = null;
    var scrub = wrap.querySelector('.pk-scrub'), playBtn = wrap.querySelector('[data-action="play"]');
    var outStep = wrap.querySelector('[data-out="step"]'), outDist = wrap.querySelector('[data-out="dist"]');
    var spark = wrap.querySelector('[data-chart="spark"]');
    var cache = {};

    // One model per sampling step: pocket (A) + FlowDock ligand (P) + the crystal ligand (C), repeated so it stays put.
    function merge(traj, crystal) {
      var ref = atoms(crystal, 'HETATM', 'C');
      var models = traj.split('ENDMDL').filter(function (b) { return b.indexOf('ATOM') !== -1; });
      return {
        n: models.length,
        text: models.map(function (b, i) {
          return ['MODEL ' + String(i + 1).padStart(8)].concat(atoms(b, 'ATOM', 'A'), ['TER'], atoms(b, 'HETATM', 'P'), ref, ['ENDMDL']).join('\n');
        }).join('\n') + '\nEND'
      };
    }
    function build() {
      if (!pdb) return;
      v = showMol(node, pdb.text, { style: 'tube', play: false, rendering: { width: 1.2 } });
      colourParts(v);
      try { v.showSidechains({ chain: 'A' }); v.setSidechainColor(cssVar('--pk-pocket'), { chain: 'A' }); } catch (e) { /* C-alpha only */ }
      v.orient({ type: 'L' });
      v.setFrame(cur);
      drawSpark();
    }
    function show(i) {
      if (i === cur) return;
      cur = i;
      v.setFrame(cur);
      readout();
    }
    function readout() {
      scrub.value = cur;
      outStep.textContent = 'step ' + (cur + 1) + '/' + n;
      outDist.textContent = info.dist[cur].toFixed(1) + ' Å';
      var dot = spark.querySelector('.now');
      if (dot) { dot.setAttribute('cx', sparkX(cur)); dot.setAttribute('cy', sparkY(info.dist[cur])); }
    }
    var sparkX, sparkY;
    function drawSpark() {
      var W = widthOf(spark), h = 54, l = 34, r = 8;
      var max = Math.max.apply(null, info.dist);
      sparkX = lin(0, info.dist.length - 1, l, W - r);
      sparkY = lin(0, Math.ceil(max / 5) * 5, h - 6, 6);
      var svg = newSvg(spark, W, h);
      [0, Math.ceil(max / 5) * 5].forEach(function (t) {
        svgEl('line', { x1: l, x2: W - r, y1: sparkY(t), y2: sparkY(t), class: 'grid' }, svg);
        text(svg, l - 6, sparkY(t) + 3, t + ' Å', { 'text-anchor': 'end' });
      });
      svgEl('polyline', { points: info.dist.map(function (dv, i) { return sparkX(i) + ',' + sparkY(dv); }).join(' '), class: 'line' }, svg);
      svgEl('circle', { cx: sparkX(cur), cy: sparkY(info.dist[cur]), r: 4.5, class: 'now' }, svg);
    }
    function tick() {
      var next = cur + 1;
      if (next >= n) {
        timer = setTimeout(function () { show(0); timer = setTimeout(tick, 220); }, 1400);
        return;
      }
      show(next);
      timer = setTimeout(tick, next === n - 1 ? 1400 : 170);
    }
    function setPlaying(on) {
      playing = on;
      clearTimeout(timer);
      playBtn.textContent = on ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      if (on) timer = setTimeout(tick, 200);
    }
    function load(pair) {
      clearTimeout(timer);
      info = d.flowdock_traj.filter(function (t) { return t.pair === pair; })[0];
      viewerMsg(node, 'Loading trajectory…');
      var get = cache[pair] || (cache[pair] = Promise.all([getText('flowdock/' + pair + '.pdb'), getText('flowdock/' + pair + '_crystal.pdb')])
        .then(function (txt) { return merge(txt[0], txt[1]); }));
      return get.then(function (m) {
        viewerMsg(node, '');
        pdb = m;
        n = m.n;
        scrub.max = n - 1;
        cur = playing ? 0 : n - 1;
        build();
        readout();
        if (playing) setPlaying(true);
      });
    }

    wrap.querySelectorAll('[data-traj]').forEach(function (b) {
      b.addEventListener('click', function () {
        setPressed(b.parentNode, b);
        load(b.dataset.traj);
      });
    });
    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    scrub.addEventListener('input', function () {
      if (playing) setPlaying(false);
      show(+scrub.value);
    });
    rebuildOn(node, build);
    playBtn.textContent = playing ? 'Pause' : 'Play';
    return load(wrap.querySelector('[data-traj].is-on').dataset.traj);
  }

  // Load py2Dmol only when a viewer is about to scroll into view.
  function whenNear(node, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: '400px 0px' });
    io.observe(node);
  }
  function startViewer(wrap, init) {
    var node = wrap.querySelector('.pk-viewer');
    whenNear(wrap, function () {
      loadMol().then(function () { return init(wrap); })
        .catch(function (e) { console.error(e); viewerMsg(node, 'The 3D view could not load.'); });
    });
  }

  // ---------- boot ----------
  fetch(DATA + 'pik3ca.json').then(function (r) { return r.json(); }).then(function (d) {
    var state = { metric: 'rho', tool: 'CheapNet | Boltz-2' };
    var q = function (s) { return document.querySelector(s); };

    function drawAll() {
      drawMatrix(q('[data-chart="matrix"]'), d);
      drawRank(q('[data-chart="rank"]'), d, state.metric);
      drawDp(q('[data-chart="dp"]'), d, state.tool);
      drawLrmsd(q('[data-chart="lrmsd"]'), d);
      drawTfg(q('[data-chart="tfg"]'), d);
    }

    var counts = {};
    d.matrix.cells.forEach(function (row) { row.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; }); });
    legend(q('[data-legend="matrix"]'), [
      { label: MATRIX_LABEL.biochemical + ' (' + counts.biochemical + ')', color: 'var(--pk-c1)' },
      { label: MATRIX_LABEL.weaker + ' (' + counts.weaker + ')', color: 'var(--pk-c1-soft)', style: 'box-shadow: inset 0 0 0 1px var(--pk-c1)' },
      { label: MATRIX_LABEL.negative + ' (' + counts.negative + ')', color: 'var(--pk-c2-soft)' },
      { label: 'Excluded (' + counts.excluded + ')', color: 'var(--surface)', style: 'box-shadow: inset 0 0 0 1px var(--line)' }
    ]);
    legend(q('[data-legend="family"]'), Object.keys(FAMILY).map(function (k) {
      return { label: FAMILY[k].label, color: 'var(' + FAMILY[k].color + ')', shape: 'dot' };
    }));
    legend(q('[data-legend="pose"]'), POSE_TOOLS.map(function (p) {
      return { label: p.tool, color: 'var(' + p.color + ')', shape: 'dot' };
    }));
    legend(q('[data-legend="tfg"]'), [
      { label: 'Without TFG', color: 'var(--pk-c2)', shape: 'dot' },
      { label: 'With TFG', color: 'var(--pk-c1)', shape: 'dot' },
      { label: 'Fails PoseBusters', color: 'var(--ink-soft)', shape: 'ring' }
    ]);

    q('#chart-rank').querySelectorAll('[data-metric]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.metric = b.dataset.metric;
        setPressed(b.parentNode, b);
        drawRank(q('[data-chart="rank"]'), d, state.metric);
      });
    });
    q('#chart-dp').querySelectorAll('[data-tool]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.tool = b.dataset.tool;
        setPressed(b.parentNode, b);
        drawDp(q('[data-chart="dp"]'), d, state.tool);
      });
    });

    drawAll();
    var lastW = window.innerWidth, rt;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(drawAll, 150);
    });

    startViewer(q('#viewer-rly'), initRly);
    startViewer(q('#viewer-traj'), function (wrap) { return initTraj(wrap, d); });
  });
})();
