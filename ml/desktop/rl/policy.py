"""PPO policy for the tower_defence RL prototype (arcane faction).

Shared trunk 17 -> 128 -> 64 (ReLU), policy head 64 -> 9 (logits),
value head 64 -> 1. No dropout in the RL policy.

Weights are exchanged with the TypeScript brain (RLBrain) as JSON in the
shared contract format:
    {"state_dim": 17, "hidden": [128, 64], "action_dim": 9,
     "layers": {"trunk1_w": [[out][in]], "trunk1_b": [...],
                "trunk2_w": ..., "trunk2_b": ...,
                "policy_w": ..., "policy_b": ...,
                "value_w": ..., "value_b": ...}}
Forward (TS side): h1 = relu(W1.x + b1); h2 = relu(W2.h1 + b2);
logits = Wpi.h2 + bpi; value = Wv.h2 + bv.
"""

import json
import logging
from pathlib import Path

import torch
import torch.nn as nn

logger = logging.getLogger(__name__)

STATE_DIM = 17
HIDDEN = [128, 64]
ACTION_DIM = 9


class ActorCritic(nn.Module):
    def __init__(self, state_dim=STATE_DIM, hidden=HIDDEN,
                 action_dim=ACTION_DIM):
        super().__init__()
        self.state_dim = state_dim
        self.hidden = list(hidden)
        self.action_dim = action_dim
        self.trunk1 = nn.Linear(state_dim, hidden[0])
        self.trunk2 = nn.Linear(hidden[0], hidden[1])
        self.policy_head = nn.Linear(hidden[1], action_dim)
        self.value_head = nn.Linear(hidden[1], 1)

    def forward(self, state, mask=None):
        """Return (logits, value).

        state: [B, 17] float tensor. mask: optional [B, 9] float tensor
        (1 = valid, 0 = invalid). The mask is applied to the logits
        (invalid -> -1e9) BEFORE any softmax — the caller handles softmax.
        value: [B, 1].
        """
        h1 = torch.relu(self.trunk1(state))
        h2 = torch.relu(self.trunk2(h1))
        logits = self.policy_head(h2)
        if mask is not None:
            logits = logits.masked_fill(mask == 0, -1e9)
        value = self.value_head(h2)
        return logits, value

    @torch.no_grad()
    def act(self, state, mask=None):
        """Sample one action. Returns (action:int, logprob:float, value:float).

        state: [17] tensor/array or [1, 17]. mask: [9] tensor/array or None.
        Used for eval/testing — the TypeScript brain does the acting during
        training rollouts.
        """
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
        model = cls(state_dim=data['state_dim'], hidden=data['hidden'],
                    action_dim=data['action_dim'])
        layers = data['layers']
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
        """Initialize matching layers from an imitation scorer checkpoint.

        The scorer is 11 -> 128 -> 64 -> 1 (see ml/desktop/train_gpu.py):
        its 128 -> 64 trunk layer and 64 -> 1 output layer have the same
        shapes as this policy's trunk2 and value head and transfer
        directly. Its 17 -> 128 first layer does NOT match (11 inputs vs
        17) and is skipped; the 64 -> 9 policy head has no scorer
        counterpart and stays randomly initialized.

        Returns the list of transferred layer names. Logs what happened.
        """
        path = Path(scorer_pt_path)
        if not path.exists():
            raise FileNotFoundError(f'scorer checkpoint not found: {path}')
        state = torch.load(path, map_location='cpu', weights_only=True)
        # Scorer keys (nn.Sequential in train_gpu.py): net.0 = Linear(11,128),
        # net.3 = Linear(128,64), net.6 = Linear(64,1). Tolerate a plain
        # state dict with the same suffixes.
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
        logger.info('init_from_scorer: policy head (64->9) has no scorer '
                    'counterpart — randomly initialized')
        return transferred
