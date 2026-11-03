---
layout: page
title: "PIK3CA benchmark"
description: "A 300-pair benchmark of co-folding, docking and affinity tools on clinical PIK3CA variants. Affinity ranking works; the allosteric pocket is missed by every tool."
permalink: /projects/pik3ca-benchmark/
show_title: false
extra_css: /assets/css/pik3ca.css
extra_js:
  - /assets/js/pik3ca.js
---

<div class="pk-hero">
  <p class="pk-kicker">M.Tech thesis · CSIR-IGIB · 2025–26</p>
  <h1 class="pk-title">Can AI binding models see what a cancer mutation changes?</h1>
  <p class="pk-dek">I tested co-folding, docking and affinity-prediction tools on 300 pairs of PIK3CA variants and inhibitors. They rank known inhibitors well. All of them miss the allosteric pocket that the newest mutant-selective drugs bind.</p>
  <p class="pk-byline">Nabajit Kumar Borah · supervised by Dr. Lipi Thukral (CSIR-IGIB) and Dr. Abhishek Sengupta (Amity University)</p>
  <ul class="pk-links">
    <li><a class="pk-pill" href="{{ '/assets/thesis.pdf' | relative_url }}">Thesis PDF</a></li>
    <li><a class="pk-pill pk-pill--quiet" href="#thesis">Corrections &amp; reruns</a></li>
  </ul>
</div>

<div class="pk-stats" role="list">
  <div class="pk-stat" role="listitem"><span class="pk-stat-num">300</span><span class="pk-stat-label">variant–ligand pairs<br>15 variants × 20 ligands</span></div>
  <div class="pk-stat" role="listitem"><span class="pk-stat-num">ρ 0.85</span><span class="pk-stat-label">affinity ranking<br>GatorAffinity on Boltz-2 poses</span></div>
  <div class="pk-stat" role="listitem"><span class="pk-stat-num">≈ 20 Å</span><span class="pk-stat-label">pose error for allosteric<br>inhibitors, every tool</span></div>
  <div class="pk-stat" role="listitem"><span class="pk-stat-num">15 → 0</span><span class="pk-stat-label">PoseBusters failures with<br>guidance <span class="pk-tag">after thesis</span></span></div>
</div>

<figure class="pk-figure pk-viewer-wrap" id="viewer-rly">
  <div class="pk-viewer" data-viewer="rly" role="img" aria-label="3D view of p110α. The crystal pose of RLY-2608 sits in the allosteric pocket; the Boltz-2 prediction sits in the ATP pocket about 20 Å away."></div>
  <div class="pk-viewer-bar">
    <span class="pk-key"><i class="pk-sw pk-sw--crystal"></i>Crystal pose (8TSD)</span>
    <span class="pk-key"><i class="pk-sw pk-sw--pred"></i>Boltz-2 prediction</span>
    <button type="button" class="pk-btn" data-action="reset">Reset view</button>
  </div>
  <figcaption>RLY-2608, a mutant-selective allosteric inhibitor, on wild-type p110α. The crystal structure puts it in the allosteric pocket. Boltz-2 puts it in the ATP pocket, about 20 Å away. Drag to rotate, scroll to zoom. Drawn with <a href="https://github.com/sokrypton/py2Dmol">py2Dmol</a>.</figcaption>
</figure>

## The question

PIK3CA encodes p110α, the catalytic subunit of PI3Kα, and is one of the most frequently mutated oncogenes in human cancer. Most clinical mutations sit in two hotspots: the helical domain (E542K, E545K) and the kinase domain (H1047R). The first PI3Kα drugs, such as alpelisib, bind the ATP pocket and hit wild-type and mutant enzyme alike. Newer inhibitors try to tell them apart. Inavolisib binds the ATP pocket and preferentially degrades the mutant protein. RLY-2608 and STX-478 bind a separate allosteric pocket and favour the mutant enzyme.

Structure-based AI tools are now used to triage compounds like these. For them to help here, they have to do four things:

1. **Rank** inhibitors by measured potency.
2. **Separate** real binders from compounds that do not bind p110α.
3. **Shift** the prediction in the right direction when a mutation changes potency.
4. **Place** the ligand in the right pocket.

## The benchmark

<div class="pk-split">
<div markdown="1">

The matrix crosses 15 p110α sequences (wild type and 14 clinical variants) with 20 ligands: approved and clinical PI3Kα inhibitors, the two allosteric compounds, pan-PI3K and isoform-selective inhibitors, and drugs for unrelated targets as negative controls. Every one of the 300 pairs went through every tool.

Labels came from literature mining. 52 pairs have binding evidence, 19 of them with a measured IC₅₀ or Kᵢ. These 19 are used for ranking. 150 pairs are negative controls. The remaining pairs had no usable evidence and were left out of scoring.

Structures came from co-folding (Boltz-2, Protenix), docking (DiffDock-L, FlowDock, GNINA, Vina, TankBind) and a sequence-only model (PLAPT). Affinity rescorers (GatorAffinity, CheapNet, GIGN, DualBind) were run on both Boltz-2 and DiffDock-L poses.

</div>
<figure class="pk-figure pk-figure--paper">
  <img src="{{ '/assets/images/projects/pik3ca/mutation-map.webp' | relative_url }}" alt="p110α structure coloured by domain, with the 14 benchmark mutation sites marked in red" loading="lazy" width="1126" height="1041">
  <figcaption>The 14 clinical mutation sites on p110α, coloured by domain.</figcaption>
</figure>
</div>

<figure class="pk-figure pk-chart" id="chart-matrix">
  <div class="pk-legend" data-legend="matrix"></div>
  <div class="pk-plot" data-chart="matrix" role="img" aria-label="Grid of 20 ligands by 15 variants showing which pairs have binding evidence, which are negative controls and which were excluded"></div>
  <figcaption>The label for each pair. Hover a cell for details.</figcaption>
</figure>

## Ranking affinities

Co-folding followed by rescoring ranked the 19 measured affinities well. GatorAffinity on Boltz-2 poses reached Spearman ρ = 0.85 (95% CI 0.63–0.93), and Boltz-2's own affinity head reached 0.80. Nesso-1, a newer co-folding model with an affinity head, run after submission, reached 0.83 and gave the best binder-versus-control separation (AUROC 0.93).

The pose source mattered as much as the scorer. The same GatorAffinity model dropped to ρ = 0.62 on DiffDock-L poses. Docking scores (GNINA, Vina) and the sequence-only model were weaker still.

<figure class="pk-figure pk-chart" id="chart-rank">
  <div class="pk-controls" role="group" aria-label="Metric">
    <button type="button" class="pk-btn is-on" data-metric="rho" aria-pressed="true">Spearman ρ (19 pairs)</button>
    <button type="button" class="pk-btn" data-metric="auroc" aria-pressed="false">AUROC (binders vs controls)</button>
  </div>
  <div class="pk-legend" data-legend="family"></div>
  <div class="pk-plot" data-chart="rank" role="img" aria-label="Ranking of 16 tools by Spearman correlation or AUROC"></div>
  <figcaption>Each row is a tool. For ρ the line shows the 95% bootstrap interval. “A | B” means scorer A on poses from B.</figcaption>
</figure>

There is a catch. If every pair's Boltz-2 score is replaced by that ligand's average over all 15 variants, ρ rises to 0.83, above the per-pair score. For GatorAffinity the same baseline gives 0.79. Most of the ranking signal says which ligand it is, not which variant it is binding.

## Mutation response

The harder test is whether a tool's prediction moves when a mutation changes potency. Only 9 mutant–wild-type pairs have measured shifts (Δp), so this axis is underpowered. CheapNet on Boltz-2 poses gave ρ = 0.75 (permutation p = 0.03) and GatorAffinity 0.67 (p = 0.06).

All five shifts larger than 0.3 log units are potency gains. A constant “mutant binds tighter” guess also gets all five signs right, so a correct sign alone shows nothing. I treat this result as preliminary.

<figure class="pk-figure pk-chart" id="chart-dp">
  <div class="pk-controls" role="group" aria-label="Tool">
    <button type="button" class="pk-btn is-on" data-tool="CheapNet | Boltz-2" aria-pressed="true">CheapNet | Boltz-2</button>
    <button type="button" class="pk-btn" data-tool="GatorAffinity | Boltz-2" aria-pressed="false">GatorAffinity | Boltz-2</button>
  </div>
  <div class="pk-plot" data-chart="dp" role="img" aria-label="Scatter of measured against predicted mutation shifts for 9 pairs"></div>
  <figcaption>Measured Δp (mutant minus wild type) against the predicted change. Shaded quadrants are where the predicted sign is right. Allosteric ligands are drawn as diamonds.</figcaption>
</figure>

## The wrong pocket

Six crystal structures gave a direct check of pose. The three orthosteric ligands are alpelisib (7PG6), inavolisib (8AM0) and taselisib (8EXL). The allosteric ones are RLY-2608 (8TSD) and STX-478 on wild type (8TDU) and H1047R (8TGD). Boltz-2, Protenix and DiffDock-L placed the orthosteric ligands within 2 Å. FlowDock landed 8–10 Å away: near the right pocket, but not in the crystal pose.

Every tool put both allosteric inhibitors in the ATP pocket, 20–27 Å from where they bind. Several did so with high confidence. Allosteric PIK3CA structures are almost absent from the training data, and the models fall back on the pocket they have seen thousands of times.

<figure class="pk-figure pk-chart" id="chart-lrmsd">
  <div class="pk-legend" data-legend="pose"></div>
  <div class="pk-plot" data-chart="lrmsd" role="img" aria-label="Ligand RMSD per crystal reference for four pose tools, log scale"></div>
  <figcaption>Pocket-aligned ligand RMSD of the top pose, log scale. The dashed line marks 2 Å, the usual cut-off for a correct pose.</figcaption>
</figure>

### Watching FlowDock place a ligand

FlowDock builds a pose by flowing the ligand and pocket from a random start to a final structure. The trajectories show where it commits. Inavolisib settles within about 1 Å of the crystal ligand, and alpelisib within about 3 Å. RLY-2608 goes straight to the ATP pocket and stays there.

<figure class="pk-figure pk-viewer-wrap" id="viewer-traj">
  <div class="pk-controls" role="group" aria-label="Ligand">
    <button type="button" class="pk-btn is-on" data-traj="WT__Inavolisib" aria-pressed="true">Inavolisib</button>
    <button type="button" class="pk-btn" data-traj="WT__Alpelisib" aria-pressed="false">Alpelisib</button>
    <button type="button" class="pk-btn" data-traj="WT__RLY-2608" aria-pressed="false">RLY-2608</button>
  </div>
  <div class="pk-viewer pk-viewer--short" data-viewer="traj" role="img" aria-label="Animated FlowDock sampling trajectory of a ligand in the p110α pocket, with the crystal ligand shown for comparison"></div>
  <div class="pk-viewer-bar">
    <button type="button" class="pk-btn pk-play" data-action="play" aria-label="Pause">Pause</button>
    <input type="range" class="pk-scrub" min="0" max="21" value="0" step="1" aria-label="Sampling step">
    <span class="pk-readout" aria-live="off"><span data-out="step">step 1/22</span> · <span data-out="dist">–</span> from crystal</span>
  </div>
  <div class="pk-spark" data-chart="spark" aria-hidden="true"></div>
  <div class="pk-viewer-bar pk-viewer-bar--keys">
    <span class="pk-key"><i class="pk-sw pk-sw--crystal"></i>Crystal ligand</span>
    <span class="pk-key"><i class="pk-sw pk-sw--pred"></i>FlowDock ligand</span>
    <span class="pk-key"><i class="pk-sw pk-sw--pocket"></i>Pocket residues</span>
  </div>
  <figcaption>FlowDock sampling run, rank-1 sample, shown in the crystal frame. The line below the viewer tracks the distance from the ligand centroid to the crystal ligand centroid.</figcaption>
</figure>

## Guidance fixes geometry, not placement <span class="pk-tag">after thesis</span>

Protenix often produced poses that fail PoseBusters checks: atoms overlapping the protein, or ligands too close to it. Protenix v2 has an optional training-free guidance (TFG) step that steers sampling toward physically valid geometry during diffusion. After submission I reran the six crystal pairs with and without TFG, each with five seeds.

TFG fixed the geometry. The top pose passed every PoseBusters check in 30 of 30 runs, against 15 of 30 without it. It did not move any ligand. Orthosteric poses stayed within about 2 Å either way, and the allosteric poses stayed 20–27 Å off. Across all 15 variants, 42 guided allosteric poses passed PoseBusters and none came closer than 18.7 Å. Each job took 23% longer: 256 s instead of 209 s on one NVIDIA L40.

<figure class="pk-figure pk-chart" id="chart-tfg">
  <div class="pk-legend" data-legend="tfg"></div>
  <div class="pk-plot" data-chart="tfg" role="img" aria-label="Ligand RMSD for five seeds per crystal pair, with and without guidance, marking which poses pass PoseBusters"></div>
  <figcaption>Top-ranked Protenix v2 pose per seed (5 seeds), log scale. Filled dots pass all PoseBusters checks; open dots fail at least one.</figcaption>
</figure>

## What it means

- **Ranking known PI3Kα ligands works**, using co-folding plus rescoring, but most of the signal is ligand identity. A good ρ here is not evidence that the model reads the mutation.
- **Mutation effects are unresolved.** Nine measured shifts, all in one direction, cannot separate a model that understands the mutation from one that guesses “tighter”.
- **No tool finds the allosteric pocket unprompted.** For an allosteric series, check where the ligand landed before trusting any affinity number built on that pose.
- **Physical validity is cheap to fix and is not the bottleneck.** Guidance cleans up geometry for about a quarter more compute. It does not fix placement.

## Thesis, corrections and reruns {#thesis}

<div class="pk-doc">
  <a class="pk-doc-link" href="{{ '/assets/thesis.pdf' | relative_url }}">
    <span class="pk-doc-title">Benchmarking AI Tools for Mutation-Aware PIK3CA Recognition</span>
    <span class="pk-doc-meta">M.Tech dissertation · Amity University / CSIR-IGIB · June 2026 · PDF, 66 pages</span>
  </a>
</div>

In November 2026 every reported result was recomputed from the raw tool outputs. The tool runs and figure values reproduced. A few numbers in the text did not, and the PDF now opens with an errata page. The main changes:

- **Mutation response.** The text gave ρ = 0.90 for GatorAffinity. The data give 0.67, and the best tool is CheapNet on Boltz-2 poses at 0.75.
- **Protenix PoseBusters rate.** The text gave a 94.7% failure rate. The correct figure is 35.5% of top poses failing at least one check, against 3.5% for Boltz-2.
- **FlowDock** was missing from the pose figure. It is included above.
- **Serabelisib.** The Boltz-2 affinity runs for serabelisib had used the wrong molecule. After correction Boltz-2 gives ρ = 0.80 (was 0.79).

Two sets of runs postdate the thesis and are tagged <span class="pk-tag">after thesis</span> on this page: Nesso-1 on all 300 pairs, and Protenix v2 with and without guidance across five seeds.

<noscript><p class="pk-note">The charts and 3D views on this page need JavaScript.</p></noscript>
