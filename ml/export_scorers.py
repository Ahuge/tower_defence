"""
Export trained placement scorers to JSON for TypeScript use.
"""

import json
import torch
from pathlib import Path
from train_placement import ScorerMLP, cell_features, board_features

MODEL_DIR = Path('ml/placement-models')
OUTPUT_DIR = Path('playtest/models')
OUTPUT_DIR.mkdir(exist_ok=True)

def export_faction(faction):
    pt_path = MODEL_DIR / f'scorer-{faction}.pt'
    if not pt_path.exists():
        print(f"Skip {faction}: no model")
        return
    
    # We need input_dim — infer from a dummy forward pass
    # Actually, let's just save the state dict and reconstruct
    state = torch.load(pt_path, map_location='cpu', weights_only=True)
    
    # Extract weights
    # net.0: Linear(input_dim -> 64)
    # net.3: Linear(64 -> 32)  
    # net.6: Linear(32 -> 1)
    w0 = state['net.0.weight'].tolist()
    b0 = state['net.0.bias'].tolist()
    w3 = state['net.3.weight'].tolist()
    b3 = state['net.3.bias'].tolist()
    w6 = state['net.6.weight'].tolist()
    b6 = state['net.6.bias'].tolist()
    
    out = {
        'faction': faction,
        'input_dim': len(w0[0]),
        'layers': [
            {'weights': w0, 'bias': b0},  # input -> 64
            {'weights': w3, 'bias': b3},  # 64 -> 32
            {'weights': w6, 'bias': b6},  # 32 -> 1
        ]
    }
    
    out_path = OUTPUT_DIR / f'scorer-{faction}.json'
    with open(out_path, 'w') as f:
        json.dump(out, f)
    print(f"Exported {faction} -> {out_path}")

def main():
    for pt in MODEL_DIR.glob('scorer-*.pt'):
        faction = pt.stem.replace('scorer-', '')
        export_faction(faction)

if __name__ == '__main__':
    main()
