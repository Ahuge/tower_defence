# RL Prototype — PPO for Tower Defence

Reinforcement learning that can eventually surpass imitation learning.
Faction-parameterized: arcane and psionic are wired up; the policy
shape (17-dim state, 9 actions) is shared, with trailing build slots
padded/masked for factions with fewer than 7 towers.

## Why RL, why arcane

Imitation learning hit its ceiling in eval-v7: better data + cleaner
features = worse results (85/550, psionic 13→0). The model can only copy
what Alex has done. RL learns from its own wins and losses and can
discover strategies nobody has tried.

Arcane is the first faction because it already wins 20/50 with the
imitation model — the faction is learnable, there's a working baseline
to beat, and improvement is measurable. Void at 0% would force RL to
discover everything from scratch with no way to tell a broken setup
from a hard faction.

## Architecture — two-stage

```
┌─────────────────────────────────────────────────────────┐
│  RL policy (WHAT)          Imitation scorer (WHERE)    │
│  17-dim state → 9 actions  cell → score                 │
│  "build frost"             "put it at (5, 12)"          │
└─────────────────────────────────────────────────────────┘
```

The RL policy decides **what** to do (which tower to build, when to
save, when to upgrade). The existing imitation placement scorer decides
**where** to put it. This reuses what works (the scorer knows Alex's
placement patterns) and lets RL focus on strategy — the part imitation
can't learn.

```
                    ┌──────────────┐
                    │ train_ppo.py │  Python (PyTorch)
                    │  PPO update  │
                    └──────┬───────┘
                           │ policy JSON
                           ▼
┌──────────────────────────────────────────────────────┐
│ run_episode.mts → runMatch → RLBrain.decide()        │  TypeScript
│  - extracts 17-dim state                             │
│  - runs policy forward pass                          │
│  - applies action mask, samples action               │
│  - places via LearnedScorer / saves / upgrades       │
│  - records (state, action, logprob, value, reward)   │
└──────────────────────────────────────────────────────┘
                           │ trajectories JSONL
                           ▼
                    ┌──────────────┐
                    │ train_ppo.py │  GAE → PPO update → new policy
                    └──────────────┘
```

## State (17 dims)

| # | Feature | Notes |
|---|---------|-------|
| 0 | wave / 20 | |
| 1 | gold / 1000 | |
| 2 | lives / 100 | |
| 3 | tower_count / 100 | |
| 4–10 | count per faction tower / 20 | arcane: bolt, frost, storm, focus, drain, meteor, nova; psionic: probe, mesmer, terror, mind_spike, overmind + 2 unused slots (always 0) |
| 11 | next wave creep count / 50 | from ctx.upcomingWaves[0] |
| 12 | next wave has armored 0/1 | |
| 13 | next wave has flying 0/1 | |
| 14 | next wave has shielded 0/1 | |
| 15 | betweenWaves 0/1 | |
| 16 | candidate cells / 936 | |

All values clamped to [0, 1]. The canonical order is defined in
`env.py` (`STATE_NAMES`) and mirrored in `RLBrain.ts` — they must stay
in sync.

## Action space (9 actions)

| # | Action |
|---|--------|
| 0–6 | build the faction's towers in cost order (arcane: bolt / frost / storm / focus / drain / meteor / nova; psionic: probe / mesmer / terror / mind_spike / overmind — slots 5–6 unused, permanently masked) |
| 7 | save (skip — ends the decision round, starts the next wave) |
| 8 | upgrade cheapest upgradable tower |

**Action masking:** build actions are valid only if affordable;
upgrade only if an upgradable affordable tower exists; save is always
valid. The mask is applied to logits (invalid → −1e9) before softmax,
both in the TS brain (when acting) and in Python (when recomputing
logprobs for the PPO loss). The mask is recorded in every trajectory
step.

**Send is excluded.** Standard mode has no send target
(`HeadlessMatch` returns false for sends), so including it would teach
the agent a no-op action.

## Policy network

```
17 → 128 (ReLU) → 64 (ReLU) → policy head → 9 logits (softmax)
                              → value head  → 1 (state value)
```

No dropout (PPO policies typically don't use it). ~11k parameters.

**Pre-training — two warm starts, both optional:**
1. **Behavior cloning** (`--pretrain`): trains the policy head with
   cross-entropy on the faction's examples from
   `ml/placement-data.jsonl` (state reconstructed from board/wave/
   gold/lives, action = tower built). Teaches "build what Alex
   builds". Arcane is thin — only 49 examples, mostly bolt — so it
   teaches little beyond "build bolt". Psionic is better: 106
   examples (65 probe, 34 mesmer, 7 terror; no mind_spike/overmind
   in his wins — his psionic games never built the expensive towers).
2. **Scorer weight transfer** (`--init-from-scorer`): copies the
   imitation scorer's 128→64 trunk layer and 64→1 output layer into
   the RL network (same shapes). The 17→128 first layer can't transfer
   (scorer is 11-dim input) and the 64→9 policy head is random.

## Reward function

Shaped (dense) reward, not just win/loss — sparse rewards make early
training nearly impossible when the agent dies at wave 3.

| Term | Value | Why |
|------|-------|-----|
| Wave cleared | +0.1 per wave | Surviving longer is the primary goal |
| Gold earned | +0.002 per gold, capped at +0.2/wave | Economy matters; dense signal for kills + income |
| Life lost | −0.05 per life (sweepable) | Leaks are costly, but a large penalty teaches hoarding |
| Gold spent | +0.002 per gold | Positive signal for investing in the board |
| Win | +1.0 terminal | The actual objective |
| Loss | −1.0 terminal | |

**Gold is income-based and floored at 0.** Income is
`budget_delta + gold_spent`, so spending gold is NOT punished. An
earlier version rewarded the raw delta, which taught the agent to never
build anything.

**Wave credit is distributed across the between-wave window.** A wave
outcome only becomes known at the next wave boundary, and the last
decision before a wave is usually a *forced* `save` (mask `000000010`).
A forced action has zero policy gradient, so crediting only the last
step threw the wave signal away and every build received reward 0 —
which is why psionic collapsed to spamming the cheapest tower. The
brain now keeps every decision since the last boundary in a window and
splits the outcome across it, weighted by `(1 + gold spent)`. Builds and
upgrades get most of the credit; the save gets a small share. The
terminal ±1 is distributed the same way.

**Build-investment reward.** Each build/upgrade also receives
`rewardBuildCoef × gold spent` (default 0.002) immediately. Without it a
large leak penalty dominates and the agent learns to hoard gold and die
(observed on psionic: 66% saves, wipe at wave 3). With it, psionic's
average wave went from 3.0 to 9.3 in 60 iterations.

**Known issue (mitigated):** early-training rewards run strongly
negative because a random policy loses many lives plus the terminal −1.
This is expected — the value function starts near 0 and learns the
negative baseline. The build-investment reward and smaller default leak
penalty soften it substantially.

## PPO hyperparameters

| Param | Default | Sweeped? |
|-------|---------|----------|
| Learning rate | 1e-3 (AdamW) | yes (`lr`) |
| Clip ratio | 0.2 | yes (`clip`) |
| Gamma (discount) | 0.99 | yes (`gamma`) |
| GAE lambda | 0.95 | yes (`lam`) |
| PPO epochs per update | 4 | yes (`ppo_epochs`) |
| Minibatch size | 64 | yes (`minibatch`) |
| Entropy coefficient | 0.3 → 0.05 annealed | yes (`entropy`, `entropy_final`) |
| Value loss coefficient | 0.5 | yes (`value_coef`) |
| Grad clip norm | 1.0 | no |

**Entropy annealing.** `--entropy-final` linearly anneals the entropy
coefficient over the run: high early exploration (to escape the
cheap-tower local optimum) and sharpening late. The trainer logs the
current coefficient, the per-action mix (`build/save/upg`), and the
argmax action every iteration, so a collapse to one action is visible in
the log instead of only in a post-hoc trajectory audit.

## Files

| File | What |
|------|------|
| `src/systems/bots/brains/RLBrain.ts` | BotBrain: state extraction, policy forward, masking, trajectory recording, lazy rewards |
| `ml/desktop/rl/run_episode.mts` | Episode runner: plays N matches, writes trajectories + summary |
| `ml/desktop/rl/policy.py` | ActorCritic, export/load JSON, scorer weight transfer |
| `ml/desktop/rl/env.py` | Constants, reward docs, trajectory loading, GAE, subprocess wrapper |
| `ml/desktop/rl/train_ppo.py` | PPO loop + BC pre-training (`--faction`) |
| `ml/desktop/rl/eval_rl.py` | Fixed-seed eval vs the faction's imitation baseline (`--faction`) |
| `ml/desktop/rl/test_rl.py` | Verification tests (GAE, masking, BC state) |
| `ml/desktop/rl/sweep.sh` | Hyperparameter sweep for one faction (`[hours] [faction]`) |
| `ml/desktop/rl/sweep-multi.sh` | Parallel sweeps for several factions (`[hours] faction...`) |
| `ml/desktop/rl/build-runner.mjs` | esbuild bundle for the episode runner |

## Usage

```bash
# Behavior-cloning warm start + PPO (50 iters × 32 episodes)
# Needs a CUDA torch install on the training machine.
python ml/desktop/rl/train_ppo.py --pretrain --faction arcane \
    --init-from-scorer ml/desktop/models/scorer-arcane.pt \
    --policy-out ml/desktop/rl/policy-arcane.json

# Psionic: same pipeline, different tower set + baseline (13/50)
python ml/desktop/rl/train_ppo.py --pretrain --faction psionic \
    --init-from-scorer ml/desktop/models/scorer-psionic.pt \
    --policy-out ml/desktop/rl/policy-psionic.json

# Resume from a checkpoint
python ml/desktop/rl/train_ppo.py \
    --resume ml/desktop/rl/checkpoints/ppo-arcane-iter5.pt --iters 20

# Evaluate a policy on 50 fixed seeds, deterministic
python ml/desktop/rl/eval_rl.py --policy ml/desktop/rl/policy-arcane.json \
    --faction arcane \
    --episodes 50 --deterministic --out ml/desktop/rl/eval-arcane.json
```

**Imitation baselines** (eval-v5, hard, 50 episodes) — what RL has
to beat: arcane 20/50 (40%), psionic 13/50 (26%). The psionic v7
collapse to 0/50 was a one-hot-removal artifact, so v5 is the
comparison point for both.

## Sweep config syntax

`sweep.sh` runs a fixed grid via `run_config NAME key=value ...`.
Defaults are the validated shaping config (lr 1e-3, entropy 0.3→0.05,
life 0.05, build 0.002, no BC), so a config only names what it varies:

```bash
run_config "v2-life-0.02" life=0.02
run_config "v2-lr-3e-3" lr=3e-3
run_config "v2-pretrain" pretrain=1 init_scorer=1
run_config "v2-ent-flat" entropy=0.3 entropy_final=
```

Keys: `lr entropy entropy_final clip life wave gold_coef gold_cap
build gamma lam ppo_epochs minibatch value_coef pretrain init_scorer
iters`. `pretrain=1` behavior-clones `ml/placement-data.jsonl`;
`init_scorer=1` initialises the trunk/heads from
`ml/desktop/models/scorer-<faction>.pt`. `entropy_final=` (empty)
disables annealing.

Every config writes one row to `summary.csv` (schema v2) with all
knobs, eval wins, avg wave, and mean reward. Phase 5 picks the best
non-BC config by **(wins, avg wave)** and runs it for 300 iterations.
The best policy is tracked with the same tie-break, so a 0-win config
that survives much deeper still replaces a shallower one. Config names
are prefixed `v2-` so results from the old reward code are never
mistaken for new ones on resume; an old `summary.csv` is archived to
`summary-legacy-<timestamp>.csv` when the schema changes.

## Multi-faction sweeps

A single sweep saturates roughly one core per worker during episode
collection, then goes quiet during the tiny PPO update, so one faction
leaves most of a many-core desktop idle. Run several factions at once
to use the hardware (workers are divided between them — see below):

```bash
# Two factions in parallel, 24h each
./ml/desktop/rl/sweep-multi.sh 24 arcane psionic

# Just psionic
./ml/desktop/rl/sweep-multi.sh 12 psionic

# See what would launch, without launching anything
./ml/desktop/rl/sweep-multi.sh --dry-run 24 arcane psionic
```

Each faction gets its own results dir
(`ml/desktop/rl/sweep-results-<faction>/`), traj dir, log
(`ml/desktop/rl/sweep-<faction>.log`), and best policy
(`ml/desktop/rl/policy-best-<faction>.json`), so parallel sweeps
never overwrite each other. `sweep-multi.sh` waits for all of them
and prints a combined summary at the end; Ctrl-C stops the waiting,
not the sweeps (they keep running in the background — stop one with
`kill "$(cat ml/desktop/rl/.sweep-<faction>.lock)"`).

**Double-launch protection:** `sweep.sh` writes its PID to
`ml/desktop/rl/.sweep-<faction>.lock` and refuses to start if a live
sweep for the same faction already holds it (a stale lock from a dead
process is reclaimed). The runner bundle is built once up front by
`sweep-multi.sh`; `sweep.sh` also builds it, behind a lock dir, if
it's stale.

**Workers are split across factions:** each sweep would default to
`$(nproc)` runners, so N factions meant N × `$(nproc)` Node processes
(2 factions on a 28-thread i7-14700K = 56 runnable processes on 28
threads). `sweep-multi.sh` now divides the *logical* CPU count across
the requested factions (28 threads / 2 factions = 14 workers each) and
exports `RL_WORKERS`. Keeping SMT siblings is worth it: 56 episodes
measured 2.44s on 28 workers vs 2.90s on 14 physical cores (~19% more
throughput). Pass `RL_WORKERS=10` to override the split explicitly.

**Push races:** parallel sweeps share the
`feature/imitation-placement` branch. Each sweep's end-of-run push
rebases and retries (up to 3 tries) if another sweep pushed first;
if all tries fail the results stay committed locally and the log
says so — push manually.

**Legacy results:** sweeps before the per-faction split wrote to
`ml/desktop/rl/sweep-results/` (arcane only). On first run, the
arcane sweep moves that dir into `sweep-results-arcane/` (renaming
the old one with a timestamp) so resume still finds the completed
configs.

**Stopping a running sweep before pulling:** bash reads a running
script from disk as it executes — pulling a new `sweep.sh` while one
is running can corrupt the run. Stop the sweep first (Ctrl-C in its
tmux session), then `git pull`, then relaunch.

**Timing estimate:** each headless match is ~0.5–2s of CPU (60-step
episodes are ~1s). With the fixes below, a 64–84 episode iteration
takes ~3–8s wall on 14–28 workers instead of 40–85s. The bottleneck is
game simulation, not the PPO update — the GPU sits idle by design (the
policy is a tiny 13k-param MLP).

**Parallel collection:** episodes are collected across `--workers`
parallel Node processes (default: CPU count, clamped to episode
count). Each worker gets its own trajectory/summary part file and its
own slice of the seeds (`--seeds`/`--seed-base` are split, never
duplicated); parts are merged into the single output files, so the
merged format is identical to a single-worker run. Speedup is roughly
linear up to core count *for the simulation-bound portion*. Lower
`--workers` if parallel Node processes run out of RAM.

**Bundled runner (startup):** each worker used to pay tsx startup
(transpiling the whole import graph) before simulating a single
episode. `node ml/desktop/rl/build-runner.mjs` bundles
`run_episode.mts` with esbuild into `run_episode.bundle.mjs` (plain
`node`, ~0.2s startup). `env.py` prefers the bundle when it exists and
falls back to tsx with a warning when it doesn't. The bundle is a build
artifact (gitignored), as are the scorer-model copies the build script
places in `ml/desktop/rl/models/` — `LearnedScorer` resolves models
relative to its own file, which after bundling is the bundle's
directory. `sweep.sh` builds the bundle up front (temp file + atomic
rename, so a running sweep never reads a partial bundle).

**The real startup killer was jsdom, not tsx.** `jsdom-setup.ts` used
to `import { JSDOM } from 'jsdom'` before every headless run. jsdom is
~10 MB across ~700 files plus its dependency tree; on a repo checked
out on WSL `/mnt/d` (DrvFs) that import alone took **25–45s wall and
~3s CPU per process** — and the sweep spawns one process per worker per
iteration. The harness now installs a ~1 ms hand-rolled DOM shim
(window/document/2d-canvas/localStorage) that is enough for Phaser's
import-time feature detection; headless game code never renders.
Set `TD_HEADLESS_DOM=jsdom` to force the old behaviour. One episode
went from ~27s wall to ~0.5s. This also speeds up `playtest/`,
`generate_data.mts` and brain-search, which share `jsdom-setup`.

**Per-episode I/O:** the runner batches a whole episode's trajectory
into one append instead of one `appendFileSync` per step (~60 sync
writes/episode; on `/mnt/d` that was ~0.4s/episode of blocked I/O).
`RLBrain` also caches the parsed policy JSON (240 KB) and scorer model
(210 KB) per process instead of re-reading them for every episode.

**Episodes per iteration:** the sweep targets ~3 episodes per worker
and rounds up to a multiple of `--workers` (minimum 64), e.g. 84 for
28 workers. A static split of 64 across 28 workers leaves 8 workers
with 3 episodes and 20 with 2, so most cores idle at the end of
collection. Override with `RL_EPISODES_PER_ITER`.

**PPO device:** `train_ppo.py` defaults to `--device auto`, which
picks **CPU**. The policy is 17→128→64→9 (~13k params); a PPO update
measured 0.29s on CPU vs 0.88s on an RTX 4070 because kernel-launch
latency dominates. Pass `--device cuda` to force the GPU. This is why
GPU utilisation stays near 0% — it is not the bottleneck.

```bash
# 8 parallel runners for training and eval
python ml/desktop/rl/train_ppo.py --pretrain --workers 8 \
    --init-from-scorer ml/desktop/models/scorer-arcane.pt \
    --policy-out ml/desktop/rl/policy-arcane.json
python ml/desktop/rl/eval_rl.py --policy ml/desktop/rl/policy-arcane.json \
    --episodes 50 --deterministic --workers 8 --out ml/desktop/rl/eval-arcane.json
```

**Torch:** this VM has CPU torch 2.15 in `~/.venvs/rl-torch` (for
verification only — too slow for real training). Alex's desktop needs
a CUDA torch install for actual runs.

## Verification status (2026-11-06)

- TS side: `tsc` clean. Random-policy smoke test (2 episodes):
  0 wins, avg wave 9.0. Trajectory validation passed on 50 steps
  (17-dim states in [0,1], masks match affordability, logprobs
  correct, rewards recompute from deltas). Deterministic mode is
  byte-identical across runs with the same seeds.
- Python side: GAE verified against hand-computed examples. Policy
  forward shapes correct, masking zeroes invalid actions after
  softmax, export→load round trip exact. PPO update on a synthetic
  batch produces finite losses.
- **End-to-end:** 1-iteration PPO run completed (Python → TS runner →
  trajectories → PPO update → checkpoint). BC warm start + 2-episode
  deterministic eval ran (avg wave 8.0 vs 3.5 for random policy).
- Untested: multi-iteration training, `--resume`, full 50-episode
  eval, CUDA path, real scorer checkpoint transfer (models live on
  Alex's desktop).

## Known limitations

- **Episode granularity, not tick-level.** Python can't step the game
  tick-by-tick — it drives whole episodes via subprocess. A
  persistent Node process with a JSON-RPC interface would be faster
  (no per-episode Node startup) and would allow mid-wave decisions.
  Future optimization, not needed for the prototype.
- **Between-waves decisions only.** The brain returns skip mid-wave.
  Mid-wave upgrades (spending kill gold during combat) are a real
  part of play but not yet in the action space.
- **No placement learning.** The WHERE is fixed to the imitation
  scorer. If the scorer is wrong for a situation, RL can't fix it.
  A future version could let RL pick the cell too (much larger action
  space — needs a CNN board encoding).
- **Single map (plains), single difficulty default (hard).**
- **BC data is thin** (49 arcane examples; psionic 106 is better) —
  the warm start is weak for arcane.
- **Reward shaping is a guess.** The +0.1/wave, −0.5/life weights
  were chosen by intuition, not tuned. If training stalls or the
  agent learns degenerate behavior (e.g. never spending gold, or
  spamming cheap towers), the reward function is the first thing to
  revisit.

## Next steps

1. **Run it.** Multi-iteration training on Alex's GPU. Watch whether
   win rate climbs above the 20/50 imitation baseline.
2. **Tune rewards** if the agent plateaus or learns degenerate
   behavior.
3. **Add mid-wave upgrade actions** (the brain already gets called
   mid-wave every 30 ticks).
4. **Expand to other factions** — psionic is wired up (5 towers,
   slots 5–6 padded/masked, baseline 13/50). Adding another faction
   is: a `FACTION_TOWERS` entry in `env.py` + `RL_FACTION_TOWERS` in
   `RLBrain.ts` + a baseline in `eval_rl.py` + the faction name in
   `sweep.sh`/`sweep-multi.sh`. Void is the interesting test: 0%
   imitation baseline means any RL win is pure discovery.
5. **CNN board encoding** — replace the 17-dim hand-crafted state
   with a spatial board representation so the policy can see the maze.
6. **Persistent Node process** (JSON-RPC) for faster episode
   collection once the pipeline is proven.
