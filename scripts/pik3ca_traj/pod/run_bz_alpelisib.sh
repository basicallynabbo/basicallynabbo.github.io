#!/usr/bin/env bash
# Boltz-2 trajectory on WT alpelisib (crystal 7PG6) for the website; same settings as run_bz_dd_traj.sh. Starts once DiffDock-L
# (dd_fix.sh) has released the GPU.
set -euo pipefail
ROOT=/nabajit
exec > >(tee -a $ROOT/logs/bz_alpelisib.log) 2>&1
while pgrep -f server_scripts/dd_fix.sh > /dev/null; do sleep 20; done
name=WT__Alpelisib
out=$ROOT/runs/bz_traj/$name
t0=$(date +%s)
TRAJ_OUT=$out/traj TRAJ_EVERY=4 $ROOT/miniforge/envs/boltz_traj/bin/python $ROOT/server_scripts/bz_traj.py predict \
  $ROOT/traj_inputs/boltz/$name.yaml --out_dir $out --cache $ROOT/boltz_cache --recycling_steps 3 --sampling_steps 200 \
  --diffusion_samples 1 --step_scale 1.638 --output_format pdb --seed 102 --override
echo "done boltz $name in $(( $(date +%s) - t0 )) s"
touch $ROOT/logs/bz_alpelisib.done
