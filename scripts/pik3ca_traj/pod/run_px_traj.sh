#!/usr/bin/env bash
# Fresh pod -> Protenix v2 diffusion trajectories for the website (WT inavolisib and RLY-2608, seed 102, TFG off/on).
# Needs copied over: $ROOT/msa_cache/WT.a3m, server_scripts/px_traj.py, traj_inputs/WT__<ligand>.json (the P1a specs); HF_TOKEN in the pod env.
# Seed 102 is the P1a seed where both ligands' top pose fails PoseBusters protein-distance checks without TFG and passes with it.
set -euo pipefail
ROOT=/nabajit
CONDA=$ROOT/miniforge
ENV=$CONDA/envs/protenix_traj
mkdir -p $ROOT/logs $ROOT/traj_inputs $ROOT/runs/px_traj
exec > >(tee -a $ROOT/logs/px_traj.log) 2>&1

if [ ! -x $CONDA/bin/conda ]; then
  curl -sL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh -o /tmp/mf.sh
  bash /tmp/mf.sh -b -p $CONDA
fi
if [ ! -x $ENV/bin/protenix ]; then
  $CONDA/bin/conda create -y -p $ENV python=3.11
  $ENV/bin/pip install protenix==2.0.0 huggingface_hub
fi
PY=$ENV/bin/python
if [ ! -f $ROOT/protenix_root/checkpoint/protenix-v2.pt ]; then
  mkdir -p $ROOT/protenix_root/checkpoint
  until [ -s $ROOT/.hf_token ] || [ -n "${HF_TOKEN:-}" ]; do echo "waiting for $ROOT/.hf_token"; sleep 30; done
  HF_TOKEN=${HF_TOKEN:-$(cat $ROOT/.hf_token)} $ENV/bin/hf download nabbo/proteinxv2 protenix-v2.pt --local-dir $ROOT/protenix_root/checkpoint
fi
echo "8f931f9774a396b67033d0e58628e1834f4a1448165e04254b40a780b0c0d599  $ROOT/protenix_root/checkpoint/protenix-v2.pt" | sha256sum -c

for lig in Inavolisib RLY-2608; do
  for tfg in false true; do
    name="WT__${lig}"; tag="${name}_tfg-${tfg}"
    out=$ROOT/runs/px_traj/$tag
    [ -f $out/traj/call0.npz ] && { echo "skip $tag"; continue; }
    t0=$(date +%s)
    LAYERNORM_TYPE=torch PROTENIX_ROOT_DIR=$ROOT/protenix_root TRAJ_OUT=$out/traj TRAJ_EVERY=4 \
      $PY $ROOT/server_scripts/px_traj.py pred -i $ROOT/traj_inputs/$name.json -o $out -s 102 -n protenix-v2 \
      --use_msa true --use_tfg_guidance $tfg
    echo "done $tag in $(( $(date +%s) - t0 )) s"
  done
done
touch $ROOT/logs/px_traj.done
