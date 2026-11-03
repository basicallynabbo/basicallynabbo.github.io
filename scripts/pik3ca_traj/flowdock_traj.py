"""Trim FlowDock sampling trajectories to pocket + ligand, in the crystal frame, for the website.

For each chosen pair: all frames are moved with ONE transform (final-frame pocket Calpha -> crystal pocket Calpha), so the
motion of the ligand is preserved and the crystal ligand can be overlaid. Residues within 8 A of the final ligand are kept.
Output: compute/flowdock_traj/<pair>_<mode>.pdb (multi-model), <pair>_crystal_ligand.pdb, flowdock_traj.json (per-frame ligand centroid distance to crystal).
"""
import json
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import pose_eval as pe

CHOSEN = [("WT__Inavolisib", "prior", "8AM0"), ("WT__Alpelisib", "prior", "7PG6"), ("WT__RLY-2608", "prior", "8TSD")]
OUT = pe.BENCH / "compute/flowdock_traj"
OUT.mkdir(exist_ok=True)
CUT = 8.0


def parse(model_text):
    prot, lig = [], []
    for l in model_text.splitlines():
        if l.startswith("ATOM"):
            prot.append((int(l[22:26]) + 1, l))  # trajectory residues are 0-based
        elif l.startswith("HETATM"):
            lig.append(l)
    return prot, lig


def xyz(lines):
    return np.array([[float(l[30:38]), float(l[38:46]), float(l[46:54])] for l in lines])


def put(l, p):
    return l[:30] + "".join(f"{v:8.3f}" for v in p) + l[54:]


summary = {}
for pair, mode, ref in CHOSEN:
    f = next((pe.BENCH / "runs_gpu/flowdock_ref" / f"out_{mode}" / pair / "predict_epoch_outputs").glob("*_rank1_*.pdb"))
    models = [m for m in f.read_text().split("ENDMDL") if "ATOM" in m]
    ref_ca, ref_lig, _, pocket = pe._ref(ref)
    frames = [parse(m) for m in models]
    ca_idx = lambda prot: {n: i for i, (n, l) in enumerate(prot) if l[12:16].strip() == "CA"}
    last_prot, last_lig = frames[-1]
    cam = ca_idx(last_prot)
    common = [r for r in pocket if r in cam]
    P = np.array([xyz([last_prot[cam[r]][1]])[0] for r in common]); Q = np.array([ref_ca[r] for r in common])
    R, t = pe._kabsch(P, Q)
    lig_xyz_last = xyz(last_lig) @ R.T + t
    allp = xyz([l for _, l in last_prot]) @ R.T + t
    resnum = np.array([n for n, _ in last_prot])
    near = np.unique(resnum[(np.linalg.norm(allp[:, None] - lig_xyz_last[None], axis=2) < CUT).any(1)])
    ref_c = np.array([list(ref_lig.GetConformer().GetAtomPosition(i)) for i in range(ref_lig.GetNumAtoms())]).mean(0)
    out, dist = [], []
    for k, (prot, lig) in enumerate(frames):
        keep = [(n, l) for n, l in prot if n in set(near)]
        px = xyz([l for _, l in keep]) @ R.T + t
        lx = xyz(lig) @ R.T + t
        dist.append(float(np.linalg.norm(lx.mean(0) - ref_c)))
        body = [put(l[:22] + f"{n:4d}" + l[26:], p) for (n, l), p in zip(keep, px)]
        body += [put(l[:17] + "LIG B" + l[22:], p) for l, p in zip(lig, lx)]
        out.append(f"MODEL {k + 1:8d}\n" + "\n".join(body) + "\nENDMDL")
    (OUT / f"{pair}_{mode}.pdb").write_text("\n".join(out) + "\nEND\n")
    refpdb = next(pe.REFDIR.glob(f"{ref}_*_protein_ligand.pdb"))
    resname = pe.REFS[ref][1]
    (OUT / f"{pair}_crystal_ligand.pdb").write_text("".join(l for l in refpdb.read_text().splitlines(True) if l.startswith("HETATM") and l[17:20].strip() == resname))
    summary[f"{pair}_{mode}"] = dict(ref=ref, frames=len(frames), pocket_residues=len(near), centroid_dist_to_crystal=[round(d, 1) for d in dist])
    print(pair, mode, len(frames), "frames,", len(near), "residues, centroid dist start->end:", round(dist[0], 1), "->", round(dist[-1], 1))
json.dump(summary, open(OUT / "flowdock_traj.json", "w"), indent=1)
