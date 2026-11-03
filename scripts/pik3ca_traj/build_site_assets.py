"""Build website assets for the PIK3CA project page from the thesis PDF, the recompute and the post-thesis reruns.

Usage: python build_site_assets.py <thesis dir> <site dir>
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageChops
from pypdf import PdfReader, PdfWriter
from scipy.stats import spearmanr

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import recompute as R  # noqa: E402

THESIS = Path(sys.argv[1])
SITE = Path(sys.argv[2])
BENCH = THESIS / "PIK3K_bench"
R.ROOT, R.OUT = BENCH, BENCH / "OUTPUT"
IMG_SRC = HERE.parent / "img"
IMG_OUT = SITE / "assets/images/projects/pik3ca"
DATA_OUT = SITE / "assets/data/pik3ca"

# pdfimages index -> (output name, smask index or None, background removal)
FIGURES = {
    "isoforms-ab": (0, None),
    "isoforms-dg": (1, None),
    "mutation-map": (2, None),
    "af-vs-crystal": (3, 4),
    "tanimoto": (5, None),
    "ligand-pca": (6, None),
    "idelalisib": (10, 11),
    "posebusters": (15, None),
    "rly2608-pocket-blindness": (16, 17),
}


def trim(im):
    """Crop uniform borders (white or transparent)."""
    if im.mode == "RGBA":
        box = im.split()[-1].getbbox()
    else:
        bg = Image.new(im.mode, im.size, im.getpixel((0, 0)))
        box = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 12 else 0).getbbox()
    return im.crop(box) if box else im


def build_images():
    if not IMG_SRC.exists():  # figures were extracted once from the thesis PDF; the webp files are already in the site
        print("image source", IMG_SRC, "missing; keeping existing images")
        return
    IMG_OUT.mkdir(parents=True, exist_ok=True)
    for name, (idx, mask) in FIGURES.items():
        im = Image.open(IMG_SRC / f"f-{idx:03d}.png").convert("RGB")
        if mask is not None:
            im.putalpha(Image.open(IMG_SRC / f"f-{mask:03d}.png").convert("L"))
        im = trim(im)
        im.thumbnail((1800, 1800))
        im.save(IMG_OUT / f"{name}.webp", "WEBP", quality=86, method=6)
        print("image", name, im.size)


def build_pdf():
    src = PdfReader(THESIS / "thesis_docx/thesis_corrected_original.pdf")  # original, corrected in place (correct_original_pdf.py)
    out = PdfWriter()
    for i in range(12, 76):  # Abstract (p13) .. end of References (p76); title page and errata page (p12) left out
        out.add_page(src.pages[i])
    out.add_metadata({"/Title": "Benchmarking AI Tools for Mutation-Aware PIK3CA Recognition", "/Author": "Nabajit Kumar Borah"})
    with open(SITE / "assets/thesis.pdf", "wb") as fh:
        out.write(fh)
    print("pdf pages", len(out.pages))


TOOL_FAMILY = {
    "Boltz-2": "cofold", "FlowDock": "dock", "DiffDock-L": "dock", "GNINA": "dock", "Vina": "dock", "TankBind": "dock",
    "PLAPT": "seq", "Nesso-1": "seq",  # sequence + SMILES in, affinity out, no atomic pose
}


POST_THESIS = {"Nesso-1"}  # run after submission; flagged on the page


def family(name):
    return TOOL_FAMILY.get(name, "rescore")


def build_data():
    m = pd.read_csv(HERE / "recomputed_metrics.csv")
    m = m[~m.tool.str.endswith("(prob_binary)")]
    r2 = lambda v: round(float(v), 3)
    tools = [
        dict(tool=r.tool, family=family(r.tool), post=r.tool in POST_THESIS, rho=r2(r.rho19), lo=r2(r.ci_lo), hi=r2(r.ci_hi), rho_p=r2(r.perm_p),
             auroc=r2(r.auroc), ap=r2(r.ap), auroc_strict=r2(r.auroc_strict), ap_strict=r2(r.ap_strict),
             dp_rho=r2(r.dp_rho9), dp_p=r2(r.dp_perm_p), sign5=int(r.sign5))
        for r in m.itertuples()
    ]

    scores = R.load()
    b = pd.read_csv(BENCH / "data/benchmark/benchmark_pairs.csv")
    b["key"] = [(R.nv(v), R.nl(l)) for v, l in zip(b.variant, b.ligand)]
    gt = b[b.include_p_scale_analysis]
    wt = gt[gt.variant == "WT"].set_index("ligand")
    pretty = {R.nl(l): l for l in b.ligand.unique()}
    dp_points = []
    for r in gt[gt.variant != "WT"].itertuples():
        if r.ligand not in wt.index:
            continue
        exp = r.p_scale_value - wt.loc[r.ligand, "p_scale_value"]
        pt = dict(ligand=r.ligand, variant=r.variant, exp=r2(exp), allosteric=r.ligand_class == "PI3Kalpha_allosteric")
        for t in ["CheapNet | Boltz-2", "GatorAffinity | Boltz-2"]:
            pt[t] = r2(scores[t][r.key] - scores[t][("WT", R.nl(r.ligand))])
        dp_points.append(pt)

    # Ligand-identity baseline: replace each pair score by that ligand's mean over all variants.
    baseline = {}
    for t in ["GatorAffinity | Boltz-2", "Boltz-2"]:
        lm = {l: np.mean([v for (_, ll), v in scores[t].items() if ll == l]) for l in {k[1] for k in scores[t]}}
        baseline[t] = r2(spearmanr([lm[k[1]] for k in gt.key], gt.p_scale_value).correlation)

    lr = pd.read_csv(BENCH / "analysis/04_results_discussion/structural_qc/lrmsd_canonical.csv")
    lrmsd = [dict(pdb=r.pdb_id, ligand=r.ligand, variant=r.reference_variant, site=r.reference_site_class,
                  tool=r.tool, lrmsd=round(float(r.local_pocket_lrmsd_A), 2)) for r in lr.itertuples()]

    def label(r):
        if not r.include_specificity:
            return "excluded"
        if r.benchmark_label == "negative_control":
            return "negative"
        return "biochemical" if r.benchmark_label == "biochemical_numeric" else "weaker"

    order_l = ["alpelisib", "inavolisib", "taselisib", "serabelisib", "RLY-2608", "STX-478", "buparlisib", "copanlisib",
               "pictilisib", "ZSTK474", "duvelisib", "idelalisib", "parsaclisib", "imatinib", "erlotinib", "lapatinib",
               "vemurafenib", "palbociclib", "olaparib", "tamoxifen"]
    order_v = ["WT", "R88Q", "N345K", "C420R", "E542K", "E545K", "Q546K", "E726K", "W780R", "Q859H", "Q859K", "M1043I",
               "H1047R", "H1047L", "G1049R"]
    cell = {(r.ligand, r.variant): label(r) for r in b.itertuples()}
    matrix = dict(ligands=order_l, variants=order_v, cells=[[cell[(l, v)] for v in order_v] for l in order_l])
    assert sum(c == "negative" for row in matrix["cells"] for c in row) == 150
    assert sum(c in ("biochemical", "weaker") for row in matrix["cells"] for c in row) == 52

    data = dict(tools=tools, dp_points=dp_points, ligand_baseline=baseline, lrmsd=lrmsd, matrix=matrix,
                tfg=build_tfg(), similarity=build_similarity(), **build_traj())
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    (DATA_OUT / "pik3ca.json").write_text(json.dumps(data, separators=(",", ":")))
    print("data tools", len(tools), "dp", len(dp_points), "lrmsd", len(lrmsd), "baseline", baseline)


def build_tfg():
    """Protenix v2 with and without training-free guidance (TFG): top-ranked pose per seed on the crystal references."""
    tops = pd.read_csv(BENCH / "compute/tfg_summary.csv")
    tops = tops[tops.source == "new"]
    pb = pd.read_csv(BENCH / "compute/posebusters_tfg.csv")
    pb["mode_"], pb["seed"] = pb.tool.str.split("|").str[0], pb.tool.str.extract(r"seed(\d+)")[0].astype(int)
    passed = {(r.mode_, r.variant, r.ligand, r.seed): bool(r.all_pass) for r in pb.itertuples()}
    ref = tops[tops.kind == "reference"]
    poses = [dict(mode=r.mode, variant=r.variant, ligand=r.ligand, seed=int(r.seed), lrmsd=round(r.top1, 2),
                  pb=passed[(r.mode, r.variant, r.ligand, int(r.seed))]) for r in ref.itertuples()]
    allo = tops[(tops["mode"] == "tfg") & (tops.ligand.isin(["RLY-2608", "STX-478"]))]
    log = pd.read_csv(BENCH / "compute/logs/compute_log.csv")
    log = log[(log.stage == "P1a_protenix_ref") & (log.status == "ok")]
    secs = {m: round(float(log[log["mode"] == f"tfg={m}"].wall_s.mean()), 1) for m in ("false", "true")}
    out = dict(poses=poses, seconds_per_job=dict(notfg=secs["false"], tfg=secs["true"]),
               allosteric_pairs=int(len(allo)), allosteric_min_lrmsd=round(float(allo.top1.min()), 1),
               allosteric_pb_pass=int(sum(passed.get(("tfg", r.variant, r.ligand, int(r.seed)), False) for r in allo.itertuples())))
    print("tfg poses", len(poses), "seconds", secs, "allosteric", out["allosteric_pairs"], out["allosteric_min_lrmsd"])
    return out


def build_similarity():
    """Ligand Tanimoto matrix and PCA scores, as computed for the thesis (data/chemical_similarity)."""
    src = BENCH / "data/chemical_similarity"
    tani = pd.read_csv(src / "tanimoto_matrix.csv", index_col=0)
    pca = pd.read_csv(src / "tanimoto_pca_scores.csv")
    var = pd.read_csv(src / "tanimoto_pca_variance.csv").set_index("component").explained_variance_percent
    order = ["Alpelisib", "Inavolisib", "Serabelisib", "Taselisib", "RLY-2608", "STX-478", "Buparlisib", "Copanlisib",
             "Pictilisib", "ZSTK474", "Duvelisib", "Idelalisib", "Parsaclisib", "Erlotinib", "Imatinib", "Lapatinib",
             "Olaparib", "Palbociclib", "Tamoxifen", "Vemurafenib"]
    sub = dict(zip(pca.ligand, pca.subtype))
    off = [tani.loc[a, b] for i, a in enumerate(order) for b in order[i + 1:]]
    out = dict(ligands=order, subtype=[sub[l] for l in order],
               matrix=[[round(float(tani.loc[a, b]), 3) for b in order] for a in order],
               pca=[dict(ligand=r.ligand, subtype=r.subtype, x=round(r.PC1, 3), y=round(r.PC2, 3)) for r in pca.itertuples()],
               var=[round(float(var["PC1"]), 1), round(float(var["PC2"]), 1)], mean=round(float(np.mean(off)), 3))
    print("similarity mean", out["mean"], "max", max(off), "var", out["var"])
    return out


SHOWN_TRAJ = ["protenix_WT__RLY-2608_tfg-true", "boltz_WT__Alpelisib", "flowdock_WT__Inavolisib", "diffdock_WT__Idelalisib"]


def build_traj():
    """Sampling trajectories, pocket + ligand in the crystal frame (compute/traj, from traj_frames.py): one per model. Protenix v2 with
    guidance on RLY-2608, Boltz-2 on alpelisib, FlowDock on inavolisib, DiffDock-L on idelalisib (no PI3Kalpha crystal, so no
    distance). Every recorded step is kept (co-folding: every 4th diffusion step from step 100). The other runs stay local."""
    src = BENCH / "compute/traj"
    meta = json.loads((src / "traj.json").read_text())
    dst = DATA_OUT / "traj"
    dst.mkdir(parents=True, exist_ok=True)
    out, written = [], set()
    for key, m in meta.items():
        if key not in SHOWN_TRAJ:
            continue
        models = [b for b in (src / f"{key}.pdb").read_text().split("ENDMDL") if "ATOM" in b]
        keep = list(range(len(models)))
        body = []
        for n, k in enumerate(keep):
            lines = [l[:78].rstrip() for l in models[k].splitlines() if l.startswith(("ATOM", "HETATM"))]
            body.append(f"MODEL {n + 1:8d}\n" + "\n".join(lines) + "\nENDMDL")
        (dst / f"{key}.pdb").write_text("\n".join(body) + "\nEND\n")
        written.add(f"{key}.pdb")
        dist = m["centroid_dist_to_crystal"]
        if dist is not None:
            (dst / f"{m['pair']}_crystal.pdb").write_text((src / f"{m['pair']}_crystal_ligand.pdb").read_text())
            written.add(f"{m['pair']}_crystal.pdb")
        out.append(dict(key=key, tool=m["tool"], pair=m["pair"], ref=m["ref"], confidence=m["confidence"],
                        dist=None if dist is None else [dist[k] for k in keep], clash=[m["ligand_atoms_clashing"][k] for k in keep]))
    scale = dict(clash=max(max(t["clash"]) for t in out))
    for f in dst.iterdir():  # drop runs that are no longer shown
        if f.name not in written:
            f.unlink()
    print("traj", [(t["key"], len(t["clash"]), t["clash"][-1]) for t in out], scale)
    return dict(traj=out, traj_scale=scale)


if __name__ == "__main__":
    build_images()
    build_pdf()
    build_data()
