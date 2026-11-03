#!/usr/bin/env bash
# Boltz-2 and DiffDock-L sampling trajectories for the website (Boltz-2 on inavolisib, DiffDock-L on idelalisib), after the Protenix runs.
# Boltz-2: same settings as the thesis reruns (provenance.json), no affinity head, seed 102; recorded by bz_traj.py.
# DiffDock-L: default_inference_args.yaml on the thesis receptor (WT AlphaFold model), --save_visualisation.
# Needs copied over: msa_cache/WT.csv, server_scripts/bz_traj.py, traj_inputs/boltz/*.yaml, traj_inputs/diffdock/*.
set -euo pipefail
ROOT=/nabajit
CONDA=$ROOT/miniforge
exec > >(tee -a $ROOT/logs/bz_dd_traj.log) 2>&1

# installs first (network-bound), then wait for the GPU
if [ ! -x $CONDA/envs/boltz_traj/bin/boltz ]; then
  $CONDA/bin/conda create -y -p $CONDA/envs/boltz_traj python=3.11
  $CONDA/envs/boltz_traj/bin/pip install "boltz[cuda]==2.2.1"
fi
if [ ! -d $ROOT/DiffDock ]; then
  git clone https://github.com/gcorso/DiffDock.git $ROOT/DiffDock
fi
if [ ! -x $CONDA/envs/diffdock_traj/bin/python ]; then
  $CONDA/bin/conda env create -p $CONDA/envs/diffdock_traj -f $ROOT/DiffDock/environment.yml
fi
until [ -f $ROOT/logs/px_traj.done ]; do sleep 30; done

for name in WT__Inavolisib; do
  out=$ROOT/runs/bz_traj/$name
  [ -f $out/traj/call0.npz ] && { echo "skip boltz $name"; continue; }
  t0=$(date +%s)
  TRAJ_OUT=$out/traj TRAJ_EVERY=4 $CONDA/envs/boltz_traj/bin/python $ROOT/server_scripts/bz_traj.py predict \
    $ROOT/traj_inputs/boltz/$name.yaml --out_dir $out --cache $ROOT/boltz_cache --recycling_steps 3 --sampling_steps 200 \
    --diffusion_samples 1 --step_scale 1.638 --output_format pdb --seed 102 --override
  echo "done boltz $name in $(( $(date +%s) - t0 )) s"
done

cd $ROOT/DiffDock
if [ ! -d $ROOT/runs/dd_traj/WT__Idelalisib ]; then
  t0=$(date +%s)
  $CONDA/envs/diffdock_traj/bin/python -m inference --config default_inference_args.yaml \
    --protein_ligand_csv $ROOT/traj_inputs/diffdock/pairs.csv --out_dir $ROOT/runs/dd_traj --save_visualisation
  echo "done diffdock in $(( $(date +%s) - t0 )) s"
fi
touch $ROOT/logs/bz_dd_traj.done
