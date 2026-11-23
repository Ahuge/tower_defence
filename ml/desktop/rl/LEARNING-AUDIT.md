# RL learning audit (2026-11-07)

Why the first PPO sweeps learned almost nothing, what was changed, and
what the evidence says. This is the reference for interpreting sweep
results and deciding what to try next.

## TL;DR

The policy's **wave reward was landing on a forced `SAVE` action**
(mask `000000010`), where the policy gradient is exactly zero. Every
build therefore received reward 0, so the agent learned a build/save
*rhythm* but never learned *which tower* to build. Psionic collapsed to
spamming the cheapest tower (2653 of 3857 actions = probe). A second
problem: a large leak penalty dominated everything and taught hoarding.

After fixing credit assignment and adding a positive build-investment
reward, psionic's average wave went **3.0 → 10.0 in 300 iterations**
with a healthy 51/21/29 build/save/upgrade mix. It still does not win
(0/50 vs the 13/50 imitation baseline), so the remaining gap is likely
state representation / placement quality, not the reward signal.

## Evidence from the old runs

| Faction | Policy | Actions | Entropy (late) | Avg wave |
|---|---|---|---|---|
| arcane | long run, lr 1e-3 | mixed builds + upgrades, 30% save | ~0.5–0.6 | 20.0 (50/50 wins) |
| psionic | long run, life 0.5 | **69% probe builds**, 17% save | ~0.14–0.23 | 9.5 (0/50) |

Per-action reward in the old arcane winning trajectory:

```
action 0-5 (builds): mean reward ~0.00
action 7   (SAVE):   mean reward +0.26
action 8   (UPGRADE): mean reward +0.00
```

The wave outcome was credited to the save that launched the wave. A
forced save has zero gradient, so the signal was discarded. Builds got
nothing, which is why the cheapest tower (always affordable, always
legal) became the default.

## What changed

1. **Window credit assignment** (`RLBrain.settleWindow`). Every
   between-wave decision is kept in a window. When the next wave
   boundary is observed, the outcome (wave reward + gold income − life
   penalty) is split across the window weighted by `(1 + gold spent)`.
   Builds/upgrades get most of the credit; the save gets a small share.
   The terminal ±1 is distributed the same way.

2. **Build-investment reward** (`rewardBuildCoef`, default 0.002/gold).
   Immediate positive reward for spending on builds/upgrades. Without
   it, `life_penalty=0.5` made building look harmful: psionic learned to
   save 66% of the time and died at wave 3.

3. **Gold is income-based**: `budget_delta + gold_spent`, capped per
   wave. Spending is never punished.

4. **Entropy annealing** (`--entropy-final`): 0.3 → 0.05 over the run.
   High early exploration, sharpening late. This prevents the early
   collapse to a cheap-tower local optimum.

5. **Action-mix logging**: every iteration logs
   `mix(build/save/upg)=… top=<action>`, so a collapse is visible
   immediately instead of only in a post-hoc trajectory audit.

6. **Sweep v2**: named `key=value` configs, pretrain/init toggles, all
   PPO knobs sweepable, `(wins, avg_wave)` best-config tie-break,
   per-config trajectory dirs.

## Why BC did not help psionic

`ml/placement-data.jsonl` has 106 psionic examples:
**65 probe / 34 mesmer / 7 terror**. The data is placement data recorded
from mixed play, not expert build order, and it is heavily probe-biased.
Behavior-cloning it reinforces the same cheap-tower bias the RL run was
already stuck in. The sweep now includes `v2-pretrain` and
`v2-init-scorer` configs so this can be measured against from-scratch.

## Open questions / suggested next steps

- **Dead state feature — fixed.** State index 15 was `betweenWaves`,
  always 1 because the brain only acts between waves. It is now
  `occupied zones / 12` (v2 policies); v1 policies still see the old
  constant so they remain evaluable.
- **Placement quality — partially fixed.** The policy now chooses both
  *what* and *which of 12 zones* to build in; the imitation
  `LearnedScorer` chooses the exact cell inside that zone. This breaks
  the "blob of towers" failure where every build landed in the scorer's
  favourite region. Whether zone granularity is enough (vs. per-cell)
  is an open question for the next sweep.
- **Better BC data.** Generate build-order demonstrations from
  `StrategistBrain` (record its `place` decisions as tower × zone
  actions) instead of reusing placement data. Balance or reweight by
  tower so probe does not dominate.
- **Periodic evaluation.** The trainer only evaluates at the end of a
  config. A mid-run eval every N iterations would catch collapse or
  regression and enable best-checkpoint selection.
- **Longer horizon / gamma.** Episodes are ~70 steps; gamma 0.99 has an
  effective horizon of ~100, which is reasonable. If credit still feels
  diffuse, try gamma 0.995.

## How to inspect a sweep

```bash
python ml/desktop/rl/analyze_sweep.py ml/desktop/rl/sweep-results-psionic
```

It prints the eval table (wins, avg wave, reward) plus first→last
training dynamics (wave, entropy, action mix) and flags `COLLAPSED`
(one action category >70%), `LOW-ENTROPY` (<0.20), `EARLY-WIPE`
(final wave <4), and `REGRESSED` (ended >1 wave below peak).
