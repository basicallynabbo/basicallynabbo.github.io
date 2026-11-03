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
  <p class="pk-dek">Tested co-folding, docking and affinity-prediction tools on 300 pairs of PIK3CA variants and inhibitors. They rank known inhibitors well. Every tool that builds a pose misses the allosteric pocket that the newest mutant-selective drugs bind.</p>
  <p class="pk-byline">M.Tech dissertation supervised by <a href="https://www.igib.res.in/Scientists/lipi-thukral">Dr. Lipi Thukral</a> (CSIR-IGIB)</p>
  <ul class="pk-links">
    <li><a class="pk-pill" href="{{ '/assets/thesis.pdf' | relative_url }}">Read the thesis (PDF)</a></li>
    <li><a class="pk-pill pk-pill--quiet" href="#thesis">Updates</a></li>
  </ul>
</div>

<section class="pk-abstract" aria-labelledby="abstract-h">
  <p class="pk-abstract-label" id="abstract-h">Abstract</p>
  <p>Generative and deep-learning tools for protein–ligand modelling are increasingly used, but it is unclear whether they can reliably detect structural changes caused by clinical mutations and how an inhibitor engages its target. This study benchmarks co-folding, docking and affinity-rescoring tools on PIK3CA, the catalytic p110α subunit of PI3Kα and one of the most frequently mutated oncogenes in human cancer. A 300-pair cross-docking matrix was built from fourteen clinical p110α variants and the wild type, with twenty ligands spanning FDA-approved inhibitors, clinical candidates, allosteric and isoform-selective compounds, and inactive controls. Performance was assessed on four independent axes: experimental affinity ranking, cross-docked specificity, mutation-driven affinity change (Δp), and pose correctness against crystallographic references.</p>
  <p>GatorAffinity rescoring on Boltz-2 poses gave the best affinity ranking (Spearman ρ = 0.85) and the best separation of binders from controls (AUROC = 0.88). CheapNet (Δp ρ = 0.75) and GatorAffinity (Δp ρ = 0.67) on Boltz-2 poses both signed all five significant mutational shifts correctly, so current models partly capture mutation-dependent changes (preliminary). Performance depended heavily on the pose source, and some generative models produced chemically invalid geometries.</p>
  <p>Most critically, every pose tool placed the allosteric inhibitors in or beside the orthosteric ATP pocket (LRMSD &gt; 19 Å), often with high confidence, mirroring the near-absence of allosteric PIK3CA structures in training data. Mutation-aware affinity is partly captured; allosteric pocket recognition remains an open problem.</p>
</section>

## The question

PIK3CA encodes p110α, the catalytic subunit of PI3Kα, and is one of the most frequently mutated oncogenes in human cancer. Most clinical mutations sit in two hotspots: the helical domain (E542K, E545K) and the kinase domain (H1047R). The first PI3Kα drugs, such as alpelisib, bind the ATP pocket and hit wild-type and mutant enzyme alike. Newer inhibitors try to tell them apart. Inavolisib binds the ATP pocket and preferentially degrades the mutant protein. RLY-2608 and STX-478 bind a separate allosteric pocket and favour the mutant enzyme.

Structure-based AI tools are now used to triage compounds like these. For them to help here, they have to do four things:

1. **Rank** inhibitors by measured potency.
2. **Separate** real binders from compounds that do not bind p110α.
3. **Shift** the prediction in the right direction when a mutation changes potency.
4. **Place** the ligand in the right pocket.

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
  <figcaption>AlphaFold model of p110α. Mutations in red; tap one to find it, drag to rotate, scroll to zoom.</figcaption>
</figure>

The matrix crosses 15 p110α sequences (wild type and 14 clinical variants) with 20 ligands: approved and clinical PI3Kα inhibitors, the two allosteric compounds, pan-PI3K and isoform-selective inhibitors, and drugs for unrelated targets as negative controls. Every one of the 300 pairs went through every tool.

Labels came from literature mining. 52 pairs have binding evidence, 19 of them with a measured IC₅₀ or Kᵢ. These 19 are used for ranking. 150 pairs are negative controls. The remaining pairs had no usable evidence and were left out of scoring.

Structures came from co-folding (Boltz-2, Protenix) and docking (DiffDock-L, FlowDock, GNINA, Vina, TankBind). Affinity rescorers (GatorAffinity, CheapNet, GIGN, DualBind) were run on both Boltz-2 and DiffDock-L poses. PLAPT predicts affinity from sequence and SMILES alone, with no structure.

<figure class="pk-figure pk-chart" id="chart-matrix">
  <div class="pk-legend" data-legend="matrix"></div>
  <div class="pk-plot" data-chart="matrix" role="img" aria-label="Grid of 20 ligands by 15 variants showing which pairs have binding evidence, which are negative controls and which were excluded"></div>
  <figcaption>The label for each pair. Hover a cell for details.</figcaption>
</figure>

The ligands are chemically diverse. Their mean pairwise Tanimoto similarity is 0.13, and only one pair, duvelisib and idelalisib, is above 0.4 (0.53). A tool cannot score well here by recognising near-copies of the same scaffold.

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

## Ranking affinities

Co-folding followed by rescoring ranked the 19 measured affinities well. GatorAffinity on Boltz-2 poses reached Spearman ρ = 0.85 (95% CI 0.63–0.93), and Boltz-2's own affinity head reached 0.80. Nesso-1, which Recursion and Valence Labs describe as “a fast, structure-based protein–ligand binding-affinity model”, reached 0.83 and gave the best binder-versus-control separation (AUROC 0.93). It was run after submission.

The pose source mattered as much as the scorer. The same GatorAffinity model dropped to ρ = 0.62 on DiffDock-L poses. Docking scores (GNINA, Vina) and PLAPT were weaker still.

<figure class="pk-figure pk-chart" id="chart-rank">
  <div class="pk-controls" role="group" aria-label="Metric">
    <button type="button" class="pk-btn is-on" data-metric="rho" aria-pressed="true">Spearman ρ (19 pairs)</button>
    <button type="button" class="pk-btn" data-metric="auroc" aria-pressed="false">AUROC (binders vs controls)</button>
  </div>
  <div class="pk-legend" data-legend="family"></div>
  <div class="pk-plot" data-chart="rank" role="img" aria-label="Ranking of 16 tools by Spearman correlation or AUROC"></div>
  <figcaption>Each row is a tool. For ρ the line shows the 95% bootstrap interval. “A | B” means scorer A on poses from B.<span class="pk-narrow-only"> Gator = GatorAffinity, DD-L = DiffDock-L.</span></figcaption>
</figure>

There is a catch. If every pair's Boltz-2 score is replaced by that ligand's average over all 15 variants, ρ rises to 0.83, above the per-pair score. For GatorAffinity the same baseline gives 0.79. Most of the ranking signal says which ligand it is, not which variant it is binding.

### A right pose is not a right answer

Idelalisib is a PI3Kδ drug and weakly active on PI3Kα, so the benchmark uses it as a control. Boltz-2 placed it in the PI3Kα ATP pocket in almost exactly the pose idelalisib takes in its PI3Kδ crystal structure (4XE0): 0.5 Å after fitting the two pockets. It gave that pose a confidence of 0.92 and predicted strong binding (p-scale 6.59). DiffDock-L also used the pocket, 3.4 Å off the PI3Kδ pose, but with a low confidence of −1.43. A plausible pose in a conserved pocket says little about whether the drug binds this isoform.

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

The harder test is whether a tool's prediction moves when a mutation changes potency. Only 9 mutant–wild-type pairs have measured shifts (Δp), so this axis is underpowered. CheapNet on Boltz-2 poses gave ρ = 0.75 (permutation p = 0.03) and GatorAffinity 0.67 (p = 0.06).

All five shifts larger than 0.3 log units are potency gains. A constant “mutant binds tighter” guess also gets all five signs right, so a correct sign alone shows nothing. I treat this result as preliminary.

<figure class="pk-figure pk-chart" id="chart-dp">
  <div class="pk-controls" data-legend="dp" role="group" aria-label="Tools"></div>
  <div class="pk-plot" data-chart="dp" role="img" aria-label="Scatter of measured against predicted mutation shifts for 9 pairs, with predictions from CheapNet and GatorAffinity joined by a line"></div>
  <figcaption>Measured Δp (mutant minus wild type) against the predicted change. Each measured shift has one dot per tool, joined by a line, so the line length is how much the two tools disagree. Diamonds are allosteric ligands. Shaded quadrants are where the predicted sign is right. Click a tool to hide or show it.</figcaption>
</figure>

## The wrong pocket

Six crystal structures gave a direct check of pose. The three orthosteric ligands are alpelisib (7PG6), inavolisib (8AM0) and taselisib (8EXL). The allosteric ones are RLY-2608 (8TSD) and STX-478 on wild type (8TDU) and H1047R (8TGD). Boltz-2, Protenix and DiffDock-L placed the orthosteric ligands within 2 Å. FlowDock's top poses landed 8–10 Å away: near the right pocket, but not in the crystal pose.

No tool recovered the allosteric pocket. All twelve allosteric poses were 20–27 Å from the crystal pose, and I checked where they went instead. Eleven sit in the ATP pocket: their centre is within 5 Å of where alpelisib binds, and they come within about 4 Å of the hinge residue Val851. FlowDock's RLY-2608 pose sits at the edge of that pocket, 6.6 Å out. Boltz-2 reported its RLY-2608 pose with a confidence of 0.91. Allosteric PIK3CA structures are almost absent from the training data, and the models fall back on the pocket they have seen thousands of times.

Nesso-1 and PLAPT predict affinity without building an atomic pose, so they have nothing to check here.

### Explore it in 3D

Each button loads one crystal structure of p110α (the ribbon) with the drug as it was solved by X-ray (black sticks). The coloured sticks are where each tool put the same drug, fitted onto the crystal through the pocket. The number under the viewer is how far each pose is from the crystal one; under 2 Å counts as correct.

- **Alpelisib, inavolisib, taselisib** bind the ATP pocket. Boltz-2, Protenix and DiffDock-L overlap the black crystal pose; FlowDock lands 8–10 Å away.
- **RLY-2608 and STX-478** bind the allosteric pocket, on wild type (8TDU) and on the H1047R mutant (8TGD). Here the grey sticks mark the ATP pocket for reference (alpelisib from 7PG6). Every coloured pose sits on or next to the grey marker, 20–27 Å from the black crystal pose.

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
    <button type="button" class="pk-btn is-on" data-show="Protenix" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c3)"></i>Protenix</button>
    <button type="button" class="pk-btn is-on" data-show="FlowDock" aria-pressed="true"><i class="pk-sw" style="--sw: var(--pk-c4)"></i>FlowDock</button>
    <button type="button" class="pk-btn is-on" data-show="O" aria-pressed="true"><i class="pk-sw pk-sw--pocket"></i>ATP site</button>
  </div>
  <div class="pk-viewer" data-viewer="poses" role="img" aria-label="3D view of p110α with the crystal ligand and each tool's top-ranked pose. For the allosteric inhibitors every predicted pose sits in the ATP pocket, about 20 Å from the crystal pose."></div>
  <div class="pk-viewer-bar">
    <span class="pk-key"><i class="pk-sw pk-sw--crystal-ink"></i>Crystal pose</span>
    <span class="pk-readout" data-out="lrmsd"></span>
    <button type="button" class="pk-btn" data-action="reset">Reset view</button>
  </div>
  <figcaption>Drag to rotate, scroll or pinch to zoom. Reset view brings back the starting angle. Drawn with <a href="https://github.com/sokrypton/py2Dmol">py2Dmol</a>.</figcaption>
</figure>

<figure class="pk-figure pk-chart" id="chart-lrmsd">
  <div class="pk-legend" data-legend="pose"></div>
  <div class="pk-plot" data-chart="lrmsd" role="img" aria-label="Ligand RMSD per crystal reference for four pose tools, log scale"></div>
  <figcaption>Pocket-aligned ligand RMSD of the top pose, log scale. The dashed line marks 2 Å, the usual cut-off for a correct pose.</figcaption>
</figure>

## Guidance fixes geometry, not placement <span class="pk-tag">after thesis</span>

Protenix often produced poses that fail PoseBusters checks: atoms overlapping the protein, or ligands too close to it. Protenix v2 has an optional training-free guidance (TFG) step that steers sampling toward physically valid geometry during diffusion. After submission I reran the six crystal pairs with and without TFG, each with five seeds.

TFG fixed the geometry. The top pose passed every PoseBusters check in 30 of 30 runs, against 15 of 30 without it. It did not move any ligand. Orthosteric poses stayed within about 2 Å either way, and the allosteric poses stayed 20–27 Å off. Across all 15 variants, 42 guided allosteric poses passed PoseBusters and none came closer than 18.7 Å. Each job took 23% longer: 256 s instead of 209 s on one NVIDIA L40.

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
    <button type="button" class="pk-btn" data-tool="FlowDock" data-note="FlowDock's best case: inavolisib settles within 2 Å while the pocket moves around it." aria-pressed="false">FlowDock · inavolisib</button>
    <button type="button" class="pk-btn" data-tool="DiffDock-L" data-note="Idelalisib is selective for PI3Kδ, the sister isoform, and only weakly active on PI3Kα. DiffDock-L docks it into the pocket but gives it a low confidence, as it should." aria-pressed="false">DiffDock-L · idelalisib</button>
  </div>
  <div class="pk-viewer pk-viewer--short" data-viewer="traj" role="img" aria-label="Animated sampling trajectory of the chosen model in the p110α pocket, with the crystal ligand shown for comparison"></div>
  <div class="pk-viewer-bar">
    <button type="button" class="pk-btn pk-play" data-action="play" aria-label="Pause">Pause</button>
    <input type="range" class="pk-scrub" min="0" max="25" value="0" step="1" aria-label="Sampling step">
    <span class="pk-readout" aria-live="off"><span data-out="step">step 1/26</span><span data-out="distpart"> · <span data-out="dist">–</span> from crystal</span> · <span data-out="clash">–</span> clashing<span data-out="conf"></span></span>
  </div>
  <p class="pk-traj-note" data-out="note" aria-live="polite"></p>
  <div class="pk-spark" data-chart="spark" aria-hidden="true"></div>
  <div class="pk-viewer-bar pk-viewer-bar--keys">
    <span class="pk-key" data-out="refkey"><i class="pk-sw pk-sw--crystal"></i>Crystal ligand</span>
    <span class="pk-key"><i class="pk-sw pk-sw--pred"></i>Predicted ligand</span>
    <span class="pk-key"><i class="pk-sw pk-sw--pocket"></i>Pocket residues</span>
  </div>
  <figcaption>One sampling run per model, from a random start to its final pose. The co-folders build ligand and protein together, FlowDock moves the ligand and pocket, and DiffDock-L moves only the ligand. Line: distance to the crystal ligand. Bars: ligand atoms clashing with the protein.</figcaption>
</figure>

<div class="pk-cards">
  <div class="pk-card">
    <h3>Protenix v2</h3>
    <p class="pk-card-lede">Clean geometry with guidance</p>
    <p class="pk-card-catch">but no affinity score</p>
  </div>
  <div class="pk-card">
    <h3>Boltz-2</h3>
    <p class="pk-card-lede">Best poses, best ranking</p>
    <p class="pk-card-catch">but confident even when wrong</p>
  </div>
  <div class="pk-card">
    <h3>FlowDock</h3>
    <p class="pk-card-lede">Lets the pocket move as it docks</p>
    <p class="pk-card-catch">but most top poses land 8–10 Å off</p>
  </div>
  <div class="pk-card">
    <h3>DiffDock-L</h3>
    <p class="pk-card-lede">Knows when a ligand doesn't fit</p>
    <p class="pk-card-catch">but a weak ranker</p>
  </div>
</div>

All four share one blind spot: every allosteric ligand went to or near the ATP pocket, 20–27 Å from where it binds.

## What it means

- **Ranking known PI3Kα ligands works**, using co-folding plus rescoring, but most of the signal is ligand identity. A good ρ here is not evidence that the model reads the mutation.
- **Mutation effects are unresolved.** Nine measured shifts, all in one direction, cannot separate a model that understands the mutation from one that guesses “tighter”.
- **Pocket blindness with overconfidence.** No tool finds the allosteric pocket; every pose lands in or at the ATP pocket, sometimes at high confidence. For an allosteric series, check where the ligand landed before trusting any affinity number built on that pose.
- **Physical validity is cheap to fix and is not the bottleneck.** Guidance cleans up geometry for about a quarter more compute. It does not fix placement.

## Updates {#thesis}

Two sets of runs postdate the thesis and are tagged <span class="pk-tag">after thesis</span> on this page:

- **Nesso-1** on all 300 pairs.
- **Protenix v2 PoseBusters with and without TFG** (training-free guidance), across five seeds on the six crystal pairs.

<noscript><p class="pk-note">The charts and 3D views on this page need JavaScript.</p></noscript>
