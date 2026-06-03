"""
QNet — Q(state, action) for action-conditioned scoring.

Option B from notes/rl/q-network-proposal.md: spatial Q-network
with per-cell heads (one forward pass yields Q for ALL legal
actions at once).

Output shape:
  spatial_q [N, 10, 26, 36]   8 place-slot Q values + upgrade + sell, per cell
  skip_q    [N, 1]             scalar Q for skip
  flat:     [N, 9361]          packed for index-based loss

Training target: MSE(Q[action_taken], outcome) — only the taken
action's Q gets a gradient. Other actions' Q values float free
until they too are taken in another rollout.

Architecture is identical to PPOPolicyNet (v2) but interpreted
as Q values (no softmax during inference, just argmax over legal
actions).
"""
from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import torch
import torch.nn as nn
import torch.nn.functional as F

from policy import (
    PPOPolicyNet, FiLM, OBS_CHANNELS, OBS_GLOBALS, GRID_ROWS, GRID_COLS,
    SPATIAL_LOGIT_CHANNELS, ACTION_SPACE_SIZE, SKIP_INDEX,
)


class QNet(nn.Module):
    """Same architecture as PPOPolicyNet v2; outputs interpreted as Q.

    We reuse PPOPolicyNet directly so we don't duplicate the v2
    encoder code. The value head is unused (Q has no separate value
    output — Q itself IS the value of the action).
    """

    def __init__(self) -> None:
        super().__init__()
        self.net = PPOPolicyNet()

    def forward(self, grid: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
        """Returns flat Q vector [N, 9361]."""
        spatial, skip, _value = self.net(grid, globals_vec)
        n = spatial.shape[0]
        flat_spatial = spatial.reshape(n, -1)  # [N, 10*26*36 = 9360]
        return torch.cat([flat_spatial, skip], dim=1)  # [N, 9361]


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    net = QNet()
    n = count_params(net)
    print(f'QNet params: {n:,}')

    g = torch.randn(2, OBS_CHANNELS, GRID_ROWS, GRID_COLS)
    glb = torch.randn(2, OBS_GLOBALS)
    q = net(g, glb)
    print(f'q shape: {tuple(q.shape)}  (expected (2, {ACTION_SPACE_SIZE}))')
    assert q.shape == (2, ACTION_SPACE_SIZE)
