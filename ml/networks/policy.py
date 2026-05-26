"""
PPO policy network — BC pretrain target + PPO self-play head.

Architecture: (β) Conv-only encoder + per-cell action head + scalar
skip/value heads + (α) globals broadcast inside the model.

The Node-side `PPOBrain.buildModelInput` is intentionally a no-op
in this design — the model owns the broadcast so the ONNX export
includes the tile-and-concat op natively. Saves on serialisation
size too: the JSONL rollouts store 14-ch grid + 25-vec globals
separately, not the pre-tiled 39-ch combo.

Param budget target (PRD §6 P2-T3): <500k. Actual: ~69k.

ONNX input/output contract (schema v1.1):
  inputs:   grid    Float32 [N, 14, 26, 36]
            globals Float32 [N, 25]
  outputs:  spatial_logits Float32 [N, 10, 26, 36]
              (channels 0..7 = place per slot,
               8 = upgrade, 9 = sell)
            skip_logit     Float32 [N, 1]
            value          Float32 [N, 1]  (used by PPO advantage;
                                             unused at inference)
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


# Schema constants — must match
# src/systems/bots/learning/{ObsTensor,ActionSpace}.ts.
OBS_CHANNELS = 14
OBS_GLOBALS = 25
GRID_ROWS = 26
GRID_COLS = 36
SPATIAL_LOGIT_CHANNELS = 10
ACTION_SPACE_SIZE = 9361
SKIP_INDEX = 9360


class PPOPolicyNet(nn.Module):
    def __init__(
        self,
        n_game_ch: int = OBS_CHANNELS,
        n_globals: int = OBS_GLOBALS,
        h: int = GRID_ROWS,
        w: int = GRID_COLS,
        n_action_channels: int = SPATIAL_LOGIT_CHANNELS,
    ) -> None:
        super().__init__()
        self.n_globals = n_globals
        self.h = h
        self.w = w

        in_ch = n_game_ch + n_globals  # 39
        # Stride-1, padding=1 convs preserve spatial shape so the
        # per-cell action head maps 1:1 to the original grid cells.
        self.conv1 = nn.Conv2d(in_ch, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(64, 64, kernel_size=3, padding=1)

        # Per-cell action logits: 1x1 conv from 64 features → 10
        # channels matching the (place 0..7, upgrade, sell) layout
        # of ActionSpace's per-cell encoding.
        self.action_head = nn.Conv2d(64, n_action_channels, kernel_size=1)

        # Skip + value: global pooled trunk → linear heads.
        self.scalar_trunk = nn.Linear(64, 32)
        self.skip_head = nn.Linear(32, 1)
        self.value_head = nn.Linear(32, 1)

    def forward(self, grid: torch.Tensor, globals_vec: torch.Tensor):
        """
        grid:        [N, 14, 26, 36]   — already-built game channels
        globals_vec: [N, 25]           — raw globals (we tile inside)
        returns:     (spatial_logits [N, 10, 26, 36],
                      skip_logit     [N, 1],
                      value          [N, 1])
        """
        n = grid.shape[0]
        # Tile globals across (H, W) and concat with grid. Done
        # inside the model so the ONNX graph captures the broadcast
        # and the Node side doesn't have to maintain a separate
        # buildModelInput-style helper.
        globals_spatial = globals_vec.view(n, self.n_globals, 1, 1).expand(n, self.n_globals, self.h, self.w)
        x = torch.cat([grid, globals_spatial], dim=1)  # [N, 39, H, W]

        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))  # [N, 64, H, W]

        spatial_logits = self.action_head(x)  # [N, 10, H, W]

        pooled = F.adaptive_avg_pool2d(x, 1).flatten(1)  # [N, 64]
        trunk = F.relu(self.scalar_trunk(pooled))         # [N, 32]
        skip_logit = self.skip_head(trunk)                # [N, 1]
        value = self.value_head(trunk)                    # [N, 1]

        return spatial_logits, skip_logit, value

    def flat_logits(self, grid: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
        """
        Convenience: forward + pack into the flat ACTION_SPACE_SIZE
        layout (slot*936+cell for places, then upgrade, then sell,
        then skip). Same layout `packSpatialLogits` produces on the
        Node side. Useful for the BC trainer's masked-CE loss.

        returns: [N, ACTION_SPACE_SIZE]
        """
        spatial, skip_logit, _ = self.forward(grid, globals_vec)
        n = spatial.shape[0]
        # spatial: [N, 10, 26, 36] → flatten to [N, 10*26*36 = 9360]
        # in channel-major, row-major order (same as TypeScript side).
        flat_spatial = spatial.reshape(n, -1)
        # Concat with skip_logit → [N, 9361].
        return torch.cat([flat_spatial, skip_logit], dim=1)


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    # Smoke: build the net, forward random input, print param count.
    net = PPOPolicyNet()
    n = count_params(net)
    print(f'PPOPolicyNet params: {n:,}')
    g = torch.randn(2, OBS_CHANNELS, GRID_ROWS, GRID_COLS)
    glb = torch.randn(2, OBS_GLOBALS)
    sl, sk, v = net(g, glb)
    print(f'spatial_logits {tuple(sl.shape)}  skip_logit {tuple(sk.shape)}  value {tuple(v.shape)}')
    flat = net.flat_logits(g, glb)
    print(f'flat_logits    {tuple(flat.shape)}  (expected (2, {ACTION_SPACE_SIZE}))')
    assert flat.shape == (2, ACTION_SPACE_SIZE)
