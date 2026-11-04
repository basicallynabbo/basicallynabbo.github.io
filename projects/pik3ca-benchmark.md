---
layout: page
title: "Benchmarking AI Tools for Mutation-Aware PIK3CA Recognition"
description: "Master's thesis. A 300-pair benchmark of co-folding, docking and affinity tools on clinical PIK3CA variants. Affinity ranking works; every pose tool misses the allosteric pocket."
permalink: /projects/pik3ca-benchmark/
image:
  path: /assets/images/projects/pik3ca/og.png  # link-card preview, made by scripts/make_og.py
  alt: "Thesis title beside the p110α structure coloured by domain, with the clinical mutation sites in red"
show_title: false
background: none  # no protein animation behind the 3D viewers and charts
extra_css: /assets/css/pik3ca.css
extra_js:
  - /assets/js/pik3ca.js
---

<div class="pk-hero">
  <h1 class="pk-title">Benchmarking AI Tools for Mutation&#8209;Aware PIK3CA Recognition</h1>
  <p class="pk-dek">Co-folding, docking and affinity-prediction tools evaluated across a 300-pair cross-docking matrix of PIK3CA variants and inhibitors. Affinity ranking holds up. Every pose generator places the mutant-selective allosteric inhibitors in the orthosteric ATP pocket.</p>
  <p class="pk-byline">M.Tech dissertation supervised by <a href="https://www.igib.res.in/Scientists/lipi-thukral">Dr. Lipi Thukral</a> (CSIR-IGIB)</p>
  <ul class="pk-links">
    <li><a class="pk-pill" href="{{ '/assets/thesis.pdf' | relative_url }}">Read the thesis (PDF)</a></li>
    <li><a class="pk-pill pk-pill--quiet" href="#thesis">Updates</a></li>
  </ul>
</div>

## The question

PIK3CA encodes p110α, the catalytic subunit of PI3Kα and one of the most frequently mutated oncogenes in human cancer. Most clinical mutations cluster in two hotspots: the helical domain (E542K, E545K) and the kinase domain (H1047R).

Three generations of inhibitors have targeted it, and they engage the enzyme differently. Orthosteric agents such as alpelisib occupy the ATP-binding cleft and suppress mutant and wild-type PI3Kα alike, causing the dose-limiting hyperglycaemia that restricts their use. Inavolisib binds the same cleft but couples inhibition with selective degradation of the mutant protein. RLY-2608 and STX-478 bind a cryptic allosteric pocket on the kinase-domain C-lobe that is accessible only in mutant conformations, giving 12- and 14-fold selectivity over wild type.

Structure-based AI tools are now routinely used to triage compounds of this kind. Mutation-aware prediction asks more of them than conventional docking, because the comparison is conditional: whether the same ligand is recognised differently once the sequence carries a clinical mutation. Four capabilities have to hold.

1. **Rank** inhibitors by measured potency.
2. **Separate** known binders from compounds inactive against p110α.
3. **Shift** the predicted affinity in the correct direction when a mutation alters potency.
4. **Place** the ligand in the pocket it occupies experimentally.

## The benchmark

<figure class="pk-figure pk-viewer-wrap" id="viewer-mutmap">
  <div class="pk-viewer" data-viewer="mutmap" role="img" aria-label="3D view of full-length p110α coloured by domain, with the twelve mutated residues shown as red balls"></div>
  <div class="pk-mutkey" role="group" aria-label="Domains and mutation sites">
    <div class="pk-mutgroup"><span class="pk-key"><i class="pk-sw" style="--sw: var(--pk-dom-abd)"></i><b>ABD domain</b></span><button type="button" class="pk-mutbtn" data-site="88" aria-pressed="false">R88Q</button></div>
    <div class="pk-mutgroup"><span class="pk-key"><i class="pk-sw" style="--sw: var(--pk-dom-rbd)"></i><b>RBD domain</b></span></div>
    <div class="pk-mutgroup"><span class="pk-key"><i class="pk-sw" style="--sw: var(--pk-dom-c2)"></i><b>C2 domain</b></span><button type="button" class="pk-mutbtn" data-site="345" aria-pressed="false">N345K</button><button type="button" class="pk-mutbtn" data-site="420" aria-pressed="false">C420R</button></div>
    <div class="pk-mutgroup"><span class="pk-key"><i class="pk-sw" style="--sw: var(--pk-dom-helical)"></i><b>Helical domain</b></span><button type="button" class="pk-mutbtn" data-site="542" aria-pressed="false">E542K</button><button type="button" class="pk-mutbtn" data-site="545" aria-pressed="false">E545K</button><button type="button" class="pk-mutbtn" data-site="546" aria-pressed="false">Q546K</button></div>
    <div class="pk-mutgroup"><span class="pk-key"><i class="pk-sw" style="--sw: var(--pk-dom-kinase)"></i><b>Kinase domain</b></span><button type="button" class="pk-mutbtn" data-site="726" aria-pressed="false">E726K</button><button type="button" class="pk-mutbtn" data-site="780" aria-pressed="false">W780R</button><button type="button" class="pk-mutbtn" data-site="859" aria-pressed="false">Q859H/K</button><button type="button" class="pk-mutbtn" data-site="1043" aria-pressed="false">M1043I</button><button type="button" class="pk-mutbtn" data-site="1047" aria-pressed="false">H1047L/R</button><button type="button" class="pk-mutbtn" data-site="1049" aria-pressed="false">G1049R</button></div>
    <button type="button" class="pk-btn" data-action="reset">Reset view</button>
  </div>
  <figcaption>AlphaFold model of p110α. Mutations in red; tap one to find it, drag to rotate, scroll to zoom. 3D views on this page drawn with <a href="https://github.com/sokrypton/py2Dmol">py2Dmol</a>.</figcaption>
</figure>

The benchmark crosses 15 p110α sequences (wild type and 14 clinical variants) with 20 ligands: approved and clinical PI3Kα inhibitors, the two mutant-selective allosteric compounds, pan-PI3K and isoform-selective inhibitors, and inhibitors of unrelated targets as negative controls. Every one of the 300 cross-docked pairs was run through every tool.

Ground-truth labels were curated from the primary literature and BindingDB. 52 pairs carry binding evidence, 19 of them a direct biochemical measurement (IC₅₀ or Kᵢ); that curated subset of 19 supports the affinity-ranking axis. 150 pairs are negative controls. The remainder lacked usable evidence and were excluded from scoring.

The panel spans three modelling paradigms. Co-folding models (Boltz-2, Protenix v2) generate the protein–ligand complex directly from sequence. Docking models (DiffDock-L, FlowDock, GNINA, Vina, TankBind) sample ligand conformations against an explicit receptor structure. Affinity rescorers (GatorAffinity, CheapNet, GIGN, DualBind) score a supplied pose, and were run on both Boltz-2 and DiffDock-L poses. PLAPT sits outside all three, predicting affinity from protein sequence and ligand SMILES without a structure. Nesso-1 was added after the thesis was submitted and is tagged <span class="pk-tag">after thesis</span> wherever it appears; the matrix stays open, and further models will be benchmarked on it as they are released.

<figure class="pk-figure pk-chart" id="chart-matrix">
  <div class="pk-legend" data-legend="matrix"></div>
  <div class="pk-plot" data-chart="matrix" role="img" aria-label="Grid of 20 ligands by 15 variants showing which pairs have binding evidence, which are negative controls and which were excluded"></div>
  <figcaption>The label for each pair. Hover a cell for details.</figcaption>
</figure>

The ligand panel is chemically diverse, which constrains what a good score can be attributed to. Tanimoto similarity on Morgan fingerprints quantifies shared substructure between two molecules, from 0 to 1. Across the 190 non-self pairs the mean coefficient is 0.13, and only duvelisib–idelalisib exceeds 0.4 (0.53). Strong performance here therefore cannot be explained by recognising near-duplicate scaffolds.

<figure class="pk-figure pk-chart" id="chart-similarity">
  <div class="pk-sim-plot">
    <h4>Pairwise Tanimoto similarity</h4>
    <div class="pk-plot" data-chart="tanimoto" role="img" aria-label="20 by 20 heatmap of ligand Tanimoto similarity; almost all pairs are below 0.2"></div>
  </div>
  <div class="pk-sim-plot">
    <h4>Ligands in similarity space</h4>
    <div class="pk-legend" data-legend="subtype"></div>
    <div class="pk-plot" data-chart="pca" role="img" aria-label="PCA of the ligand similarity space; the ligand classes form separate groups"></div>
  </div>
  <figcaption>Top: Morgan fingerprint (radius 2) Tanimoto similarity, darker is more similar; lines separate the ligand classes. Bottom: the first two principal components of the same fingerprints, which together explain about 23% of the variance. Hover a cell, a label or a point to find the same ligand in both plots.</figcaption>
</figure>

Splitting the same 190 pairs by whether the two ligands belong to the same class tests the obvious objection, that a model could score well by learning what a PI3Kα inhibitor looks like. Same-class pairs are only modestly more similar (median 0.18) than different-class pairs (0.13), and the single pair above 0.4 is duvelisib–idelalisib. The classes are not internally redundant.

<figure class="pk-figure pk-chart" id="chart-violin">
  <div class="pk-plot" data-chart="violin" role="img" aria-label="Violin plot of pairwise Tanimoto similarity for same-class and different-class ligand pairs; both distributions sit low, with same-class pairs only slightly higher"></div>
  <figcaption>Each violin is the distribution of pairwise Tanimoto similarity, with every pair drawn as a point and the vertical line marking the median. Same class means both ligands share a panel category, such as two orthosteric PI3Kα inhibitors.</figcaption>
</figure>

## Ranking affinities

Co-folding followed by rescoring recovered the experimental rank order well. Spearman ρ measures agreement between predicted and measured rank, where 1.0 is perfect and 0 is no association. On the curated subset of 19, GatorAffinity rescoring of Boltz-2 poses reached ρ = 0.85 (95% CI 0.63–0.93), and the Boltz-2 affinity head reached 0.80. Nesso-1, which Recursion and Valence Labs describe as “a fast, structure-based protein–ligand binding-affinity model”, reached 0.83 and gave the strongest binder-versus-control separation (AUROC 0.93, against 1.0 for perfect separation and 0.5 for chance). It was run after submission.

Pose provenance mattered as much as the scoring model. The same GatorAffinity weights fell from 0.85 to ρ = 0.62 on DiffDock-L poses. Docking scores (GNINA, Vina) and PLAPT were weaker still.

<figure class="pk-figure pk-chart" id="chart-rank">
  <div class="pk-controls" role="group" aria-label="Metric">
    <button type="button" class="pk-btn is-on" data-metric="rho" aria-pressed="true">Spearman ρ (19 pairs)</button>
    <button type="button" class="pk-btn" data-metric="auroc" aria-pressed="false">AUROC (binders vs controls)</button>
  </div>
  <div class="pk-legend" data-legend="family"></div>
  <div class="pk-plot" data-chart="rank" role="img" aria-label="Ranking of 16 tools by Spearman correlation or AUROC"></div>
  <figcaption>Each row is a tool. For ρ the line shows the 95% bootstrap interval. “A | B” means scorer A on poses from B.<span class="pk-narrow-only"> Gator = GatorAffinity, DD-L = DiffDock-L.</span></figcaption>
</figure>

This result carries an important caveat. Collapsing the variant dimension entirely — replacing each pair's Boltz-2 score with that ligand's mean across all 15 variants — raises ρ to 0.83, above the per-pair score; the same variant-blind baseline gives GatorAffinity 0.79. Most of the ranking signal is therefore ligand-class information, not variant-specific recognition.

### A right pose is not a right answer

Idelalisib is PI3Kδ-selective and only weakly active against PI3Kα, and serves as a negative control here. Boltz-2 placed it in the PI3Kα ATP cleft in essentially the conformation it adopts in its PI3Kδ crystal structure (4XE0), 0.5 Å after pocket alignment, and reported that pose with a confidence of 0.92 and a predicted p-scale of 6.59. DiffDock-L occupied the same cleft, 3.4 Å from the PI3Kδ pose, but assigned a low confidence of −1.43. A stereochemically plausible pose in a conserved pocket is therefore weak evidence of isoform-level activity.

<figure class="pk-figure pk-viewer-wrap" id="viewer-idel">
  <div class="pk-controls"><button type="button" class="pk-btn is-on" data-ref="4XE0" aria-pressed="true">Idelalisib · 4XE0</button></div>
  <div class="pk-controls pk-controls--tools" role="group" aria-label="Poses to show">
    <span class="pk-controls-label">Show</span>
    <button type="button" class="pk-btn is-on" data-show="Boltz-2" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c1)"></i>Boltz-2</button>
    <button type="button" class="pk-btn is-on" data-show="DiffDock-L" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c2)"></i>DiffDock-L</button>
  </div>
  <div class="pk-viewer pk-viewer--short" data-viewer="poses" role="img" aria-label="PI3Kδ crystal structure with idelalisib, and the Boltz-2 and DiffDock-L poses predicted on PI3Kα fitted into it"></div>
  <div class="pk-viewer-bar">
    <span class="pk-key"><i class="pk-sw pk-sw--crystal-ink"></i>Crystal pose in PI3Kδ</span>
    <span class="pk-readout" data-out="lrmsd"></span>
    <button type="button" class="pk-btn" data-action="reset">Reset view</button>
  </div>
  <figcaption>PI3Kδ with idelalisib (4XE0). The two poses were predicted on PI3Kα and fitted onto PI3Kδ through the aligned pocket residues (49% sequence identity overall).</figcaption>
</figure>

## Mutation response

The more demanding axis is whether a predicted score shifts in the correct direction, and by an approximately correct magnitude, when a mutation alters potency. Only 9 paired wild-type–mutant entries carry a measured shift (Δp, the change in potency on a log scale), which leaves the axis underpowered. CheapNet on Boltz-2 poses gave ρ = 0.75 (permutation p = 0.03) and GatorAffinity 0.67 (p = 0.06).

All five shifts exceeding 0.3 log units are potency gains. A constant “mutant binds tighter” predictor would therefore sign all five correctly, so directional accuracy alone is not evidence of mutation awareness. This axis is treated as preliminary.

<figure class="pk-figure pk-chart" id="chart-dp">
  <div class="pk-controls" data-legend="dp" role="group" aria-label="Tools"></div>
  <div class="pk-plot" data-chart="dp" role="img" aria-label="Measured and predicted mutation shifts for 9 mutant–wild-type pairs, one row each, with CheapNet and GatorAffinity predictions joined to the measurement"></div>
  <figcaption>Each row is one mutant–wild-type pair, largest measured shift first. The black mark is the measured shift; each dot is a tool’s prediction, and the line to it is the error. Shaded: shifts of two-fold or more. ALLO marks the allosteric ligands. Click a tool to hide or show it.</figcaption>
</figure>

## The wrong pocket

Six crystallographic references provide the most direct test available: the experimentally determined ligand position against the predicted one. The three orthosteric ligands are alpelisib (7PG6), inavolisib (8AM0) and taselisib (8EXL). The allosteric ones are RLY-2608 (8TSD) and STX-478 on wild type (8TDU) and H1047R (8TGD). Boltz-2, Protenix v2 and DiffDock-L placed the orthosteric ligands within 2 Å. FlowDock's top poses landed 8–10 Å away: near the right pocket, but not in the crystal pose.

No tool recovered the allosteric pocket. All twelve allosteric poses fell 19.6–26.7 Å from the crystallographic position. Eleven were placed in the ATP cleft itself, with pose centroids within 5 Å of the alpelisib site and closest approaches of about 4 Å to the hinge residue Val851. The twelfth, FlowDock's RLY-2608 pose, sits at the rim of that cleft, 6.6 Å outside it. Boltz-2 reported its RLY-2608 pose with a confidence of 0.91. Allosteric PIK3CA structures are near-absent from the training corpora, and the models default to the site that dominates them.

Nesso-1 and PLAPT predict affinity without generating an atomic pose, so neither is assessed on this axis.

### Where the poses landed

Each button loads one crystallographic reference for p110α (ribbon) with the experimental ligand pose in black. Coloured sticks are each tool's top-ranked pose for the same ligand, aligned to the reference through the pocket residues. The readout below the viewer gives LRMSD from the crystal pose; ≤ 2 Å counts as recovery.

- **Alpelisib, inavolisib, taselisib** occupy the ATP cleft. Boltz-2, Protenix v2 and DiffDock-L overlay the crystal pose; FlowDock lands 8–10 Å away.
- **RLY-2608 and STX-478** occupy the allosteric pocket, on wild type (8TDU) and on the H1047R mutant (8TGD). Grey sticks mark the ATP site for reference (alpelisib from 7PG6). Every predicted pose sits on or beside that marker, about 20–27 Å from the crystal pose.

Use **Show** to turn each tool, or the ATP-site marker, on or off.

<figure class="pk-figure pk-viewer-wrap" id="viewer-poses">
  <div class="pk-controls" role="group" aria-label="Crystal structure">
    <button type="button" class="pk-btn is-on" data-ref="8TSD" aria-pressed="true">RLY-2608 · 8TSD</button>
    <button type="button" class="pk-btn" data-ref="8TDU" aria-pressed="false">STX-478 · 8TDU</button>
    <button type="button" class="pk-btn" data-ref="8TGD" aria-pressed="false">STX-478 H1047R · 8TGD</button>
    <button type="button" class="pk-btn" data-ref="7PG6" aria-pressed="false">Alpelisib · 7PG6</button>
    <button type="button" class="pk-btn" data-ref="8AM0" aria-pressed="false">Inavolisib · 8AM0</button>
    <button type="button" class="pk-btn" data-ref="8EXL" aria-pressed="false">Taselisib · 8EXL</button>
  </div>
  <div class="pk-controls pk-controls--tools" role="group" aria-label="Poses to show">
    <span class="pk-controls-label">Show</span>
    <button type="button" class="pk-btn is-on" data-show="Boltz-2" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c1)"></i>Boltz-2</button>
    <button type="button" class="pk-btn is-on" data-show="DiffDock-L" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c2)"></i>DiffDock-L</button>
    <button type="button" class="pk-btn is-on" data-show="Protenix" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c3)"></i>Protenix v2</button>
    <button type="button" class="pk-btn is-on" data-show="FlowDock" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c4)"></i>FlowDock</button>
    <button type="button" class="pk-btn is-on" data-show="O" aria-pressed="true"><i class="pk-sw pk-sw--atp"></i>ATP site</button>
  </div>
  <div class="pk-viewer" data-viewer="poses" role="img" aria-label="3D view of p110α with the crystal ligand and each tool's top-ranked pose. For the allosteric inhibitors every predicted pose sits in the ATP pocket, about 20 Å from the crystal pose."></div>
  <div class="pk-viewer-bar">
    <span class="pk-key"><i class="pk-sw pk-sw--crystal-ink"></i>Crystal pose</span>
    <span class="pk-readout" data-out="lrmsd"></span>
    <button type="button" class="pk-btn" data-action="reset">Reset view</button>
  </div>
  <figcaption>Drag to rotate, scroll or pinch to zoom. Reset view brings back the starting angle.</figcaption>
</figure>

<figure class="pk-figure pk-chart" id="chart-lrmsd">
  <div class="pk-legend" data-legend="pose"></div>
  <div class="pk-plot" data-chart="lrmsd" role="img" aria-label="Ligand RMSD per crystal reference for four pose tools, log scale"></div>
  <figcaption>Pocket-aligned ligand RMSD of the top pose, log scale. The dashed line marks 2 Å, the usual cut-off for a correct pose.</figcaption>
</figure>

## Physical validity <span class="pk-tag">after thesis</span>

Protenix v2 run without guidance frequently produced poses that fail PoseBusters, which flags chemically impossible geometry: here, steric clashes with the receptor and volume overlap. It provides an optional training-free guidance (TFG) step that steers sampling toward physically valid geometry during diffusion. After submission, the six crystallographic pairs were rerun with and without guidance across five seeds each, giving 30 runs per condition.

Guidance resolved the geometry without altering placement. The top pose passed every PoseBusters check in 30 of 30 guided runs, against 15 of 30 unguided. Orthosteric poses stayed within about 2 Å either way, and the allosteric poses remained about 20–27 Å off. Each job took 23% longer with TFG on than off: 256 s against 209 s on one NVIDIA L40.

<figure class="pk-figure pk-chart" id="chart-tfg">
  <div class="pk-legend" data-legend="tfg"></div>
  <div class="pk-plot" data-chart="tfg" role="img" aria-label="Ligand RMSD for five seeds per crystal pair, with and without guidance, marking which poses pass PoseBusters"></div>
  <figcaption>Top-ranked Protenix v2 pose per seed (5 seeds), log scale. Each dot is one seed. Filled dots pass all PoseBusters checks; open dots fail at least one.</figcaption>
</figure>

## Trajectories

<figure class="pk-figure pk-viewer-wrap" id="viewer-traj">
  <div class="pk-controls" role="group" aria-label="Model">
    <button type="button" class="pk-btn is-on" data-tool="Protenix v2" data-note="RLY-2608 binds the allosteric site, which every model here misses. On the ATP-pocket drugs, Protenix v2 lands within 2 Å." aria-pressed="true">Protenix v2 + TFG · RLY-2608</button>
    <button type="button" class="pk-btn" data-tool="Boltz-2" data-note="Alpelisib binds the ATP pocket. Boltz-2 lands within 1 Å of the crystal pose." aria-pressed="false">Boltz-2 · alpelisib</button>
    <button type="button" class="pk-btn" data-tool="FlowDock" data-note="FlowDock gets only the protein sequence (no crystal): it docks into its own ESMFold-predicted structure, moving ligand and pocket together. Its best case: inavolisib settles within 2 Å." aria-pressed="false">FlowDock · inavolisib</button>
    <button type="button" class="pk-btn" data-tool="DiffDock-L" data-note="Idelalisib is selective for PI3Kδ, the sister isoform, and only weakly active on PI3Kα. DiffDock-L docks it about 2 Å from its pose in the PI3Kδ crystal (4XE0) but gives it a low confidence, as it should." aria-pressed="false">DiffDock-L · idelalisib</button>
  </div>
  <div class="pk-viewer pk-viewer--short" data-viewer="traj" role="img" aria-label="Animated sampling trajectory of the chosen model in the p110α pocket, with the crystal ligand shown for comparison"></div>
  <div class="pk-viewer-bar">
    <button type="button" class="pk-btn pk-play" data-action="play" aria-label="Pause">Pause</button>
    <input type="range" class="pk-scrub" min="0" max="25" value="0" step="1" aria-label="Sampling step">
    <span class="pk-readout" aria-live="off"><span data-out="step">step 1/26</span><span data-out="distpart"> · <span data-out="dist">–</span> from <span data-out="reflabel">crystal</span></span> · <span data-out="clash">–</span> clashing<span data-out="conf"></span></span>
  </div>
  <p class="pk-traj-note" data-out="note" aria-live="polite"></p>
  <div class="pk-spark" data-chart="spark" aria-hidden="true"></div>
  <div class="pk-viewer-bar pk-viewer-bar--keys">
    <span class="pk-key" data-out="refkey"><i class="pk-sw pk-sw--crystal"></i><span data-out="refkeytext">Crystal ligand</span></span>
    <span class="pk-key"><i class="pk-sw pk-sw--pred"></i>Predicted ligand</span>
    <span class="pk-key"><i class="pk-sw pk-sw--pocket"></i>Pocket residues</span>
  </div>
  <figcaption>One sampling run per model, from a random start to its final pose. The co-folders build ligand and protein together, FlowDock moves the ligand and pocket, and DiffDock-L moves only the ligand. Line: distance to the crystal ligand (for idelalisib, its PI3Kδ crystal, 4XE0). Bars: ligand atoms clashing with the protein.</figcaption>
</figure>

## Results

Affinity depends on the pose: a correct pose is the minimum requirement for predicting a correct affinity. A rescorer only reads the structure it is handed, so a ligand placed in the wrong pocket can still return a confident number.

- **Affinity ranking**: GatorAffinity on Boltz-2 poses recovered the experimental order best (ρ = 0.85), followed by the Boltz-2 affinity head (0.80). A variant-blind baseline reaches 0.79–0.83, so most of the signal is ligand class rather than variant recognition.
- **Binder–control separation**: Nesso-1 led (AUROC 0.93, AP 0.85) <span class="pk-tag">after thesis</span>; among the thesis tools, DiffDock-L confidence led on AP (0.79).
- **Mutation response**: CheapNet on Boltz-2 poses gave the strongest Δp correlation (ρ = 0.75). With nine pairs all shifting the same way, a constant “tighter” prior scores as well, so this stays preliminary.
- **Orthosteric poses**: Boltz-2 was the most accurate (0.58 Å on alpelisib), with Protenix v2 and DiffDock-L also inside 2 Å; FlowDock's top poses landed 8–10 Å out.
- **Allosteric poses**: every pose generator placed the ligand in or beside the ATP cleft, about 20–27 Å from the experimental site, Boltz-2 at a confidence of 0.91. For an allosteric series, verify placement before acting on any affinity built on such a pose.
- **Physical validity**: Protenix v2 with guidance passed every PoseBusters check in 30 of 30 runs, against 15 of 30 unguided, for 23% more compute, and moved no ligand. Geometry is cheap to repair; placement is the bottleneck.

## Limitations

Several limitations bound the interpretation of these results. The evidence base is small and heterogeneous, and each evaluation axis is constrained in a different way; these constraints carry more weight than the relative ordering of the tools.

- **Affinity subset**: 19 measurements with mixed endpoints (14 IC₅₀, 5 Kᵢ); bootstrap intervals span roughly ±0.30, wide enough to overlap across neighbouring tools.
- **Mutation response**: nine paired cases, five of them at or above the 0.30 log-unit threshold for a two-fold shift. Permutation p stays above 0.05 for most tools, and one mis-signed prediction moves sign accuracy by 20 points.
- **Specificity labels**: the 52 positives mix numeric, qualitative, resistance-context and structural evidence, so tools that rank any PIK3CA-associated case highly benefit. The stricter biochemical subset gives lower AUROC and AP.
- **Mutant receptors**: built by in-silico substitution on the wild-type AlphaFold backbone, so the models respond to local side-chain geometry rather than global conformational rearrangement.
- **Pose references**: six crystal structures, three of them allosteric. The allosteric failure is uniform but rests on too few references to quote as a rate.

## Updates {#thesis}

Two sets of runs postdate the thesis and are tagged <span class="pk-tag">after thesis</span> on this page:

- **Nesso-1** on all 300 pairs.
- **Protenix v2 PoseBusters with and without TFG** (training-free guidance), across five seeds on the six crystal pairs.

<noscript><p class="pk-note">The charts and 3D views on this page need JavaScript.</p></noscript>
