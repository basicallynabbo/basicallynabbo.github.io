"""Pocket-aligned ligand RMSD (LRMSD) and PoseBusters for generated complexes vs crystal references.

Protocol (same as the thesis, section 3.5.3): align the predicted protein to the crystal on Calpha atoms of pocket
residues (any atom within POCKET_A of the reference ligand), apply that transform to the predicted ligand, and take the
symmetry-aware heavy-atom RMSD to the reference ligand (bond orders from the benchmark SDF template). No refit of the ligand.

Usage as a module:  from pose_eval import evaluate
"""
import re
import warnings
from pathlib import Path

import gemmi
import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdMolAlign
from rdkit.Geometry import Point3D

RDLogger.DisableLog("rdApp.*")
warnings.filterwarnings("ignore")
POCKET_A = 10.0
BENCH = Path("/Users/nabajit/Documents/Master Thesis/PIK3K_bench")
REFDIR = BENCH / "analysis/04_results_discussion/structural_qc/cleaned_references"
SDFDIR = BENCH / "data/ligands/sdf"

REFS = {  # reference id -> (cleaned complex file, ligand resname, benchmark ligand, site class)
    "7PG6": ("7PG6_1LT_protein_ligand.pdb", "1LT", "Alpelisib", "orthosteric"),
    "8AM0": ("8AM0_MWF_protein_ligand.pdb", "MWF", "Inavolisib", "orthosteric"),
    "8EXL": ("8EXL_799_protein_ligand.pdb", "799", "Taselisib", "orthosteric"),
    "8TSD": ("8TSD_XUZ_protein_ligand.pdb", "XUZ", "RLY-2608", "allosteric"),
    "8TDU": ("8TDU_ZWE_protein_ligand.pdb", "ZWE", "STX-478", "allosteric"),
    "8TGD": ("8TGD_ZWE_protein_ligand.pdb", "ZWE", "STX-478", "allosteric"),
}
_cache = {}


def _template(ligand):
    key = re.sub(r"[^a-z0-9]", "", ligand.lower())
    for p in SDFDIR.glob("*.sdf"):
        if re.sub(r"[^a-z0-9]", "", p.stem.lower()) == key:
            return Chem.RemoveHs(Chem.MolFromMolFile(str(p)))
    raise KeyError(ligand)


def _mol_from_atoms(atoms, template):
    rw = Chem.RWMol()
    conf = Chem.Conformer(len(atoms))
    for i, (el, xyz) in enumerate(atoms):
        rw.AddAtom(Chem.Atom(el.capitalize()))
        conf.SetAtomPosition(i, Point3D(*map(float, xyz)))
    mol = rw.GetMol()
    mol.AddConformer(conf, assignId=True)
    from rdkit.Chem import rdDetermineBonds
    rdDetermineBonds.DetermineConnectivity(mol)
    mol = AllChem.AssignBondOrdersFromTemplate(template, mol)
    return mol


def _read(path):
    st = gemmi.read_structure(str(path))
    st.setup_entities()  # PDB files without SEQRES have no entity info; needed for get_polymer()
    st.remove_hydrogens()
    return st


def _protein_ca(st, chain=None):
    """First polymer chain (or the named one): {resnum: CA xyz}, plus all heavy atoms per residue."""
    ca, allat = {}, {}
    for ch in st[0]:
        if chain and ch.name != chain:
            continue
        if not ch.get_polymer():
            continue
        for res in ch:
            if res.het_flag != "A":
                continue
            allat[res.seqid.num] = np.array([[a.pos.x, a.pos.y, a.pos.z] for a in res])
            for a in res:
                if a.name == "CA":
                    ca[res.seqid.num] = np.array([a.pos.x, a.pos.y, a.pos.z])
        if ca:
            break
    return ca, allat


def _ligand_atoms(st, resname=None):
    out = []
    for ch in st[0]:
        for res in ch:
            if res.het_flag == "H" and res.name not in ("HOH", "WAT") and (resname is None or res.name == resname):
                out += [(a.element.name, (a.pos.x, a.pos.y, a.pos.z)) for a in res]
    return out


def _ref(ref_id):
    if ref_id in _cache:
        return _cache[ref_id]
    fn, resname, ligand, site = REFS[ref_id]
    st = _read(REFDIR / fn)
    ca, allat = _protein_ca(st)
    lig_atoms = _ligand_atoms(st, resname)
    template = _template(ligand)
    lig = _mol_from_atoms(lig_atoms, template)
    lxyz = np.array([[x, y, z] for _, (x, y, z) in lig_atoms])
    pocket = [r for r, xyz in allat.items() if r in ca and np.min(np.linalg.norm(xyz[:, None] - lxyz[None], axis=2)) <= POCKET_A]
    _cache[ref_id] = (ca, lig, template, pocket)
    return _cache[ref_id]


def _kabsch(P, Q):
    pc, qc = P.mean(0), Q.mean(0)
    U, _, Vt = np.linalg.svd((P - pc).T @ (Q - qc))
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T
    return R, qc - R @ pc


def evaluate(pred_path, ref_id, ligand_resname=None):
    """Return dict(lrmsd, pocket_ca_rmsd, n_pocket, centroid_dist) for a predicted complex file (cif/pdb)."""
    ref_ca, ref_lig, template, pocket = _ref(ref_id)
    st = _read(pred_path)
    pca, _ = _protein_ca(st)
    atoms = _ligand_atoms(st, ligand_resname)
    pred_lig = _mol_from_atoms(atoms, template)
    common = [r for r in pocket if r in pca]
    P = np.array([pca[r] for r in common]); Q = np.array([ref_ca[r] for r in common])
    R, t = _kabsch(P, Q)
    ca_rmsd = float(np.sqrt(((P @ R.T + t - Q) ** 2).sum(1).mean()))
    conf = pred_lig.GetConformer()
    xyz = np.array([list(conf.GetAtomPosition(i)) for i in range(pred_lig.GetNumAtoms())]) @ R.T + t
    for i, p in enumerate(xyz):
        conf.SetAtomPosition(i, Point3D(*map(float, p)))
    rms = rdMolAlign.CalcRMS(pred_lig, ref_lig)
    rxyz = np.array([list(ref_lig.GetConformer().GetAtomPosition(i)) for i in range(ref_lig.GetNumAtoms())])
    return dict(lrmsd=float(rms), pocket_ca_rmsd=ca_rmsd, n_pocket=len(common), centroid_dist=float(np.linalg.norm(xyz.mean(0) - rxyz.mean(0))), pred_ligand=pred_lig)
