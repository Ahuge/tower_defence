"""
export_for_game.py — Convert PyTorch models to JSON for TypeScript LearnedScorer.
"""

import json
import argparse
from pathlib import Path
import torch

def export_model(pt_path, out_path):
    state = torch.load(pt_path, map_location='cpu', weights_only=True)
    
    # Architecture: 14 -> 128 -> 64 -> 1
    # net.0: Linear(14 -> 128), net.3: Linear(128 -> 64), net.6: Linear(64 -> 1)
    layers = []
    for i, (w_key, b_key) in enumerate([
        ('net.0.weight', 'net.0.bias'),
        ('net.3.weight', 'net.3.bias'),
        ('net.6.weight', 'net.6.bias'),
    ]):
        layers.append({
            'weights': state[w_key].tolist(),
            'bias': state[b_key].tolist(),
        })
    
    out = {
        'faction': pt_path.stem.replace('scorer-', ''),
        'input_dim': len(layers[0]['weights'][0]),
        'layers': layers,
    }
    
    with open(out_path, 'w') as f:
        json.dump(out, f)
    print(f"  {pt_path.name} -> {out_path.name}")

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--models', required=True, help='Dir with .pt files')
    p.add_argument('--out', required=True, help='Output dir for JSON files')
    args = p.parse_args()
    
    model_dir = Path(args.models)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    for pt in sorted(model_dir.glob('scorer-*.pt')):
        out_path = out_dir / (pt.stem + '.json')
        export_model(pt, out_path)
    
    print(f"\nDone. JSON models in {out_dir}")
    print("Copy these to playtest/models/ in the repo to use them.")

if __name__ == '__main__':
    main()
