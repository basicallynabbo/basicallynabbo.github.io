"""Run `protenix pred` while recording the diffusion trajectory.

Same CLI arguments as `protenix pred`. Wraps the denoiser passed to sample_diffusion and saves, for every no-grad call
(one per sampling step, with or without TFG), the noisy input x_t and the denoised prediction x0 for all samples.
Uses no random numbers, so a run with the same seed reproduces the unpatched output (checked against the P1a CIFs).

Output: $TRAJ_OUT/<call>.npz with x_t, x0 [steps, N_sample, N_atom, 3] (float16, every $TRAJ_EVERY-th step + the last)
and final [N_sample, N_atom, 3] (float32, the returned coordinates, to match against the written CIFs).
"""
import os
import sys
from pathlib import Path

import numpy as np
import torch

import protenix.model.protenix as pm
from runner.batch_inference import protenix_cli

OUT = Path(os.environ["TRAJ_OUT"])
EVERY = int(os.environ.get("TRAJ_EVERY", "4"))
OUT.mkdir(parents=True, exist_ok=True)
_orig = pm.sample_diffusion
_calls = [0]


def sample_diffusion(denoise_net, **kw):
    kw["diffusion_chunk_size"] = None  # one pass over all samples, so steps are in order
    xt, x0 = [], []

    def net(**a):
        out = denoise_net(**a)
        if not torch.is_grad_enabled():  # TFG also calls the denoiser under grad for its guidance term; skip those
            xt.append(a["x_noisy"].detach().float().cpu())
            x0.append(out.detach().float().cpu())
        return out

    final = _orig(denoise_net=net, **kw)
    keep = list(range(0, len(x0), EVERY))
    if keep[-1] != len(x0) - 1:
        keep.append(len(x0) - 1)
    np.savez_compressed(OUT / f"call{_calls[0]}.npz", steps=np.array(keep),
                        x_t=torch.stack([xt[k] for k in keep]).squeeze(1).numpy().astype(np.float16),
                        x0=torch.stack([x0[k] for k in keep]).squeeze(1).numpy().astype(np.float16),
                        final=final.detach().float().cpu().squeeze(0).numpy())
    print(f"[px_traj] call {_calls[0]}: {len(x0)} steps, kept {len(keep)}, shape {tuple(final.shape)}", flush=True)
    _calls[0] += 1
    return final


pm.sample_diffusion = sample_diffusion

if __name__ == "__main__":
    sys.argv = ["protenix"] + sys.argv[1:]
    protenix_cli()
