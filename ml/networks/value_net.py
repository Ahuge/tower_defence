"""
ValueNet — V(state) → scalar in [-1, 1] predicting P(win)*2-1.

Architecture: reuses the v2 policy encoder (CoordConv +
positional + FiLM globals + dilated convs) but drops the policy
head, keeps a scalar value head. ~140k params.

Trained on (obs, outcome) pairs from self-play. MSE loss against
outcome target. Simple and direct — no PPO machinery, no policy
distillation, just value regression.

Used as the leaf evaluator in BeamSearchBrain (rung 3 of the
plan v3 escalation ladder): replaces the 3-wave forward-sim
scoring with a fast V network forward pass.
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


OBS_CHANNELS = 14
OBS_GLOBALS = 25
GRID_ROWS = 26
GRID_COLS = 36


class FiLM(nn.Module):
    """Feature-wise Linear Modulation. Same as policy.py."""

    def __init__(self, context_dim: int, n_channels: int, hidden: int = 64) -> None:
        super().__init__()
        self.n_channels = n_channels
        self.net = nn.Sequential(
            nn.Linear(context_dim, hidden),
            nn.ReLU(inplace=True),
            nn.Linear(hidden, n_channels * 2),
        )
        with torch.no_grad():
            self.net[-1].weight.zero_()
            self.net[-1].bias.zero_()
            self.net[-1].bias[:n_channels].fill_(1.0)

    def forward(self, x: torch.Tensor, context: torch.Tensor) -> torch.Tensor:
        n = x.shape[0]
        gamma_beta = self.net(context)
        gamma, beta = gamma_beta.chunk(2, dim=1)
        gamma = gamma.view(n, self.n_channels, 1, 1)
        beta = beta.view(n, self.n_channels, 1, 1)
        return gamma * x + beta


class ValueNet(nn.Module):
    """Same encoder as v2 PPOPolicyNet, value head only."""

    def __init__(
        self,
        n_game_ch: int = OBS_CHANNELS,
        n_globals: int = OBS_GLOBALS,
        h: int = GRID_ROWS,
        w: int = GRID_COLS,
        pos_embed_dim: int = 8,
    ) -> None:
        super().__init__()
        self.h = h
        self.w = w
        self.n_globals = n_globals
        self.pos_embed_dim = pos_embed_dim

        # CoordConv channels.
        coord_x = torch.linspace(-1, 1, w).view(1, 1, 1, w).expand(1, 1, h, w)
        coord_y = torch.linspace(-1, 1, h).view(1, 1, h, 1).expand(1, 1, h, w)
        self.register_buffer('coord_grid', torch.cat([coord_x, coord_y], dim=1))

        # Learned positional embedding.
        self.pos_embed = nn.Parameter(torch.randn(1, pos_embed_dim, h, w) * 0.01)

        # Dilated conv trunk.
        in_ch = n_game_ch + 2 + pos_embed_dim  # 24
        self.conv1 = nn.Conv2d(in_ch, 32, kernel_size=3, padding=1, dilation=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=2, dilation=2)
        self.conv3 = nn.Conv2d(64, 64, kernel_size=3, padding=4, dilation=4)
        self.conv4 = nn.Conv2d(64, 64, kernel_size=3, padding=8, dilation=8)
        self.conv5 = nn.Conv2d(64, 64, kernel_size=3, padding=1, dilation=1)

        # FiLM.
        self.film_mid = FiLM(context_dim=n_globals, n_channels=64, hidden=64)
        self.film_late = FiLM(context_dim=n_globals, n_channels=64, hidden=64)

        # Value head: pooled features + globals → scalar.
        self.scalar_trunk = nn.Sequential(
            nn.Linear(64 + n_globals, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 32),
            nn.ReLU(inplace=True),
        )
        self.value_head = nn.Linear(32, 1)

    def forward(self, grid: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
        """Returns value [N, 1] in (-1, 1) via tanh."""
        n = grid.shape[0]
        coord = self.coord_grid.expand(n, -1, -1, -1)
        pos = self.pos_embed.expand(n, -1, -1, -1)
        x = torch.cat([grid, coord, pos], dim=1)

        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))
        x = self.film_mid(x, globals_vec)
        x = F.relu(x)
        x = F.relu(self.conv4(x))
        x = self.film_late(x, globals_vec)
        x = F.relu(x)
        x = F.relu(self.conv5(x))

        pooled = F.adaptive_avg_pool2d(x, 1).flatten(1)
        combined = torch.cat([pooled, globals_vec], dim=1)
        trunk = self.scalar_trunk(combined)
        value = torch.tanh(self.value_head(trunk))
        return value


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    net = ValueNet()
    n = count_params(net)
    print(f'ValueNet params: {n:,}')

    g = torch.randn(2, OBS_CHANNELS, GRID_ROWS, GRID_COLS)
    glb = torch.randn(2, OBS_GLOBALS)
    v = net(g, glb)
    print(f'value shape: {tuple(v.shape)}')
    assert v.shape == (2, 1)
