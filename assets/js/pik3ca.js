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
    seq: { label: 'Sequence in, no pose', color: '--pk-c4' }
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
    var cell = Math.min(24, Math.floor((W - left) / m.variants.length));
    var w = left + cell * m.variants.length, h = top + cell * m.ligands.length + 4;
    var svg = newSvg(node, w, h);
    svg.style.maxWidth = w + 'px';
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
  // Both affinity rescorers on one chart: colour is the tool, shape is the ligand type, and a line joins each pair of predictions.
  var DP_TOOLS = [
    { tool: 'CheapNet | Boltz-2', short: 'CheapNet', color: '--pk-c1', dx: -5 },
    { tool: 'GatorAffinity | Boltz-2', short: 'GatorAffinity', color: '--pk-c3', dx: 5 }
  ];
  function drawDp(node, d, hidden) {
    var pts = d.dp_points, W = widthOf(node);
    var shown = DP_TOOLS.filter(function (t) { return !hidden[t.tool]; });
    var h = Math.round(Math.min(380, Math.max(260, W * 0.6)));
    var m = { l: 48, r: 16, t: 28, b: 40 };
    var svg = newSvg(node, W, h);
    var all = [];
    pts.forEach(function (p) { DP_TOOLS.forEach(function (t) { all.push(Math.abs(p[t.tool])); }); });
    var yMax = Math.max(0.4, Math.max.apply(null, all)) * 1.15;  // one scale for both tools
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
    pts.forEach(function (p) {
      var cx = x(p.exp), g = svgEl('g', {}, svg);
      if (shown.length > 1) svgEl('line', { x1: cx, x2: cx, y1: y(p[shown[0].tool]), y2: y(p[shown[1].tool]), class: 'dp-link' }, g);
      shown.forEach(function (tl) {
        var mx = shown.length > 1 ? cx + tl.dx : cx, my = y(p[tl.tool]), st = 'fill:var(' + tl.color + ')';
        if (p.allosteric) svgEl('path', { d: 'M' + mx + ' ' + (my - 7.5) + 'l7.5 7.5l-7.5 7.5l-7.5 -7.5z', class: 'dot', style: st }, g);
        else svgEl('circle', { cx: mx, cy: my, r: 6, class: 'dot', style: st }, g);
      });
      if (Math.abs(p.exp) > 1) {
        var top = Math.min.apply(null, shown.map(function (tl) { return y(p[tl.tool]); }));
        text(g, cx - 14, top + 4, p.variant + ' · ' + p.ligand, { 'text-anchor': 'end', 'font-size': 10 });
      }
      svgEl('rect', { x: cx - 14, y: m.t, width: 28, height: h - m.t - m.b, class: 'hit' }, g);
      hover(g, function () {
        return '<b>' + p.ligand + ' · ' + p.variant + '</b><br>measured ' + fmt(p.exp) + shown.map(function (tl) {
          return '<br>' + tl.short + ' ' + fmt(p[tl.tool]);
        }).join('');
      });
    });
  }
  function dpLegend(node, d, hidden, onToggle) {
    node.textContent = '';
    DP_TOOLS.forEach(function (tl) {
      var st = d.tools.filter(function (t) { return t.tool === tl.tool; })[0];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pk-tool' + (hidden[tl.tool] ? '' : ' is-on');
      b.setAttribute('aria-pressed', hidden[tl.tool] ? 'false' : 'true');
      b.innerHTML = '<i class="pk-sw" style="--sw: var(' + tl.color + ')"></i>' + tl.short + '<span>ρ = ' + fmt(st.dp_rho) + ' · p = ' + st.dp_p.toFixed(2) + '</span>';
      b.addEventListener('click', function () { onToggle(tl.tool); });
      node.appendChild(b);
    });
  }

  // ---------- charts: ligand similarity ----------
  var SUBTYPE = {
    'PI3Ka orthosteric': { label: 'PI3Kα orthosteric', color: '--pk-c1', shape: 'circle' },
    'PI3Ka allosteric': { label: 'PI3Kα allosteric', color: '--pk-c2', shape: 'diamond' },
    'Pan-PI3K': { label: 'Pan-PI3K', color: '--pk-c3', shape: 'square' },
    'PI3Kd/g selective': { label: 'PI3Kδ/γ-selective', color: '--pk-c4', shape: 'triangle' },
    'Kinase decoy': { label: 'Kinase decoy', color: '--ink-soft', shape: 'plus' },
    'Easy decoy': { label: 'Non-kinase decoy', color: '--ink-soft', shape: 'cross' }
  };
  function marker(parent, shape, cx, cy, r, style) {
    var d;
    if (shape === 'circle') return svgEl('circle', { cx: cx, cy: cy, r: r, class: 'dot', style: style }, parent);
    if (shape === 'square') d = 'M' + (cx - r) + ' ' + (cy - r) + 'h' + 2 * r + 'v' + 2 * r + 'h' + -2 * r + 'z';
    if (shape === 'diamond') d = 'M' + cx + ' ' + (cy - r * 1.25) + 'l' + r * 1.25 + ' ' + r * 1.25 + 'l' + -r * 1.25 + ' ' + r * 1.25 + 'l' + -r * 1.25 + ' ' + -r * 1.25 + 'z';
    if (shape === 'triangle') d = 'M' + cx + ' ' + (cy - r * 1.2) + 'L' + (cx + r * 1.15) + ' ' + (cy + r * 0.9) + 'L' + (cx - r * 1.15) + ' ' + (cy + r * 0.9) + 'z';
    if (shape === 'plus') d = 'M' + (cx - r) + ' ' + cy + 'h' + 2 * r + 'M' + cx + ' ' + (cy - r) + 'v' + 2 * r;
    if (shape === 'cross') d = 'M' + (cx - r * 0.8) + ' ' + (cy - r * 0.8) + 'l' + 1.6 * r + ' ' + 1.6 * r + 'M' + (cx + r * 0.8) + ' ' + (cy - r * 0.8) + 'l' + -1.6 * r + ' ' + 1.6 * r;
    var stroke = shape === 'plus' || shape === 'cross';
    return svgEl('path', { d: d, class: stroke ? 'mark-line' : 'dot', style: style }, parent);
  }

  // The heatmap and the scatter highlight each other: hovering a cell, a label or a point lights the same ligand(s) in both.
  var SIM = { rows: [], cols: [], pts: {} };
  function simLink(a, b) {
    var fig = document.getElementById('chart-similarity');
    if (!fig) return;
    var names = [a, b].filter(Boolean);
    fig.classList.toggle('has-lk', names.length > 0);
    Object.keys(SIM.pts).forEach(function (k) { SIM.pts[k].classList.toggle('is-lk', names.indexOf(k) >= 0); });
    SIM.rows.forEach(function (t) { t.node.classList.toggle('is-lk', t.name === a); });
    SIM.cols.forEach(function (t) { t.node.classList.toggle('is-lk', t.name === b); });
  }

  function drawTanimoto(node, d) {
    var s = d.similarity, n = s.ligands.length, W = widthOf(node);
    var left = 96, top = 92;
    var cell = Math.min(26, Math.floor((W - left - 4) / n));
    var w = left + cell * n + 4, h = top + cell * n + 4;
    var svg = newSvg(node, w, h);
    svg.style.maxWidth = w + 'px';
    var breaks = [4, 6, 10, 13];  // class boundaries: orthosteric | allosteric | pan-PI3K | δ/γ | decoys
    SIM.rows = []; SIM.cols = [];
    s.ligands.forEach(function (l, j) {
      var cx = left + j * cell + cell / 2;
      var t = text(svg, cx, top - 6, l, { transform: 'rotate(-55 ' + cx + ' ' + (top - 6) + ')', 'font-size': 10, class: 'lk-label' });
      SIM.cols.push({ name: l, node: t });
      t.addEventListener('pointerenter', function () { simLink(l, l); });
      t.addEventListener('pointerleave', function () { simLink(null, null); });
    });
    s.ligands.forEach(function (a, i) {
      var y = top + i * cell;
      var t = text(svg, left - 7, y + cell / 2 + 3.5, a, { 'text-anchor': 'end', 'font-size': 10, class: 'lk-label' });
      SIM.rows.push({ name: a, node: t });
      t.addEventListener('pointerenter', function () { simLink(a, a); });
      t.addEventListener('pointerleave', function () { simLink(null, null); });
      s.ligands.forEach(function (b, j) {
        var v = s.matrix[i][j];
        var r = svgEl('rect', {
          x: left + j * cell + 0.5, y: y + 0.5, width: cell - 1, height: cell - 1,
          class: i === j ? 'cell c-excluded' : 'cell',
          style: i === j ? null : 'fill:var(--pk-c3);fill-opacity:' + Math.min(1, 0.06 + v / 0.55).toFixed(3)
        }, svg);
        if (i !== j) {
          hover(r, '<b>' + a + ' · ' + b + '</b><br>Tanimoto ' + v.toFixed(2));
          r.addEventListener('pointerenter', function () { simLink(a, b); });
          r.addEventListener('pointerleave', function () { simLink(null, null); });
        }
      });
    });
    breaks.forEach(function (k) {
      svgEl('line', { x1: left + k * cell, x2: left + k * cell, y1: top, y2: top + n * cell, class: 'divider' }, svg);
      svgEl('line', { x1: left, x2: left + n * cell, y1: top + k * cell, y2: top + k * cell, class: 'divider' }, svg);
    });
  }

  function drawPca(node, d) {
    var s = d.similarity, W = widthOf(node);
    var h = Math.round(Math.min(360, Math.max(280, W * 0.6)));
    var m = { l: 40, r: 12, t: 12, b: 40 };
    var svg = newSvg(node, W, h);
    var x = lin(-0.55, 0.75, m.l, W - m.r), y = lin(-0.45, 0.7, h - m.b, m.t);
    [-0.4, -0.2, 0, 0.2, 0.4, 0.6].forEach(function (t) {
      svgEl('line', { x1: x(t), x2: x(t), y1: m.t, y2: h - m.b, class: t === 0 ? 'zero' : 'grid' }, svg);
      text(svg, x(t), h - m.b + 15, fmt(t, 1), { 'text-anchor': 'middle' });
    });
    [-0.4, -0.2, 0, 0.2, 0.4, 0.6].forEach(function (t) {
      svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? 'zero' : 'grid' }, svg);
      text(svg, m.l - 6, y(t) + 4, fmt(t, 1), { 'text-anchor': 'end' });
    });
    text(svg, (m.l + W - m.r) / 2, h - 4, 'PC1 (' + s.var[0] + '%)', { 'text-anchor': 'middle' });
    text(svg, m.l + 4, m.t + 10, 'PC2 (' + s.var[1] + '%)', {});
    SIM.pts = {};
    s.pca.forEach(function (p) {
      var st = SUBTYPE[p.subtype], cx = x(p.x), cy = y(p.y);
      var g = svgEl('g', { class: 'lk-pt' }, svg);
      SIM.pts[p.ligand] = g;
      var col = 'var(' + st.color + ')';
      marker(g, st.shape, cx, cy, 5.5, st.shape === 'plus' || st.shape === 'cross' ? 'stroke:' + col : 'fill:' + col);
      // Only the PI3Kα series is always named; every other label appears when its point is lit. RLY-2608 and STX-478 sit
      // almost on top of each other, so one label goes below.
      text(g, cx + 8, cy + (p.ligand === 'STX-478' ? 15 : 3.5), p.ligand, { 'font-size': 10, class: /PI3Ka/.test(p.subtype) ? 'lk-name always' : 'lk-name' });
      svgEl('circle', { cx: cx, cy: cy, r: 11, class: 'hit' }, g);
      hover(g, '<b>' + p.ligand + '</b><br>' + st.label + '<br>PC1 ' + fmt(p.x) + ' · PC2 ' + fmt(p.y));
      g.addEventListener('pointerenter', function () { simLink(p.ligand, p.ligand); });
      g.addEventListener('pointerleave', function () { simLink(null, null); });
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
    var f = poseFrame(node, 72, [0.1, 40], [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 40]);
    var modes = [{ mode: 'notfg', label: 'Without TFG', color: '--pk-c2', dy: -18 }, { mode: 'tfg', label: 'With TFG', color: '--pk-c1', dy: 18 }];
    text(f.svg, f.x(2) - 6, f.top - 1, '← crystal-like', { 'text-anchor': 'end', 'font-size': 9.5, class: 'tfg-note' });
    REFS.forEach(function (r, i) {
      var y0 = f.top + i * f.rowH + f.rowH / 2;
      modes.forEach(function (mo) {
        var poses = d.tfg.poses.filter(function (p) { return p.mode === mo.mode && p.ligand === r.ligand && p.variant === r.variant; })
          .sort(function (p, q) { return p.lrmsd - q.lrmsd; });
        // Seeds with near-identical RMSD are fanned out vertically within the mode's lane so every dot shows.
        var placed = [], offs = [0, -7, 7, -14, 14];
        poses.forEach(function (p) {
          var cx = f.x(p.lrmsd), cy = y0 + mo.dy;
          for (var o = 0; o < offs.length; o++) {
            var free = placed.every(function (q) { return Math.abs(q.cx - cx) >= 9 || Math.abs(q.cy - (y0 + mo.dy + offs[o])) >= 7; });
            if (free) { cy = y0 + mo.dy + offs[o]; break; }
          }
          placed.push({ cx: cx, cy: cy });
          var g = svgEl('g', {}, f.svg);
          var st = p.pb ? 'fill:var(' + mo.color + ')' : 'stroke:var(' + mo.color + ')';
          svgEl('circle', { cx: cx, cy: cy, r: p.pb ? 4.8 : 4.4, class: 'dot' + (p.pb ? '' : ' open tfg-fail'), style: st }, g);
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
  // Zoom-out limit: a viewer can be zoomed out no further than its whole protein. The viewer animates its zoom, so the
  // clamp runs a few times after each wheel or pinch; at the limit the view recentres on the protein.
  function setZoomLimit(node, min, center) { node._lim = { min: min, center: center }; }
  // The zoom at which a point cloud, seen along the viewer's current rotation and centred on c, just fits the viewer. The
  // viewer scales its view to the tighter of width and height from its fitted extent, so work from that.
  function fitZoom(node, v, pts, c) {
    var st = v.viewerState, R = st.rotation, asp = st.extentAspect || { x: 1, y: 1 }, ext = st.extent;
    if (!ext || !R) return null;
    var hw = 1, hh = 1;
    pts.forEach(function (q) {
      var d = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
      hw = Math.max(hw, Math.abs(dot3(d, R[0]))); hh = Math.max(hh, Math.abs(dot3(d, R[1])));
    });
    var W = node.clientWidth, H = node.clientHeight;
    var base = Math.min((W / 2) / (ext * asp.x), (H / 2) / (ext * asp.y));
    return 0.92 * Math.min((W / 2) / (hw * base), (H / 2) / (hh * base));
  }
  function clampZoom(node) {
    var v = node._mol, L = node._lim;
    if (!v || !L || !v.viewerState || !(v.viewerState.zoom < L.min)) return;
    v.viewerState.zoom = L.min;
    if (L.center) v.viewerState.center = { x: L.center.x, y: L.center.y, z: L.center.z };
    v.render('zoom limit');
  }
  function clampSoon(node) { [0, 70, 160, 320, 600].forEach(function (ms) { setTimeout(function () { clampZoom(node); }, ms); }); }
  // py2Dmol.show() replaces the contents of its target, so the canvas lives in its own child.
  function molHost(node) {
    var host = node.querySelector('.pk-mol');
    if (!host) {
      host = document.createElement('div'); host.className = 'pk-mol'; node.insertBefore(host, node.firstChild);
      // Scrolling over a viewer zooms it. The viewer itself only zooms on Ctrl/Cmd + scroll (which is also what a trackpad
      // pinch sends), so a plain wheel is turned into that and the page is kept from scrolling underneath.
      node.addEventListener('wheel', function (e) {
        clampSoon(node);
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        e.stopPropagation();
        var c = node.querySelector('canvas');
        if (!c) return;
        c.dispatchEvent(new WheelEvent('wheel', {
          deltaY: e.deltaY, deltaMode: e.deltaMode, ctrlKey: true, clientX: e.clientX, clientY: e.clientY,
          bubbles: true, cancelable: true
        }));
      }, { capture: true, passive: false });
      node.addEventListener('touchend', function () { clampSoon(node); }, { passive: true });
    }
    return host;
  }
  function wrapId(node) {
    var f = node.closest('figure');
    return 'pk-' + (f && f.id ? f.id : 'viewer');
  }
  function showMol(node, pdb, opts) {
    var host = molHost(node);
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var v = window.py2Dmol.show(host, pdb, Object.assign({
      width: host.clientWidth, height: node.clientHeight,
      style: 'richardson', bg: dark ? 'black' : 'white', box: false, biounit: false, select: false, controls: false,
      name: wrapId(node)  // py2Dmol keeps colours per object name across viewers; the default "structure" would be shared
    }, opts || {}));
    node._mol = v;
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

  // Pose explorer: one reference structure at a time, every tool's top pose fitted into its frame
  // (assets/data/pik3ca/poses, built by PIK3K_bench/scripts/audit/build_pose_views.py).
  // Chains: A protein, C crystal ligand, O ATP-site marker (alpelisib from 7PG6), then one chain per tool.
  var POSE_CHAIN = { 'Boltz-2': 'B', 'DiffDock-L': 'D', 'Protenix': 'X', 'FlowDock': 'F' };
  var poseMeta = null;
  // Principal axes of a point cloud (Jacobi on the covariance), longest first: { c: centroid, axes: [e1, e2, e3] }.
  function pcaAxes(pts) {
    var c = [0, 0, 0], i, j, k;
    pts.forEach(function (p) { for (i = 0; i < 3; i++) c[i] += p[i] / pts.length; });
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    pts.forEach(function (p) { for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) C[i][j] += (p[i] - c[i]) * (p[j] - c[j]); });
    var V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (var sweep = 0; sweep < 30; sweep++) {
      for (i = 0; i < 2; i++) for (j = i + 1; j < 3; j++) {
        if (Math.abs(C[i][j]) < 1e-9) continue;
        var th = 0.5 * Math.atan2(2 * C[i][j], C[j][j] - C[i][i]), cs = Math.cos(th), sn = Math.sin(th);
        for (k = 0; k < 3; k++) { var a1 = C[k][i], a2 = C[k][j]; C[k][i] = cs * a1 - sn * a2; C[k][j] = sn * a1 + cs * a2; }
        for (k = 0; k < 3; k++) { var b1 = C[i][k], b2 = C[j][k]; C[i][k] = cs * b1 - sn * b2; C[j][k] = sn * b1 + cs * b2; }
        for (k = 0; k < 3; k++) { var v1 = V[k][i], v2 = V[k][j]; V[k][i] = cs * v1 - sn * v2; V[k][j] = sn * v1 + cs * v2; }
      }
    }
    var ev = [0, 1, 2].map(function (q) { return { val: C[q][q], vec: [V[0][q], V[1][q], V[2][q]] }; })
      .sort(function (p, q) { return q.val - p.val; });
    return { c: c, axes: ev.map(function (e) { return e.vec; }) };
  }
  function dot3(u, w) { return u[0] * w[0] + u[1] * w[1] + u[2] * w[2]; }
  function cross3(u, w) { return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; }

  var POSE_ZOOM = 0.5;  // same for every structure; 1 = tight on the ligands, lower leaves more of the pocket around them
  function initPoses(wrap) {
    var node = wrap.querySelector('.pk-viewer');
    var refBtns = wrap.querySelectorAll('[data-ref]'), toolBtns = wrap.querySelectorAll('[data-show]');
    var readout = wrap.querySelector('[data-out="lrmsd"]');
    var cache = {}, v = null, ref = wrap.querySelector('[data-ref].is-on').dataset.ref, text = null;
    var on = {};
    toolBtns.forEach(function (b) { on[b.dataset.show] = b.getAttribute('aria-pressed') === 'true'; });

    function chainOf(key) { return POSE_CHAIN[key] || key; }
    function present(key) {
      if (key === 'O') return poseMeta[ref].site === 'allosteric';
      return key in poseMeta[ref].lrmsd;
    }
    function colour() {
      v.setColor(cssVar('--pk-cartoon'), 'A');
      v.setColor(cssVar('--ink'), 'C');
      v.setColor(cssVar('--pk-pocket'), 'O');
      POSE_TOOLS.forEach(function (t) { v.setColor(cssVar(t.color), POSE_CHAIN[t.tool]); });
      v.hideElements({ type: 'L' });
    }
    function apply() {
      toolBtns.forEach(function (b) {
        var key = b.dataset.show, has = present(key);
        b.disabled = !has;
        b.setAttribute('aria-pressed', on[key] && has ? 'true' : 'false');
        b.classList.toggle('is-on', on[key] && has);
        if (!v || !has) return;
        if (on[key]) v.show({ chain: chainOf(key) }); else v.hide({ chain: chainOf(key) });
      });
      var parts = Object.keys(poseMeta[ref].lrmsd).filter(function (t) { return on[t]; })
        .map(function (t) { return t + ' ' + poseMeta[ref].lrmsd[t].toFixed(1) + ' Å'; });
      readout.textContent = parts.length ? 'LRMSD to crystal: ' + parts.join(' · ') : '';
    }
    // Camera for the ligands: look from outside the protein, along the line from the protein's centre through the ligands,
    // so the pocket opens toward the reader. On screen, the predicted poses spread across the view with the crystal pose on
    // the right (for a compact ligand group, along the group's longest axis).
    function ligandView(clearSight) {
      var lig = [], crys = [], pred = [], cas = [], bulk = [0, 0, 0], nb = 0;
      text.split('\n').forEach(function (l) {
        var xyz = [+l.slice(30, 38), +l.slice(38, 46), +l.slice(46, 54)], rec = l.slice(0, 6);
        if (rec === 'HETATM') { lig.push(xyz); (l.slice(21, 22) === 'C' ? crys : pred).push(xyz); }
        else if (rec === 'ATOM  ' && l.slice(12, 16).trim() === 'CA') { cas.push(xyz); bulk[0] += xyz[0]; bulk[1] += xyz[1]; bulk[2] += xyz[2]; nb++; }
      });
      if (!lig.length || !nb) return null;
      var P = pcaAxes(lig);
      function mean(a) { return [0, 1, 2].map(function (i) { return a.reduce(function (t, p) { return t + p[i]; }, 0) / a.length; }); }
      function unit(u) { var n = Math.hypot(u[0], u[1], u[2]) || 1; return u.map(function (t) { return t / n; }); }
      function perp(u, z) { var d = dot3(u, z); return [u[0] - d * z[0], u[1] - d * z[1], u[2] - d * z[2]]; }
      var z = unit([P.c[0] - bulk[0] / nb, P.c[1] - bulk[1] / nb, P.c[2] - bulk[2] / nb]);
      var gap = null, x;
      if (crys.length && pred.length) {
        var cm = mean(crys), pm = mean(pred);
        gap = [cm[0] - pm[0], cm[1] - pm[1], cm[2] - pm[2]];
      }
      if (gap && Math.hypot(gap[0], gap[1], gap[2]) > 6) {
        // Far-apart crystal and predicted poses (the allosteric cases) define the horizontal.
        x = perp(gap, z);
      } else {
        // A compact ligand group (the orthosteric drugs): try many camera directions and take the one with the fewest protein
        // atoms between the reader and the ligand, preferring a view onto its flat side, so the docking pose is not hidden
        // behind helices.
        var flat = P.axes[2], bestScore = 1e9, n = 300;
        for (var i = 0; i < n; i++) {
          var yy = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - yy * yy), th = i * 2.399963;
          var d = [Math.cos(th) * rr, yy, Math.sin(th) * rr], blocked = 0;
          for (var k = 0; k < cas.length; k++) {
            var vx = cas[k][0] - P.c[0], vy = cas[k][1] - P.c[1], vz = cas[k][2] - P.c[2], t = vx * d[0] + vy * d[1] + vz * d[2];
            if (t > 3 && vx * vx + vy * vy + vz * vz - t * t < 64) blocked++;
          }
          // For idelalisib, how clear the line of sight is counts for more than facing the flat side of the ligand.
          var score = (clearSight ? 12 : 3) * blocked + (clearSight ? 12 : 40) * (1 - Math.abs(dot3(d, flat)));
          if (score < bestScore) { bestScore = score; z = d; }
        }
        x = perp(P.axes[0], z);
      }
      if (Math.hypot(x[0], x[1], x[2]) < 1e-3) x = perp(P.axes[1], z);
      x = unit(x);
      var y = cross3(z, x);
      var bc = [bulk[0] / nb, bulk[1] / nb, bulk[2] / nb];
      return { M: [x, y, z], gap: gap, protein: { c: bc, pts: cas } };
    }
    function home() {
      v.clip(null);
      v.orient({ type: 'L', animate: false });
      var lv = ligandView(wrap.id === 'viewer-idel');
      if (lv) v.viewerState.rotation = lv.M;
      v.viewerState.zoom = POSE_ZOOM;
      v.render('poses home');
      // The viewer can hand back a turned copy of the rotation it was given, so check the result and, if the crystal pose
      // ended up on the left, half-turn about the vertical axis.
      var R = v.viewerState.rotation;
      if (lv && lv.gap && dot3(lv.gap, R[0]) < 0) {
        v.viewerState.rotation = [R[0].map(function (t) { return -t; }), R[1].slice(), R[2].map(function (t) { return -t; })];
        v.render('poses home');
      }
      v.clip(null);  // no depth cut: the whole protein stays in view
      if (lv) {
        var pc = lv.protein.c, fz = fitZoom(node, v, lv.protein.pts, pc);
        if (fz) setZoomLimit(node, Math.min(POSE_ZOOM, fz), { x: pc[0], y: pc[1], z: pc[2] });
      }
    }
    function build() {
      if (!text) return;
      v = showMol(node, text);
      colour();
      apply();
      home();
    }
    function load(r) {
      ref = r;
      viewerMsg(node, 'Loading structure…');
      var get = cache[r] || (cache[r] = getText('poses/' + r + '.pdb'));
      return get.then(function (t) {
        viewerMsg(node, '');
        text = t;
        build();
      });
    }
    refBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        setPressed(b.parentNode, b);
        load(b.dataset.ref);
      });
    });
    toolBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        on[b.dataset.show] = !on[b.dataset.show];
        apply();
      });
    });
    wrap.querySelector('[data-action="reset"]').addEventListener('click', home);
    rebuildOn(node, build);
    var meta = poseMeta ? Promise.resolve(poseMeta) : fetch(DATA + 'poses/poses.json').then(function (r) { return r.json(); });
    return meta.then(function (m) { poseMeta = m; return load(ref); });
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
    // The trajectory model is the pocket only, so "the whole model" is the zoom-out limit: no further than all of its atoms.
    function zoomLimit() {
      var first = pdb.text.split('ENDMDL')[0].split('\n'), atomsXYZ = [], lig = [];
      first.forEach(function (l) {
        var xyz = [+l.slice(30, 38), +l.slice(38, 46), +l.slice(46, 54)];
        if (l.slice(0, 6) === 'ATOM  ') atomsXYZ.push(xyz); else if (l.slice(0, 6) === 'HETATM') lig.push(xyz);
      });
      if (!atomsXYZ.length || !lig.length) return;
      function centre(a) { return [0, 1, 2].map(function (i) { return a.reduce(function (t, q) { return t + q[i]; }, 0) / a.length; }); }
      var mc = centre(atomsXYZ);
      (function wait() {
        if (v.isOrientAnimating) { requestAnimationFrame(wait); return; }
        var fz = fitZoom(node, v, atomsXYZ, mc);
        if (fz) setZoomLimit(node, Math.min(1, fz), { x: mc[0], y: mc[1], z: mc[2] });
      })();
    }
    function build() {
      if (!pdb) return;
      v = showMol(node, pdb.text, { style: 'tube', play: false, rendering: { width: 1.2 } });
      colourParts(v);
      try { v.showSidechains({ chain: 'A' }); v.setSidechainColor(cssVar('--pk-pocket'), { chain: 'A' }); } catch (e) { /* C-alpha only */ }
      v.orient({ type: 'L' });
      zoomLimit();
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

  // Mutation map: full-length p110α by domain, one marker atom per mutated residue, each on its own chain
  // (assets/data/pik3ca/mutation_map.*, built by PIK3K_bench/scripts/audit/build_mutation_map.py).
  var DEPTH_SIGN = 1;
  function initMutMap(wrap) {
    var node = wrap.querySelector('.pk-viewer'), v = null, text = null, meta = null, site = null, home = null;
    var siteBtns = wrap.querySelectorAll('[data-site]');
    function residues(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
    function chainOf(resi) { return meta.sites.filter(function (s) { return s.resi === resi; })[0].chain; }
    // orient() leaves a wide margin round the whole protein; zoom in once it settles, the way Ctrl + scroll does.
    function fill() {
      if (v.isOrientAnimating) { requestAnimationFrame(fill); return; }
      var c = node.querySelector('canvas'), r = c.getBoundingClientRect();
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: -140, ctrlKey: true, bubbles: true, cancelable: true,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    }
    function build() {
      v = showMol(node, text);
      v.setColor(cssVar('--pk-cartoon'), 'A');
      meta.domains.forEach(function (dm) {
        v.setColor(cssVar('--pk-dom-' + dm.key.toLowerCase()), { chain: 'A', residues: residues(dm.first, dm.last) });
      });
      v.setColor(cssVar('--pk-mut'), { chain: meta.sites.map(function (s) { return s.chain; }) });  // one chain per marker
      meta.sites.forEach(function (s) { v.setColor(cssVar('--pk-mut'), { chain: 'A', residues: [s.resi] }); });
      look();
    }
    // Camera direction for a site: from the centre of the protein out through the marker, so the dot faces the viewer
    // instead of sitting behind the ribbon. Rows are the screen x, y and depth axes.
    function facing(resi) {
      var cx = 0, cy = 0, cz = 0, n = 0, m = null, ch = chainOf(resi);
      text.split('\n').forEach(function (l) {
        var xyz = [+l.slice(30, 38), +l.slice(38, 46), +l.slice(46, 54)];
        if (l.slice(0, 4) === 'ATOM' && l.slice(12, 16).trim() === 'CA') { cx += xyz[0]; cy += xyz[1]; cz += xyz[2]; n++; }
        else if (l.slice(0, 6) === 'HETATM' && l.slice(21, 22) === ch) m = xyz;
      });
      if (!n || !m) return null;
      facing.marker = { x: m[0], y: m[1], z: m[2] };
      var z = [m[0] - cx / n, m[1] - cy / n, m[2] - cz / n], zl = Math.hypot(z[0], z[1], z[2]);
      z = z.map(function (c) { return DEPTH_SIGN * c / zl; });
      var up = Math.abs(z[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
      var x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]], xl = Math.hypot(x[0], x[1], x[2]);
      x = x.map(function (c) { return c / xl; });
      var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
      return [x, y, z];
    }
    function look() {
      // Light depth trim: drops only the chains well in front of or behind the picked dot.
      v.clip(site ? { near: { chain: chainOf(site) }, angstroms: 36 } : null);
      if (site) {
        v.orient({ near: { chain: chainOf(site) }, angstroms: 12 });
        var M = facing(site);
        if (M && v._orientAnim) { v._orientAnim.targetMatrix = M; v._orientAnim.targetCenter = facing.marker; }
      }
      else {
        v.orient({ chain: 'A' });
        if (v._orientAnim) {
          home = home || overview();
          v._orientAnim.targetMatrix = home.M;
          v._orientAnim.targetCenter = home.center;
        }
        fill();
        // The overview is the zoom-out limit: scrolling out stops at the whole protein.
        setTimeout(function () { if (!site) setZoomLimit(node, v.viewerState.zoom * 0.92, v.viewerState.center); }, 1100);
      }
    }
    // Overview rotation: look down the thinnest axis of the protein (principal axes of the CA atoms), with the
    // adaptor-binding domain at the top and the kinase domain on the left, so reset is the same view every time.
    function overview() {
      var ca = [], c = [0, 0, 0], i, j, k;
      text.split('\n').forEach(function (l) {
        if (l.slice(0, 4) === 'ATOM' && l.slice(12, 16).trim() === 'CA' && l.slice(21, 22) === 'A')
          ca.push([+l.slice(30, 38), +l.slice(38, 46), +l.slice(46, 54), +l.slice(22, 26)]);
      });
      ca.forEach(function (p) { for (i = 0; i < 3; i++) c[i] += p[i] / ca.length; });
      var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      ca.forEach(function (p) { for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) C[i][j] += (p[i] - c[i]) * (p[j] - c[j]); });
      var V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];  // Jacobi eigenvectors (columns)
      for (var sweep = 0; sweep < 30; sweep++) {
        for (i = 0; i < 2; i++) for (j = i + 1; j < 3; j++) {
          if (Math.abs(C[i][j]) < 1e-9) continue;
          var th = 0.5 * Math.atan2(2 * C[i][j], C[j][j] - C[i][i]), cs = Math.cos(th), sn = Math.sin(th);
          for (k = 0; k < 3; k++) { var a1 = C[k][i], a2 = C[k][j]; C[k][i] = cs * a1 - sn * a2; C[k][j] = sn * a1 + cs * a2; }
          for (k = 0; k < 3; k++) { var b1 = C[i][k], b2 = C[j][k]; C[i][k] = cs * b1 - sn * b2; C[j][k] = sn * b1 + cs * b2; }
          for (k = 0; k < 3; k++) { var v1 = V[k][i], v2 = V[k][j]; V[k][i] = cs * v1 - sn * v2; V[k][j] = sn * v1 + cs * v2; }
        }
      }
      var ev = [0, 1, 2].map(function (q) { return { val: C[q][q], vec: [V[0][q], V[1][q], V[2][q]] }; })
        .sort(function (p, q) { return q.val - p.val; });
      var x = ev[0].vec, y = ev[1].vec;
      function centroid(a, b) {
        var m = [0, 0, 0], n = 0;
        ca.forEach(function (p) { if (p[3] >= a && p[3] <= b) { for (var q = 0; q < 3; q++) m[q] += p[q] - c[q]; n++; } });
        return m.map(function (t) { return t / n; });
      }
      function dot(u, w) { return u[0] * w[0] + u[1] * w[1] + u[2] * w[2]; }
      var abd = centroid(16, 105), kin = centroid(695, 1068);
      // Screen y points up: the ABD goes to positive y, the kinase to negative x.
      if (dot(abd, y) < 0) y = y.map(function (t) { return -t; });
      if (dot(kin, x) > 0) x = x.map(function (t) { return -t; });
      var z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
      // Centre on the middle of the projected outline rather than the centre of mass, so the protruding ABD does not
      // push the rest of the protein off-centre.
      var lo = [1e9, 1e9], hi = [-1e9, -1e9];
      ca.forEach(function (p) {
        var d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], u = [dot(d, x), dot(d, y)];
        for (var q = 0; q < 2; q++) { lo[q] = Math.min(lo[q], u[q]); hi[q] = Math.max(hi[q], u[q]); }
      });
      var mx = (lo[0] + hi[0]) / 2, my = (lo[1] + hi[1]) / 2;
      return { M: [x, y, z], center: { x: c[0] + x[0] * mx + y[0] * my, y: c[1] + x[1] * mx + y[1] * my, z: c[2] + x[2] * mx + y[2] * my } };
    }
    function pick(resi) {
      site = resi;
      siteBtns.forEach(function (o) {
        var on = +o.dataset.site === resi;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      look();
    }
    siteBtns.forEach(function (b) { b.addEventListener('click', function () { pick(+b.dataset.site); }); });
    wrap.querySelector('[data-action="reset"]').addEventListener('click', function () { pick(null); });
    rebuildOn(node, build);
    viewerMsg(node, 'Loading structure…');
    return Promise.all([getText('mutation_map.pdb'), fetch(DATA + 'mutation_map.json').then(function (r) { return r.json(); })])
      .then(function (r) { text = r[0]; meta = r[1]; viewerMsg(node, ''); build(); });
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
    var state = { metric: 'rho', hidden: {} };
    var q = function (s) { return document.querySelector(s); };

    function drawAll() {
      drawMatrix(q('[data-chart="matrix"]'), d);
      drawTanimoto(q('[data-chart="tanimoto"]'), d);
      drawPca(q('[data-chart="pca"]'), d);
      drawRank(q('[data-chart="rank"]'), d, state.metric);
      drawDp(q('[data-chart="dp"]'), d, state.hidden);
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
    legend(q('[data-legend="subtype"]'), Object.keys(SUBTYPE).map(function (k) {
      var st = SUBTYPE[k];
      return { label: st.label, color: 'var(' + st.color + ')', shape: st.shape === 'circle' ? 'dot' : st.shape };
    }));
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
    function toggleTool(tool) {
      var other = DP_TOOLS.filter(function (t) { return t.tool !== tool; })[0].tool;
      if (!state.hidden[tool] && state.hidden[other]) return;  // keep at least one tool on the chart
      state.hidden[tool] = !state.hidden[tool];
      dpLegend(q('[data-legend="dp"]'), d, state.hidden, toggleTool);
      drawDp(q('[data-chart="dp"]'), d, state.hidden);
    }
    dpLegend(q('[data-legend="dp"]'), d, state.hidden, toggleTool);

    drawAll();
    var lastW = window.innerWidth, rt;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(drawAll, 150);
    });

    startViewer(q('#viewer-mutmap'), initMutMap);
    document.querySelectorAll('[data-viewer="poses"]').forEach(function (n) { startViewer(n.closest('figure'), initPoses); });
    startViewer(q('#viewer-traj'), function (wrap) { return initTraj(wrap, d); });
  });
})();
