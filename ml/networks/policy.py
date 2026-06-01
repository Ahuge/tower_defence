"""
PPO policy network — v2 architecture.

The v1 architecture (policy_v1.py) used a 3-layer conv-only encoder
with 7×7 effective receptive field on a 26×36 grid, no positional
encoding, and globals tiled-and-concatenated to the input. The 5-
critic synthesis (notes/rl/critic-synthesis.md) identified this as
fundamentally incapable of representing global maze structure on
a fixed-geometry map — and the held-out crossroads eval (0% wins
vs 35% on plains) confirmed it empirically.

v2 changes:
  1. CoordConv (+2 channels): explicit (x/W, y/H) coords in
     [-1, 1] so cells know "I am the far end of the map" without
     having to propagate that signal through convolutions.
  2. Learned positional embedding (+8 channels): per-cell learned
     embedding indexed by (row, col). Breaks translation
     equivariance — entry/exit are at fixed positions so the
     inductive bias should encode "this is the entry corner".
  3. FiLM globals conditioning: instead of tile-and-concat (which
     wasted ~11k of conv1's params re-learning that channels
     14-38 are spatially uniform), use a small MLP to produce
     per-channel (γ, β) modulation applied after conv2 and conv3.
  4. Dilated conv trunk: stride-1 3×3 convs with dilations
     (1, 2, 4, 8, 1) → effective RF ≈ 31×31, covering the full
     26×36 grid. The agent can now condition action choice at
     col=35 on what's happening at col=0.
  5. Tower-embedding action head: instead of 10 independent 1×1
     conv channels (one per slot, no sharing), learn a tower
     embedding `E ∈ R^{10×d}` and per-cell feature `f ∈ R^d`,
     compute logits as `f_c · E_k + b_k`. Parameter sharing across
     tower slots — "good wall cell" generalizes across types.

ONNX input/output contract (schema v1.1 unchanged):
  inputs:   grid    Float32 [N, 14, 26, 36]
            globals Float32 [N, 25]
  outputs:  spatial_logits Float32 [N, 10, 26, 36]
            skip_logit     Float32 [N, 1]
            value          Float32 [N, 1]

Param count target (PRD §6 P2-T3): <500k. Actual: ~150-170k.

The Node-side `PPOBrain.buildModelInput` remains a no-op — model
owns coord/pos-embed/FiLM internally so rollout files don't
change.
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


class FiLM(nn.Module):
    """Feature-wise Linear Modulation: given a context vector,
    produce per-channel (γ, β) and apply `γ * x + β` to a feature
    map. γ is initialized near 1 so the layer starts ~identity."""

    def __init__(self, context_dim: int, n_channels: int, hidden: int = 64) -> None:
        super().__init__()
        self.n_channels = n_channels
        self.net = nn.Sequential(
            nn.Linear(context_dim, hidden),
            nn.ReLU(inplace=True),
            nn.Linear(hidden, n_channels * 2),
        )
        # Initialize the final layer so γ≈1, β≈0 at init.
        with torch.no_grad():
            self.net[-1].weight.zero_()
            self.net[-1].bias.zero_()
            self.net[-1].bias[:n_channels].fill_(1.0)  # γ bias = 1
            # β bias stays 0

    def forward(self, x: torch.Tensor, context: torch.Tensor) -> torch.Tensor:
        # x: [N, C, H, W]
        # context: [N, context_dim]
        n = x.shape[0]
        gamma_beta = self.net(context)  # [N, 2C]
        gamma, beta = gamma_beta.chunk(2, dim=1)
        gamma = gamma.view(n, self.n_channels, 1, 1)
        beta = beta.view(n, self.n_channels, 1, 1)
        return gamma * x + beta


class PPOPolicyNet(nn.Module):
    """v2 architecture: positional + FiLM + dilated convs + tower embedding."""

    def __init__(
        self,
        n_game_ch: int = OBS_CHANNELS,
        n_globals: int = OBS_GLOBALS,
        h: int = GRID_ROWS,
        w: int = GRID_COLS,
        n_action_channels: int = SPATIAL_LOGIT_CHANNELS,
        pos_embed_dim: int = 8,
        tower_embed_dim: int = 16,
    ) -> None:
        super().__init__()
        self.h = h
        self.w = w
        self.n_globals = n_globals
        self.pos_embed_dim = pos_embed_dim
        self.tower_embed_dim = tower_embed_dim
        self.n_action_channels = n_action_channels

        # --- Static (non-learned) coord channels — registered as a
        # buffer so they're saved with the model and move with .to(device).
        coord_x = torch.linspace(-1, 1, w).view(1, 1, 1, w).expand(1, 1, h, w)
        coord_y = torch.linspace(-1, 1, h).view(1, 1, h, 1).expand(1, 1, h, w)
        self.register_buffer('coord_grid', torch.cat([coord_x, coord_y], dim=1))

        # --- Learned positional embedding indexed by (row, col).
        self.pos_embed = nn.Parameter(torch.randn(1, pos_embed_dim, h, w) * 0.01)

        # --- Conv trunk. Input = game (14) + coord (2) + pos_embed (8) = 24.
        # No globals tiling — globals enter via FiLM after conv2/conv3.
        in_ch = n_game_ch + 2 + pos_embed_dim  # 24
        self.conv1 = nn.Conv2d(in_ch, 32, kernel_size=3, padding=1, dilation=1)
        # Dilated convs to expand receptive field. With kernel=3:
        #   d=1: RF +2  (1→3)
        #   d=2: RF +4  (3→7)
        #   d=4: RF +8  (7→15)
        #   d=8: RF +16 (15→31)
        #   d=1 final: RF +2 (31→33)
        # 33×33 effective RF on a 26×36 grid — the action head at
        # col=35 can see col=0.
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=2, dilation=2)
        self.conv3 = nn.Conv2d(64, 64, kernel_size=3, padding=4, dilation=4)
        self.conv4 = nn.Conv2d(64, 64, kernel_size=3, padding=8, dilation=8)
        self.conv5 = nn.Conv2d(64, 64, kernel_size=3, padding=1, dilation=1)

        # --- FiLM modulation from globals, applied after conv3 + conv4.
        # Conditioned context = globals (25 dims).
        self.film_mid = FiLM(context_dim=n_globals, n_channels=64, hidden=64)
        self.film_late = FiLM(context_dim=n_globals, n_channels=64, hidden=64)

        # --- Tower-embedding action head.
        # Per-cell feature: 64 → tower_embed_dim via 1×1 conv.
        self.cell_proj = nn.Conv2d(64, tower_embed_dim, kernel_size=1)
        # Action embeddings: 10 actions (8 place + upgrade + sell).
        self.action_embed = nn.Embedding(n_action_channels, tower_embed_dim)
        self.action_bias = nn.Parameter(torch.zeros(n_action_channels))

        # --- Skip + value heads (from pooled features + globals).
        # Concatenate pooled CNN features (64) + globals (25) → 89 inputs.
        self.scalar_trunk = nn.Sequential(
            nn.Linear(64 + n_globals, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 32),
            nn.ReLU(inplace=True),
        )
        self.skip_head = nn.Linear(32, 1)
        self.value_head = nn.Linear(32, 1)

    def forward(self, grid: torch.Tensor, globals_vec: torch.Tensor):
        """
        grid:        [N, 14, 26, 36]   — game channels
        globals_vec: [N, 25]           — raw globals
        returns:     (spatial_logits [N, 10, 26, 36],
                      skip_logit     [N, 1],
                      value          [N, 1])
        """
        n = grid.shape[0]
        # Stack game + coord + learned pos_embed.
        coord = self.coord_grid.expand(n, -1, -1, -1)
        pos = self.pos_embed.expand(n, -1, -1, -1)
        x = torch.cat([grid, coord, pos], dim=1)  # [N, 24, H, W]

        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))
        # FiLM mid: condition feature map on globals.
        x = self.film_mid(x, globals_vec)
        x = F.relu(x)
        x = F.relu(self.conv4(x))
        x = self.film_late(x, globals_vec)
        x = F.relu(x)
        x = F.relu(self.conv5(x))  # [N, 64, H, W]

        # --- Spatial action head via tower embedding.
        # cell_proj: per-cell feature in tower_embed_dim space.
        cell_feat = self.cell_proj(x)  # [N, tower_embed_dim, H, W]
        # Compute logit for each (action, cell) as f_c · E_k + b_k.
        # action_embed: [n_action_channels, tower_embed_dim]
        # Reshape for batched matmul: spatial_logits[n, k, h, w]
        #   = sum_d cell_feat[n, d, h, w] * action_embed[k, d] + b[k]
        embed = self.action_embed.weight  # [n_action_channels, d]
        # einsum: cell_feat[n,d,h,w] × embed[k,d] → out[n,k,h,w]
        spatial_logits = torch.einsum('ndhw,kd->nkhw', cell_feat, embed)
        spatial_logits = spatial_logits + self.action_bias.view(1, -1, 1, 1)

        # --- Scalar heads (skip + value) from pooled features + globals.
        pooled = F.adaptive_avg_pool2d(x, 1).flatten(1)  # [N, 64]
        combined = torch.cat([pooled, globals_vec], dim=1)  # [N, 89]
        trunk = self.scalar_trunk(combined)                  # [N, 32]
        skip_logit = self.skip_head(trunk)                   # [N, 1]
        value = self.value_head(trunk)                       # [N, 1]

        return spatial_logits, skip_logit, value

    def flat_logits(self, grid: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
        """Pack (spatial, skip) into the flat ACTION_SPACE_SIZE layout."""
        spatial, skip_logit, _ = self.forward(grid, globals_vec)
        n = spatial.shape[0]
        flat_spatial = spatial.reshape(n, -1)
        return torch.cat([flat_spatial, skip_logit], dim=1)


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    net = PPOPolicyNet()
    n = count_params(net)
    print(f'PPOPolicyNet v2 params: {n:,}')

    # Per-module param counts so we can see where the budget goes.
    print('\nPer-module:')
    for name, m in net.named_children():
        p = sum(p.numel() for p in m.parameters() if p.requires_grad)
        print(f'  {name:20s} {p:>8,}')
    # Buffers + parameter tensors not in named_children:
    extra = (
        net.coord_grid.numel(),  # buffer, not trainable
        net.pos_embed.numel(),
        net.action_bias.numel(),
    )
    print(f'  pos_embed (param)    {extra[1]:>8,}')
    print(f'  action_bias (param)  {extra[2]:>8,}')
    print(f'  coord_grid (buffer)  {extra[0]:>8,}  (non-trainable)')

    # Smoke forward.
    g = torch.randn(2, OBS_CHANNELS, GRID_ROWS, GRID_COLS)
    glb = torch.randn(2, OBS_GLOBALS)
    sl, sk, v = net(g, glb)
    print(f'\nforward outputs:')
    print(f'  spatial_logits {tuple(sl.shape)}  skip_logit {tuple(sk.shape)}  value {tuple(v.shape)}')
    flat = net.flat_logits(g, glb)
    print(f'  flat_logits    {tuple(flat.shape)}  (expected (2, {ACTION_SPACE_SIZE}))')
    assert flat.shape == (2, ACTION_SPACE_SIZE), flat.shape
