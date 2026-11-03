#!/usr/bin/env bash
# DiffDock-L on WT idelalisib with --save_visualisation. The receptor is the AlphaFold WT model split into two chains at the
# helical/kinase boundary (1-696, 697-1068): ESM embeds at most 1022 residues per chain, and p110alpha has 1068.
set -euo pipefail
ROOT=/nabajit
exec > >(tee -a $ROOT/logs/dd_idelalisib.log) 2>&1
rm -rf $ROOT/runs/dd_traj/WT__Idelalisib
cd $ROOT/DiffDock
t0=$(date +%s)
$ROOT/miniforge/envs/diffdock_traj/bin/python -m inference --config default_inference_args.yaml \
  --protein_ligand_csv $ROOT/traj_inputs/diffdock/pairs.csv --out_dir $ROOT/runs/dd_traj --save_visualisation
echo "done diffdock in $(( $(date +%s) - t0 )) s"
touch $ROOT/logs/dd_idelalisib.done
