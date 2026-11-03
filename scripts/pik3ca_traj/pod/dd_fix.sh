#!/usr/bin/env bash
# DiffDock-L env: conda only applied the last pip block of environment.yml; install the first (torch stack) by hand, then run.
# openfold (second block) is only needed to fold a sequence with ESMFold; the runs here give DiffDock-L a PDB.
set -euo pipefail
ROOT=/nabajit
PY=$ROOT/miniforge/envs/diffdock_traj/bin/python
exec > >(tee -a $ROOT/logs/dd_fix.log) 2>&1
$PY -m pip install --extra-index-url https://download.pytorch.org/whl/cu117 \
  --find-links https://pytorch-geometric.com/whl/torch-1.13.1+cu117.html \
  "torch==1.13.1+cu117" "dllogger @ git+https://github.com/NVIDIA/dllogger.git" e3nn==0.5.1 "fair-esm[esmfold]==2.0.0" \
  networkx==2.8.4 pandas==1.5.1 pybind11==2.11.1 pytorch-lightning==1.9.5 rdkit==2022.03.3 scikit-learn==1.1.0 \
  "torch-cluster==1.6.0+pt113cu117" torch-geometric==2.2.0 "torch-scatter==2.1.0+pt113cu117" "torch-sparse==0.6.16+pt113cu117" \
  "torch-spline-conv==1.2.1+pt113cu117" torchmetrics==0.11.0
$PY -c "import torch, torch_geometric, torch_scatter, e3nn, esm; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())"
cd $ROOT/DiffDock
t0=$(date +%s)
$PY -m inference --config default_inference_args.yaml \
  --protein_ligand_csv $ROOT/traj_inputs/diffdock/pairs.csv --out_dir $ROOT/runs/dd_traj --save_visualisation
echo "done diffdock in $(( $(date +%s) - t0 )) s"
touch $ROOT/logs/bz_dd_traj.done
