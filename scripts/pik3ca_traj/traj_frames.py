"""Sampling trajectories (Protenix v2 +/- TFG, Boltz-2, DiffDock-L) -> pocket + ligand frames in the crystal frame, for the website.
Protenix ran on inavolisib and RLY-2608 with and without guidance; Boltz-2 on inavolisib and alpelisib; DiffDock-L on idelalisib.
FlowDock is the earlier sampling run on inavolisib (flowdock_traj.py; already trimmed to the pocket, 1-based residues).
Idelalisib has no PI3Kalpha crystal. Its reference is the PI3Kdelta crystal 4XE0, fitted the way build_pose_views.py does it:
align the PI3Kalpha (AlphaFold, DiffDock-L's receptor) and PI3Kdelta sequences and superpose on the aligned pocket Calpha
(PI3Kdelta residues within 12 A of the crystal ligand). The distance is to the crystal idelalisib in PI3Kdelta.

Inputs (from compute/server_scripts/run_px_traj.sh and run_bz_dd_traj.sh, synced to runs_gpu/):
  px_traj/<pair>_tfg-<bool>/  traj/call0.npz + CIFs     (px_traj.py records x_t, x0 and the final coordinates of 5 samples)
  bz_traj/<pair>/             traj/call0.npz + PDB      (bz_traj.py, 1 sample)
  dd_traj/<pair>/             rank1_reverseprocess.pdb  (DiffDock-L --save_visualisation; ligand only, protein is the input model)
  compute/flowdock_traj/      <pair>_prior.pdb          (FlowDock, every sampling step, pocket + ligand)
Co-folding frames are the sampler's noisy state x_t from step START on (before that it is a cloud hundreds of Angstrom wide).
Both co-folders re-centre and rotate the structure every step, so each frame gets its own pocket-Calpha superposition onto the
crystal; the written model is found in the recording by matching coordinates. DiffDock-L moves only the ligand on a fixed protein,
so all its frames share one superposition (input model pocket -> crystal pocket).
Per frame: ligand centroid distance to the crystal ligand, and the number of ligand heavy atoms closer to a protein heavy atom
than 0.75 x the sum of their vdW radii (the PoseBusters minimum-distance criterion).
Output: compute/traj/<key>.pdb (multi-model), <pair>_crystal_ligand.pdb, traj.json.
"""
import json
import re
import sys
from pathlib import Path

import gemmi
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import pose_eval as pe

PAIRS = [("WT__Inavolisib", "8AM0"), ("WT__RLY-2608", "8TSD")]  # Protenix +/- TFG
RUNS = pe.BENCH / "runs_gpu"
OUT = pe.BENCH / "compute/traj"
OUT.mkdir(exist_ok=True)
CUT = 8.0
START = 100  # first co-folding diffusion step shown (of 200); earlier the noise cloud is far wider than the pocket
VDW = {"C": 1.7, "N": 1.55, "O": 1.52, "S": 1.8, "F": 1.47, "Cl": 1.75, "Br": 1.85, "P": 1.8}
RECEPTOR = pe.BENCH / "data/docking_inputs/PIK3CA_WT_alphafold.pdb"  # DiffDock-L input in the thesis


def nearest(A, B, chunk=2000):
    """For each row of B, distance to and index of the nearest row of A."""
    d, idx = [], []
    for i in range(0, len(B), chunk):
        D = np.linalg.norm(B[i:i + chunk, None] - A[None], axis=2)
        idx.append(D.argmin(1)); d.append(D.min(1))
    return np.concatenate(d), np.concatenate(idx)


def read_atoms(path, models=False):
    """Heavy atoms of a structure file in file order; with models=True, one list per model."""
    st = gemmi.read_structure(str(path))
    st.setup_entities()
    out = []
    for model in st:
        rows = []
        for ch in model:
            for res in ch:
                lig = res.het_flag == "H" or res.entity_type == gemmi.EntityType.NonPolymer
                for a in res:
                    if a.element.name != "H":
                        rows.append(dict(lig=lig, resnum=res.seqid.num, resname=res.name, name=a.name, el=a.element.name,
                                         xyz=np.array(a.pos.tolist())))
        out.append(rows)
    return out if models else out[0]


def pdb_line(i, a, xyz):
    rec, chain, resname = ("HETATM", "B", "LIG") if a["lig"] else ("ATOM  ", "A", a["resname"])
    name = a["name"] if len(a["name"]) == 4 else " " + a["name"]
    return (f"{rec}{i:5d} {name:<4s} {resname:>3s} {chain}{a['resnum']:4d}    "
            f"{xyz[0]:8.3f}{xyz[1]:8.3f}{xyz[2]:8.3f}  1.00  0.00          {a['el']:>2s}")


def from_recording(npz, model_file):
    """Co-folding run: (atoms, x_t frames from START, x0 at the first step, steps), in the written model's atom order."""
    atoms = read_atoms(model_file)
    xyz = np.array([a["xyz"] for a in atoms])
    z = np.load(npz)
    best = None
    for s in range(z["final"].shape[0]):  # which sample is the written model, and where its atoms sit in the tensor
        d, idx = nearest(z["final"][s], xyz)
        if best is None or d.max() < best[0]:
            best = (d.max(), s, idx)
    dmax, s, idx = best
    assert dmax < 0.01 and len(set(idx)) == len(idx), f"{npz}: recording does not match {model_file.name} ({dmax:.3f} A)"
    shown = z["steps"] >= START
    return atoms, list(z["x_t"][shown][:, s][:, idx].astype(np.float64)), z["x0"][0, s][idx].astype(np.float64), z["steps"][shown]


def from_diffdock(vis_file):
    """DiffDock-L run: (atoms, frames, None, steps); fixed receptor + one ligand pose per reverse-diffusion step."""
    prot = [a for a in read_atoms(RECEPTOR) if not a["lig"]]
    # The file repeats MODEL 0, so it is split by hand. Its first model is the input conformer at the origin; the rest are the
    # reverse-diffusion steps in the receptor's frame (the last one equals rank1.sdf).
    blocks = [b for b in vis_file.read_text().split("ENDMDL") if "HETATM" in b][1:]
    models = [[dict(lig=True, resnum=1, resname="LIG", name=l[12:16].strip(), el=l[76:78].strip(),
                    xyz=np.array([float(l[30:38]), float(l[38:46]), float(l[46:54])]))
               for l in b.splitlines() if l.startswith("HETATM") and l[76:78].strip() != "H"] for b in blocks]
    lig = models[0]
    P = np.array([a["xyz"] for a in prot])
    frames = [np.vstack([P, np.array([a["xyz"] for a in m])]) for m in models]
    return prot + lig, frames, None, np.arange(len(frames))


def from_models(pdb):
    """A multi-model trajectory file (FlowDock): (atoms, frames, None, steps)."""
    models = read_atoms(pdb, models=True)
    return models[0], [np.array([a["xyz"] for a in m]) for m in models], None, np.arange(len(models))


def delta_reference():
    """4XE0 (PI3Kdelta + idelalisib) as a reference for runs on the PI3Kalpha AlphaFold model: PI3Kdelta Calpha keyed by the aligned
    PI3Kalpha residue number, so the usual pocket superposition works across isoforms."""
    def seq_and_ca(st):
        seq, ca = [], []
        for res in st[0][0]:
            if res.het_flag == "A" and res.find_atom("CA", "*"):
                a = res.find_atom("CA", "*")
                seq.append(gemmi.find_tabulated_residue(res.name).one_letter_code.upper())
                ca.append((res.seqid.num, np.array(a.pos.tolist())))
        return "".join(seq), ca
    path = pe.BENCH / "references/pose/pdb/surrogate_isoforms/4XE0.pdb"
    d_st = pe._read(path)
    d_seq, d_ca = seq_and_ca(d_st)
    lig = np.array([x for _, x in pe._ligand_atoms(d_st, "40L")])
    a_seq, a_ca = seq_and_ca(pe._read(RECEPTOR))
    aln = gemmi.align_string_sequences(list(a_seq), list(d_seq), [])
    ref_ca, i, j = {}, 0, 0
    for op, n in [(c[-1], int(c[:-1])) for c in re.findall(r"\d+[MID]", aln.cigar_str())]:
        for _ in range(n):
            if op == "M":
                if np.linalg.norm(lig - d_ca[j][1], axis=1).min() <= 12.0:
                    ref_ca[a_ca[i][0]] = d_ca[j][1]
                i += 1; j += 1
            elif op == "I":
                i += 1
            else:
                j += 1
    text = "".join(l + "\n" for l in path.read_text().splitlines() if l.startswith("HETATM") and l[17:20] == "40L")
    return ref_ca, lig, sorted(ref_ca), text


def reference(ref):
    """(Calpha by residue, crystal ligand xyz, pocket residues, crystal ligand PDB text) for a crystal id."""
    if ref == "4XE0":
        return delta_reference()
    ref_ca, ref_lig, _, pocket = pe._ref(ref)
    refpdb = next(pe.REFDIR.glob(f"{ref}_*_protein_ligand.pdb"))
    text = "".join(l for l in refpdb.read_text().splitlines(True) if l.startswith("HETATM") and l[17:20].strip() == pe.REFS[ref][1])
    return ref_ca, np.array(ref_lig.GetConformer().GetPositions()), pocket, text


def diffdock_confidence(run_dir):
    f = next(run_dir.glob("rank1_confidence*.sdf"), None)
    return None if f is None else float(f.stem.split("confidence")[1])


RUN_SPECS = []  # (key, tool, pair, ref, tfg, loader, model file for the final LRMSD)
for pair, ref in PAIRS:
    for tfg in ("false", "true"):
        run = RUNS / f"px_traj/{pair}_tfg-{tfg}"
        cif = run / f"{pair}/seed_102/predictions/{pair}_sample_0.cif"
        RUN_SPECS.append((f"protenix_{pair}_tfg-{tfg}", "Protenix v2", pair, ref, tfg == "true",
                          lambda run=run, cif=cif: from_recording(run / "traj/call0.npz", cif), cif))
for pair, ref in [("WT__Inavolisib", "8AM0"), ("WT__Alpelisib", "7PG6")]:
    run = RUNS / f"bz_traj/{pair}"
    pdb = run / f"boltz_results_{pair}/predictions/{pair}/{pair}_model_0.pdb"
    RUN_SPECS.append((f"boltz_{pair}", "Boltz-2", pair, ref, False, lambda run=run, pdb=pdb: from_recording(run / "traj/call0.npz", pdb), pdb))
fd = pe.BENCH / "compute/flowdock_traj/WT__Inavolisib_prior.pdb"
RUN_SPECS.append(("flowdock_WT__Inavolisib", "FlowDock", "WT__Inavolisib", "8AM0", False, lambda: from_models(fd), fd))
vis = RUNS / "dd_traj/WT__Idelalisib/rank1_reverseprocess.pdb"
RUN_SPECS.append(("diffdock_WT__Idelalisib", "DiffDock-L", "WT__Idelalisib", "4XE0", False, lambda: from_diffdock(vis),
                  RUNS / "dd_traj/WT__Idelalisib/rank1.sdf"))

summary = {}
for key, tool, pair, ref, tfg, load, model_file in RUN_SPECS:
    if not model_file.exists():
        print("missing", key)
        continue
    ref_ca, ref_xyz, pocket, ref_text = reference(ref) if ref else (None, None, None, None)
    atoms, frames, x0_first, steps = load()
    lig = np.array([a["lig"] for a in atoms])
    prot = ~lig
    ca = {a["resnum"]: i for i, a in enumerate(atoms) if not a["lig"] and a["name"] == "CA"}
    rad = np.array([VDW.get(a["el"], 1.7) for a in atoms])
    resnum = np.array([a["resnum"] for a in atoms])
    lp, pp = np.where(lig)[0], np.where(prot)[0]
    if ref:
        common = [r for r in pocket if r in ca]
        Q = np.array([ref_ca[r] for r in common])
        ref_c = ref_xyz.mean(0)

    aligned, dist, clashes = [], [], []
    for X in frames:
        if ref:  # crystal frame; without a reference the run stays in its receptor's frame
            R, t = pe._kabsch(X[[ca[r] for r in common]], Q)
            X = X @ R.T + t
            dist.append(float(np.linalg.norm(X[lig].mean(0) - ref_c)))
        aligned.append(X)
        dd = np.linalg.norm(X[lp][:, None] - X[pp][None], axis=2)
        clashes.append(int((dd < 0.75 * (rad[lp][:, None] + rad[pp][None])).any(1).sum()))
    x0_dist_first = None
    if ref and x0_first is not None:
        R, t = pe._kabsch(x0_first[[ca[r] for r in common]], Q)
        x0_dist_first = round(float(np.linalg.norm((x0_first @ R.T + t)[lig].mean(0) - ref_c)), 1)
    last = aligned[-1]
    near = (np.linalg.norm(last[prot][:, None] - last[lig][None], axis=2) < CUT).any(1)
    if ref:
        near |= (np.linalg.norm(last[prot][:, None] - ref_xyz[None], axis=2) < CUT).any(1)
    keep_res = set(resnum[prot][near])
    keep = [i for i, a in enumerate(atoms) if a["lig"] or a["resnum"] in keep_res]

    out = []
    for k, X in enumerate(aligned):
        out.append(f"MODEL {k + 1:8d}\n" + "\n".join(pdb_line(n + 1, atoms[i], X[i]) for n, i in enumerate(keep)) + "\nENDMDL")
    (OUT / f"{key}.pdb").write_text("\n".join(out) + "\nEND\n")
    if ref:
        (OUT / f"{pair}_crystal_ligand.pdb").write_text(ref_text)
    lrmsd = pe.evaluate(model_file, ref)["lrmsd"] if tool in ("Protenix v2", "Boltz-2") else None
    confidence = diffdock_confidence(model_file.parent) if tool == "DiffDock-L" else None
    summary[key] = dict(tool=tool, pair=pair, ref=ref, tfg=tfg, steps=[int(s) for s in steps], pocket_residues=len(keep_res),
                        x0_dist_first=x0_dist_first, centroid_dist_to_crystal=[round(d, 1) for d in dist] if ref else None,
                        ligand_atoms_clashing=clashes, final_lrmsd=None if lrmsd is None else round(lrmsd, 2), confidence=confidence)
    print(key, len(frames), "frames,", len(keep_res), "residues | dist", dist[:1], "->", dist[-1:], "| clashing", clashes[-4:],
          "| LRMSD", summary[key]["final_lrmsd"], "| x0 dist at first step", x0_dist_first, "| confidence", confidence)
json.dump(summary, open(OUT / "traj.json", "w"), indent=1)
