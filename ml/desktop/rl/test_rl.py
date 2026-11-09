"""Verification tests for the RL prototype (ml/desktop/rl/).

Runs without torch: GAE math, trajectory parsing, and BC state
reconstruction are numpy-only (env.py). The policy forward/mask/export
tests run only if torch imports.

Usage:
    python3 ml/desktop/rl/test_rl.py
"""

import json
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import env  # noqa: E402


def test_gae_hand_computed():
    # 3-step episode, gamma=0.99, lam=0.95.
    # r = [1.0, 0.0, -1.0], V = [0.5, 0.2, -0.3], done only on last step.
    # delta_2 = -1.0 - (-0.3) = -0.7;            A_2 = -0.7
    # delta_1 = 0.0 + 0.99*(-0.3) - 0.2 = -0.497
    # A_1 = -0.497 + 0.99*0.95*(-0.7) = -1.15535
    # delta_0 = 1.0 + 0.99*0.2 - 0.5 = 0.698
    # A_0 = 0.698 + 0.99*0.95*(-1.15535) = -0.388606675
    ep = [
        {'reward': 1.0, 'value': 0.5, 'done': False},
        {'reward': 0.0, 'value': 0.2, 'done': False},
        {'reward': -1.0, 'value': -0.3, 'done': True},
    ]
    env.compute_gae([ep], gamma=0.99, lam=0.95)
    advs = [s['advantage'] for s in ep]
    rets = [s['return'] for s in ep]
    assert np.allclose(advs, [-0.388606675, -1.15535, -0.7], atol=1e-6), advs
    assert np.allclose(rets, [0.111393325, -0.95535, -1.0], atol=1e-6), rets
    print('GAE 3-step hand-computed: OK', advs)


def test_gae_mid_episode_done():
    # done=True mid-episode must cut the bootstrap (next value = 0).
    ep = [
        {'reward': 0.5, 'value': 0.1, 'done': False},
        {'reward': 0.5, 'value': 0.4, 'done': True},
    ]
    env.compute_gae([ep], gamma=0.99, lam=0.95)
    # delta_1 = 0.5 - 0.4 = 0.1; A_1 = 0.1; ret_1 = 0.5
    # delta_0 = 0.5 + 0.99*0.4 - 0.1 = 0.796; A_0 = 0.796 + 0.9405*0.1
    assert np.isclose(ep[1]['advantage'], 0.1, atol=1e-9)
    assert np.isclose(ep[0]['advantage'], 0.89005, atol=1e-6), ep[0]['advantage']
    assert np.isclose(ep[0]['return'], 0.99005, atol=1e-6)
    print('GAE mid-episode done cutoff: OK')


def test_load_trajectories():
    lines = [
        {'episode': 1, 'step': 1, 'state': [0.0] * 17, 'action': 0,
         'logprob': -1.0, 'value': 0.0, 'reward': 0.1,
         'mask': [1] * 9, 'done': True},
        {'episode': 0, 'step': 0, 'state': [0.0] * 17, 'action': 2,
         'logprob': -1.2, 'value': 0.1, 'reward': 0.0,
         'mask': [1] * 9, 'done': False},
        {'episode': 1, 'step': 0, 'state': [0.0] * 17, 'action': 7,
         'logprob': -0.5, 'value': 0.2, 'reward': 0.0,
         'mask': [1] * 9, 'done': False},
    ]
    with tempfile.NamedTemporaryFile('w', suffix='.jsonl', delete=False) as f:
        for row in lines:
            f.write(json.dumps(row) + '\n')
        path = f.name
    eps = env.load_trajectories(path)
    assert len(eps) == 2 and len(eps[0]) == 1 and len(eps[1]) == 2
    assert eps[1][0]['step'] == 0 and eps[1][1]['step'] == 1  # sorted
    print('load_trajectories grouping/sorting: OK')


def test_bc_state_reconstruction():
    try:
        import train_ppo
    except ImportError as e:
        print(f'BC test skipped (torch unavailable: {e})')
        return
    ex = {'faction': 'arcane', 'wave': 10, 'towerId': 'arcane_storm',
          'chosen': [7, 14],
          'board': [['arcane_bolt', 1, 13], ['arcane_bolt', 2, 13],
                    ['arcane_frost', 5, 10]]}
    rec = train_ppo.reconstruct_bc_state(ex)
    assert rec is not None
    state, action = rec
    assert len(state) == 17, len(state)
    # storm is build slot 2; [7, 14] is col bucket 1, row bucket 1 -> zone 7.
    assert action == 2 * env.ZONE_DIM + 7, action
    assert state[0] == 0.5 and state[1] == 1.0 and state[2] == 1.0
    assert state[3] == 0.03  # 3 towers / 100
    assert state[4] == 0.1 and state[5] == 0.05 and state[6] == 0.0
    # Board zones: (1,13) and (2,13) -> 6, (5,10) -> 0. Two occupied.
    assert np.isclose(state[15], 2 / env.ZONE_DIM), state[15]
    assert state[16] == 0.5
    # Non-build tower (e.g. conduit) is skipped, not crashed on.
    assert train_ppo.reconstruct_bc_state(
        {'wave': 0, 'towerId': 'arcane_conduit', 'chosen': [1, 1],
         'board': []}) is None
    # Missing placement cell is skipped (v2 needs a zone).
    assert train_ppo.reconstruct_bc_state(
        {'wave': 0, 'towerId': 'arcane_bolt', 'board': []}) is None
    # Real data: arcane examples exist and reconstruct to 17 dims.
    states, actions = train_ppo.load_bc_data(
        train_ppo.DEFAULT_BC_DATA, 'arcane')
    assert states is not None and states.shape[1] == 17
    print(f'BC state reconstruction: OK ({len(states)} arcane examples)')


def test_policy_forward_mask_export():
    try:
        import torch
        from policy import ActorCritic
    except ImportError as e:
        print(f'policy test skipped (torch unavailable: {e})')
        return
    torch.manual_seed(0)
    model = ActorCritic()
    x = torch.randn(4, 17)
    logits, value = model(x)
    assert logits.shape == (4, env.ACTION_DIM), logits.shape
    assert value.shape == (4, 1), value.shape
    # Masking: invalid actions get ~0 probability after softmax.
    mask = torch.ones(4, env.ACTION_DIM)
    mask[:, 3:] = 0  # only actions 0-2 valid
    logits_m, _ = model(x, mask)
    probs = torch.softmax(logits_m, dim=-1)
    assert torch.allclose(probs[:, 3:], torch.zeros(4, env.ACTION_DIM - 3), atol=1e-6)
    assert torch.allclose(probs.sum(-1), torch.ones(4), atol=1e-6)
    # act() returns a valid action / sane logprob / value.
    a, lp, v = model.act(torch.randn(17), torch.ones(env.ACTION_DIM))
    assert 0 <= a < env.ACTION_DIM and lp <= 0.0
    # Export -> load round trip preserves weights exactly.
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'policy.json'
        model.export_json(p)
        data = json.loads(p.read_text())
        assert data['state_dim'] == 17 and data['hidden'] == [128, 64]
        assert data['action_dim'] == env.ACTION_DIM
        assert len(data['layers']['trunk1_w']) == 128
        assert len(data['layers']['trunk1_w'][0]) == 17
        assert len(data['layers']['policy_w']) == env.ACTION_DIM
        model2 = ActorCritic.load_json(p)
        for k in model.state_dict():
            assert torch.equal(model.state_dict()[k], model2.state_dict()[k]), k
    print('policy forward shapes / masking / export-load round trip: OK')


def test_init_from_scorer_shape_mismatch():
    try:
        import torch
        from policy import ActorCritic
    except ImportError as e:
        print(f'scorer test skipped (torch unavailable: {e})')
        return
    # Fake scorer checkpoint: 11->128->64->1, same key layout as train_gpu.py.
    sd = {
        'net.0.weight': torch.randn(128, 11),
        'net.0.bias': torch.randn(128),
        'net.3.weight': torch.randn(64, 128),
        'net.3.bias': torch.randn(64),
        'net.6.weight': torch.randn(1, 64),
        'net.6.bias': torch.randn(1),
    }
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'scorer-arcane.pt'
        torch.save(sd, p)
        model = ActorCritic()
        before_trunk1 = model.trunk1.weight.clone()
        transferred = model.init_from_scorer(p)
        # trunk2 + value head transfer; trunk1 skipped (11 vs 17 inputs).
        assert 'trunk2.weight' in transferred, transferred
        assert 'value_head.weight' in transferred, transferred
        assert 'trunk1.weight' not in transferred
        assert torch.equal(model.trunk1.weight, before_trunk1)
        assert torch.equal(model.trunk2.weight, sd['net.3.weight'])
        assert torch.equal(model.value_head.weight, sd['net.6.weight'])
    print('init_from_scorer (transfer + shape-mismatch skip): OK')


if __name__ == '__main__':
    test_gae_hand_computed()
    test_gae_mid_episode_done()
    test_load_trajectories()
    test_bc_state_reconstruction()
    test_policy_forward_mask_export()
    test_init_from_scorer_shape_mismatch()
    print('ALL TESTS DONE')
