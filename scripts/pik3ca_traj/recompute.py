"""Independent recompute of thesis metrics from raw tool outputs.

Does not import the project's rebuild code. Usage: python recompute.py <PIK3K_bench root>
"""
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.metrics import average_precision_score, roc_auc_score

ROOT = Path(sys.argv[1])
OUT = ROOT / "OUTPUT"
RTLN10 = 0.0019872043 * 298.15 * np.log(10)


def nv(v):
    v = str(v).strip().replace("PIK3CA_", "").replace("run2__", "")
    return "WT" if v in ("WT_alphafold", "WT") else v


def nl(l):
    return re.sub(r"[^a-z0-9]", "", str(l).lower())


def split_id(s):
    s = re.sub(r"_LIG$", "", str(s))
    a, b = s.split("__")[-2:]
    return nv(a), nl(b)


def load():
    t = {}
    d = pd.read_csv(OUT / "boltz2_300/manifest.csv")
    t["Boltz-2"] = {(nv(m), nl(l)): 6.0 - v for m, l, v in zip(d.mutation, d.drug_name, d.affinity_pred_value)}
    t["Boltz-2 (prob_binary)"] = {(nv(m), nl(l)): v for m, l, v in zip(d.mutation, d.drug_name, d.affinity_probability_binary)}
    import json as _json
    # The original serabelisib affinity runs used the wrong molecule (dabrafenib); use the corrected reruns.
    for f in (ROOT / "runs_gpu/boltz2_serabelisib/out/boltz_results_inputs/predictions").glob("*/affinity_*.json"):
        j = _json.load(open(f)); k = (nv(f.parent.name.split("__")[0]), nl("serabelisib"))
        t["Boltz-2"][k], t["Boltz-2 (prob_binary)"][k] = 6.0 - j["affinity_pred_value"], j["affinity_probability_binary"]
    d = pd.read_csv(OUT / "flowdock_300/manifest.csv")
    t["FlowDock"] = {(nv(m), nl(l)): v for m, l, v in zip(d.benchmark_variant, d.benchmark_ligand, d.rank1_affinity)}
    d = pd.read_csv(OUT / "diffdockl_300/manifest.csv")
    conf = d.rank_files.str.extract(r"rank1_confidence(-?[\d.]+)\.sdf")[0].astype(float)
    t["DiffDock-L"] = {(nv(m), nl(l)): v for m, l, v in zip(d.mutation, d.drug_name, conf)}
    d = pd.read_csv(OUT / "gnina_300/manifest.csv")
    t["GNINA"] = {(nv(m), nl(l)): v for m, l, v in zip(d.mutation, d.drug_name, d.cnn_affinity)}
    d = pd.read_csv(OUT / "vina_300/manifest.csv")
    t["Vina"] = {(nv(m), nl(l)): -v / RTLN10 for m, l, v in zip(d.variant, d.ligand, d.top_affinity_kcal_mol)}
    d = pd.read_csv(OUT / "tankbind_300/tankbind_fixed_scores.csv")
    t["TankBind"] = {(nv(m), nl(l)): v for m, l, v in zip(d.variant, d.ligand, d.score_pocket2)}
    for name, f in [("CheapNet | Boltz-2", "cheapnet_300/manifest.csv"), ("CheapNet | DiffDock-L", "CheapNet_diff_300/manifest.csv")]:
        d = pd.read_csv(OUT / f)
        t[name] = {(nv(m), nl(l)): v for m, l, v in zip(d.mutation, d.drug_name, d.pred_mean)}
    d = pd.read_csv(OUT / "plapt_300/manifest.csv")
    t["PLAPT"] = {(nv(m), nl(l)): v for m, l, v in zip(d.protein, d.molecule, d.neg_log10_affinity_M)}
    for name, f in [("GatorAffinity | Boltz-2", "gatoraffinity_300/boltz2/predictions.csv"), ("GatorAffinity | DiffDock-L", "gatoraffinity_300/diffdockl/predictions_fixed.csv")]:
        d = pd.read_csv(OUT / f)
        t[name] = {split_id(i): v for i, v in zip(d.pdb_id, d.predicted_p_scale)}
    for name, f in [("DualBind | Boltz-2", "dualbind_300/final_predictions_with_ids.csv"), ("DualBind | DiffDock-L", "dualbind_diffdock_300/final_predictions_diffdock_with_ids.csv")]:
        d = pd.read_csv(OUT / f)
        t[name] = {split_id(i): -v for i, v in zip(d.pair_id, d["raw predictions"])}
    for name, f in [("GIGN | Boltz-2", "gign_300/final_predictions_boltz2_modal.csv"), ("GIGN | DiffDock-L", "gign_300/final_predictions_diffdock_modal.csv")]:
        d = pd.read_csv(OUT / f)
        t[name] = {split_id(i): v for i, v in zip(d.pair_id, d.predictions)}
    import json as _json
    nes, nesp = {}, {}
    for d in sorted((ROOT / "runs_gpu/nesso/out/predictions").glob("*__*")):
        v, l = d.name.split("__"); j = _json.load(open(d / "affinity.json"))
        nes[(nv(v), nl(l))] = 6.0 - j["affinity_pred_value"]  # log10(IC50/uM), lower = stronger (docs/prediction.md)
        nesp[(nv(v), nl(l))] = j["affinity_probability_binary"]
    if nes:
        t["Nesso-1"], t["Nesso-1 (prob_binary)"] = nes, nesp
    return t


def boot_ci(x, y, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n):
        i = rng.integers(0, len(x), len(x))
        if len(set(x[i])) > 1 and len(set(y[i])) > 1:
            vals.append(spearmanr(x[i], y[i]).correlation)
    return np.percentile(vals, [2.5, 97.5])


def perm_p(x, y, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    obs = abs(spearmanr(x, y).correlation)
    hits = sum(abs(spearmanr(x, rng.permutation(y)).correlation) >= obs for _ in range(n))
    return (hits + 1) / (n + 1)


def main():
    tools = load()
    b = pd.read_csv(ROOT / "data/benchmark/benchmark_pairs.csv")
    b["key"] = [(nv(v), nl(l)) for v, l in zip(b.variant, b.ligand)]
    print("coverage:", {k: sum(key in v and np.isfinite(v[key]) for key in b.key) for k, v in tools.items()})

    gt = b[b.include_p_scale_analysis].copy()
    spec = b[b.include_specificity].copy()
    spec["y"] = (spec.benchmark_label != "negative_control").astype(int)
    resist = spec.evidence_notes.str.contains(r"confers (?:significant |mild but significant )?resistance|Significant IC50 increase", case=False, regex=True)
    strict = spec[(spec.y == 0) | (spec.benchmark_label == "biochemical_numeric")]
    noresist = spec[~resist]
    print(f"spec n={len(spec)} pos={spec.y.sum()} | resistance-flagged positives={int((resist & (spec.y==1)).sum())}")

    wt = gt[gt.variant == "WT"].set_index("ligand")
    dp = []
    for _, r in gt[gt.variant != "WT"].iterrows():
        if r.ligand in wt.index:
            dp.append((r.key, ("WT", nl(r.ligand)), r.p_scale_value - wt.loc[r.ligand, "p_scale_value"]))

    rows = []
    for name, s in tools.items():
        x = np.array([s[k] for k in gt.key]); y = gt.p_scale_value.values
        rho = spearmanr(x, y).correlation
        lo, hi = boot_ci(x, y)
        sc = np.array([s[k] for k in spec.key])
        auc = roc_auc_score(spec.y, sc); ap = average_precision_score(spec.y, sc)
        auc_s = roc_auc_score(strict.y, [s[k] for k in strict.key]); ap_s = average_precision_score(strict.y, [s[k] for k in strict.key])
        auc_nr = roc_auc_score(noresist.y, [s[k] for k in noresist.key])
        pd_ = np.array([s[m] - s[w] for m, w, _ in dp]); ed = np.array([e for *_, e in dp])
        sig = np.abs(ed) >= 0.30
        rows.append(dict(tool=name, rho19=rho, ci_lo=lo, ci_hi=hi, perm_p=perm_p(x, y),
                         auroc=auc, ap=ap, auroc_strict=auc_s, ap_strict=ap_s, auroc_no_resist=auc_nr,
                         dp_rho9=spearmanr(pd_, ed).correlation, dp_perm_p=perm_p(pd_, ed),
                         sign5=int((np.sign(pd_[sig]) == np.sign(ed[sig])).sum()),
                         sign9=int((np.sign(pd_) == np.sign(ed)).sum())))
    res = pd.DataFrame(rows).sort_values("rho19", ascending=False)
    pd.set_option("display.width", 250)
    print(res.round(3).to_string(index=False))
    print("\nexperimental deltas:", [(m[0], m[1], round(e, 3)) for m, _, e in dp])
    res.to_csv(Path(__file__).with_name("recomputed_metrics.csv"), index=False)


if __name__ == "__main__":
    main()
