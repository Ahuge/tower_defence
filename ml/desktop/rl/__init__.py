"""RL prototype (PPO) for the tower_defence game — Python side, arcane faction.

Modules:
    env.py        state/action/reward contract, trajectory loading, GAE,
                  subprocess wrapper around the TypeScript episode runner.
    policy.py     ActorCritic (17 -> 128 -> 64, policy head -> 9, value -> 1)
                  + JSON weight export/import in the shared contract format.
    train_ppo.py  PPO loop + behavior-cloning warm start from placement data.
    eval_rl.py    fixed-seed evaluation vs the imitation baseline (20/50 hard).

The game itself runs in TypeScript (RLBrain + run_episode.mts); Python only
reads trajectory JSONL and writes policy weight JSON.
"""
