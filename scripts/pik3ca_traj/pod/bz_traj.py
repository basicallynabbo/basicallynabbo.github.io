"""Run `boltz predict` while recording the diffusion trajectory (same idea as px_traj.py).

Same CLI arguments as `boltz predict`. Wraps AtomDiffusion.preconditioned_network_forward (one call per sampling step and
sample chunk) and saves the noisy input x_t and the denoised prediction x0, plus the coordinates sample() returns.
Uses no random numbers, so the sampled structure is the one Boltz writes.

Output: $TRAJ_OUT/call<k>.npz with x_t, x0 [steps, N_sample, N_atom_padded, 3] (float16, every $TRAJ_EVERY-th step + the last)
and final [N_sample, N_atom_padded, 3] (float32).
"""
import os
import sys
from pathlib import Path

import numpy as np
import torch

from boltz.main import cli
from boltz.model.modules.diffusionv2 import AtomDiffusion

OUT = Path(os.environ["TRAJ_OUT"])
EVERY = int(os.environ.get("TRAJ_EVERY", "4"))
OUT.mkdir(parents=True, exist_ok=True)
_fwd, _sample = AtomDiffusion.preconditioned_network_forward, AtomDiffusion.sample
_rec, _calls = [], [0]


def fwd(self, noised_atom_coords, sigma, *a, **kw):
    out = _fwd(self, noised_atom_coords, sigma, *a, **kw)
    if _rec is not None:
        _rec.append((noised_atom_coords.detach().float().cpu(), out.detach().float().cpu()))
    return out


def sample(self, *a, **kw):
    _rec.clear()
    res = _sample(self, *a, **kw)
    keep = list(range(0, len(_rec), EVERY))
    if keep[-1] != len(_rec) - 1:
        keep.append(len(_rec) - 1)
    np.savez_compressed(OUT / f"call{_calls[0]}.npz", steps=np.array(keep),
                        x_t=torch.stack([_rec[k][0] for k in keep]).numpy().astype(np.float16),
                        x0=torch.stack([_rec[k][1] for k in keep]).numpy().astype(np.float16),
                        final=res["sample_atom_coords"].detach().float().cpu().numpy())
    print(f"[bz_traj] call {_calls[0]}: {len(_rec)} steps, kept {len(keep)}, shape {tuple(res['sample_atom_coords'].shape)}", flush=True)
    _calls[0] += 1
    return res


AtomDiffusion.preconditioned_network_forward = fwd
AtomDiffusion.sample = sample

if __name__ == "__main__":
    sys.argv = ["boltz"] + sys.argv[1:]
    cli()
