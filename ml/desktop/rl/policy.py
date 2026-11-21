"""PPO policy for the tower_defence RL prototype.

Supports two architectures (selected via `arch`):
  1. 'shared' (legacy):
     Shared trunk state_dim -> 128 -> 64 (ReLU), policy head 64 -> 86 (logits),
     value head 64 -> 1.
  2. 'decoupled_res' (v4):
     Separate Actor and Critic trunks with residual Tanh blocks and
     orthogonal initialization (gain sqrt(2) on trunk layers, 0.01 on
     policy head for uniform initial entropy, 1.0 on value head).
     Decoupling prevents high-variance value loss gradients from corrupting
     the policy representation over long training runs.

Weights are exchanged with the TypeScript brain (RLBrain) as JSON in the
shared contract format.
"""

import json
import logging
import math
from pathlib import Path

import torch
import torch.nn as nn

logger = logging.getLogger(__name__)

STATE_DIM = 17
HIDDEN = [128, 64]
ACTION_DIM = 86


def _ortho_linear(in_dim, out_dim, gain=math.sqrt(2.0)):
    layer = nn.Linear(in_dim, out_dim)
    nn.init.orthogonal_(layer.weight, gain=gain)
    nn.init.constant_(layer.bias, 0.0)
    return layer


class ActorCritic(nn.Module):
    def __init__(self, state_dim=STATE_DIM, hidden=HIDDEN,
                 action_dim=ACTION_DIM, arch='shared'):
        super().__init__()
        if arch not in ('shared', 'decoupled_res'):
            raise ValueError(f'unknown arch {arch!r}')
        self.arch = arch
        self.state_dim = state_dim
        self.hidden = list(hidden)
        self.action_dim = action_dim

        if arch == 'decoupled_res':
            d = hidden[0] if hidden else 128
            self.hidden = [d, d]
            self.actor_in = _ortho_linear(state_dim, d)
            self.actor_res1 = _ortho_linear(d, d)
            self.actor_res2 = _ortho_linear(d, d)
            self.policy_head = _ortho_linear(d, action_dim, gain=0.01)

            self.critic_in = _ortho_linear(state_dim, d)
            self.critic_res1 = _ortho_linear(d, d)
            self.critic_res2 = _ortho_linear(d, d)
            self.value_head = _ortho_linear(d, 1, gain=1.0)
        else:
            self.trunk1 = nn.Linear(state_dim, hidden[0])
            self.trunk2 = nn.Linear(hidden[0], hidden[1])
            self.policy_head = nn.Linear(hidden[1], action_dim)
            self.value_head = nn.Linear(hidden[1], 1)

    def forward(self, state, mask=None):
        """Return (logits, value).

        state: [B, state_dim] float tensor. mask: optional [B, action_dim]
        float tensor (1 = valid, 0 = invalid). The mask is applied to the
        logits (invalid -> -1e9) BEFORE any softmax.
        value: [B, 1].
        """
        if self.arch == 'decoupled_res':
            a0 = torch.tanh(self.actor_in(state))
            a1 = a0 + torch.tanh(self.actor_res1(a0))
            a2 = a1 + torch.tanh(self.actor_res2(a1))
            logits = self.policy_head(a2)

            c0 = torch.tanh(self.critic_in(state))
            c1 = c0 + torch.tanh(self.critic_res1(c0))
            c2 = c1 + torch.tanh(self.critic_res2(c1))
            value = self.value_head(c2)
        else:
            h1 = torch.relu(self.trunk1(state))
            h2 = torch.relu(self.trunk2(h1))
            logits = self.policy_head(h2)
            value = self.value_head(h2)

        if mask is not None:
            logits = logits.masked_fill(mask == 0, -1e9)
        return logits, value

    @torch.no_grad()
    def act(self, state, mask=None):
        """Sample one action. Returns (action:int, logprob:float, value:float)."""
        if not isinstance(state, torch.Tensor):
            state = torch.tensor(state, dtype=torch.float32)
        if state.dim() == 1:
            state = state.unsqueeze(0)
        if mask is not None and not isinstance(mask, torch.Tensor):
            mask = torch.tensor(mask, dtype=torch.float32)
        if mask is not None and mask.dim() == 1:
            mask = mask.unsqueeze(0)
        logits, value = self.forward(state, mask)
        dist = torch.distributions.Categorical(logits=logits)
        action = dist.sample()
        return (int(action.item()), float(dist.log_prob(action).item()),
                float(value.item()))

    def export_json(self, path):
        """Write weights in the shared contract format (nested lists)."""
        sd = self.state_dict()
        if self.arch == 'decoupled_res':
            layers = {
                'actor_in_w': sd['actor_in.weight'].tolist(),
                'actor_in_b': sd['actor_in.bias'].tolist(),
                'actor_res1_w': sd['actor_res1.weight'].tolist(),
                'actor_res1_b': sd['actor_res1.bias'].tolist(),
                'actor_res2_w': sd['actor_res2.weight'].tolist(),
                'actor_res2_b': sd['actor_res2.bias'].tolist(),
                'critic_in_w': sd['critic_in.weight'].tolist(),
                'critic_in_b': sd['critic_in.bias'].tolist(),
                'critic_res1_w': sd['critic_res1.weight'].tolist(),
                'critic_res1_b': sd['critic_res1.bias'].tolist(),
                'critic_res2_w': sd['critic_res2.weight'].tolist(),
                'critic_res2_b': sd['critic_res2.bias'].tolist(),
                'policy_w': sd['policy_head.weight'].tolist(),
                'policy_b': sd['policy_head.bias'].tolist(),
                'value_w': sd['value_head.weight'].tolist(),
                'value_b': sd['value_head.bias'].tolist(),
            }
        else:
            layers = {
                'trunk1_w': sd['trunk1.weight'].tolist(),
                'trunk1_b': sd['trunk1.bias'].tolist(),
                'trunk2_w': sd['trunk2.weight'].tolist(),
                'trunk2_b': sd['trunk2.bias'].tolist(),
                'policy_w': sd['policy_head.weight'].tolist(),
                'policy_b': sd['policy_head.bias'].tolist(),
                'value_w': sd['value_head.weight'].tolist(),
                'value_b': sd['value_head.bias'].tolist(),
            }
        out = {
            'arch': self.arch,
            'state_dim': self.state_dim,
            'hidden': self.hidden,
            'action_dim': self.action_dim,
            'layers': layers,
        }
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(out, f)
        return path

    @classmethod
    def load_json(cls, path):
        """Load weights from the shared contract format."""
        with open(path) as f:
            data = json.load(f)
        arch = data.get('arch', 'shared')
        model = cls(state_dim=data['state_dim'], hidden=data['hidden'],
                    action_dim=data['action_dim'], arch=arch)
        layers = data['layers']
        if arch == 'decoupled_res':
            sd = {
                'actor_in.weight': torch.tensor(layers['actor_in_w']),
                'actor_in.bias': torch.tensor(layers['actor_in_b']),
                'actor_res1.weight': torch.tensor(layers['actor_res1_w']),
                'actor_res1.bias': torch.tensor(layers['actor_res1_b']),
                'actor_res2.weight': torch.tensor(layers['actor_res2_w']),
                'actor_res2.bias': torch.tensor(layers['actor_res2_b']),
                'critic_in.weight': torch.tensor(layers['critic_in_w']),
                'critic_in.bias': torch.tensor(layers['critic_in_b']),
                'critic_res1.weight': torch.tensor(layers['critic_res1_w']),
                'critic_res1.bias': torch.tensor(layers['critic_res1_b']),
                'critic_res2.weight': torch.tensor(layers['critic_res2_w']),
                'critic_res2.bias': torch.tensor(layers['critic_res2_b']),
                'policy_head.weight': torch.tensor(layers['policy_w']),
                'policy_head.bias': torch.tensor(layers['policy_b']),
                'value_head.weight': torch.tensor(layers['value_w']),
                'value_head.bias': torch.tensor(layers['value_b']),
            }
        else:
            sd = {
                'trunk1.weight': torch.tensor(layers['trunk1_w']),
                'trunk1.bias': torch.tensor(layers['trunk1_b']),
                'trunk2.weight': torch.tensor(layers['trunk2_w']),
                'trunk2.bias': torch.tensor(layers['trunk2_b']),
                'policy_head.weight': torch.tensor(layers['policy_w']),
                'policy_head.bias': torch.tensor(layers['policy_b']),
                'value_head.weight': torch.tensor(layers['value_w']),
                'value_head.bias': torch.tensor(layers['value_b']),
            }
        model.load_state_dict(sd)
        return model

    def init_from_scorer(self, scorer_pt_path):
        """Initialize matching layers from an imitation scorer checkpoint."""
        path = Path(scorer_pt_path)
        if not path.exists():
            raise FileNotFoundError(f'scorer checkpoint not found: {path}')
        if self.arch != 'shared':
            logger.info('init_from_scorer: skipped for arch=%s (uses orthogonal init)',
                        self.arch)
            return []
        state = torch.load(path, map_location='cpu', weights_only=True)
        mapping = [
            ('net.0.weight', 'trunk1.weight', 'trunk1 (17->128)'),
            ('net.3.weight', 'trunk2.weight', 'trunk2 (128->64)'),
            ('net.6.weight', 'value_head.weight', 'value head (64->1)'),
        ]
        transferred = []
        own = self.state_dict()
        for src_w, dst_w, label in mapping:
            src_b = src_w.replace('weight', 'bias')
            dst_b = dst_w.replace('weight', 'bias')
            if src_w not in state or src_b not in state:
                logger.info('init_from_scorer: %s — keys missing, skipped', label)
                continue
            if state[src_w].shape != own[dst_w].shape:
                logger.info(
                    'init_from_scorer: %s — shape mismatch scorer %s vs '
                    'policy %s, skipped (random init kept)',
                    label, tuple(state[src_w].shape), tuple(own[dst_w].shape))
                continue
            own[dst_w] = state[src_w]
            own[dst_b] = state[src_b]
            transferred.append(dst_w)
            logger.info('init_from_scorer: transferred %s', label)
        self.load_state_dict(own)
        logger.info('init_from_scorer: policy head (64->86) has no scorer '
                    'counterpart — randomly initialized')
        return transferred
