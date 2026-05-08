# v4 Adversarial Self-Play: Loop + Entropy Strategy

Sequel to `BRAIN_V4_PLAN.md`. v4.1 + v4.2b shipped the
WaveDirectorBrain interface and lazy generation. This document plans
the **co-evolution loop** between defender and director, and how we
seed it with enough entropy that both sides can actually find good
strategies.

## The fundamental problem

Pure self-play has a degenerate failure mode. If the director starts
weak, the defender solves the static-wave problem and gets locked in.
If the director gets stronger, the defender is now overfit to the
weak-director regime and collapses. Both sides ratchet down to a
local optimum that's brittle outside the loop. Classic GAN-style
mode collapse.

We avoid this with three mechanisms:

1. **Asymmetric ramp** — director starts very dumb, gets smarter
   slowly. Defender always faces a director slightly weaker than its
   current capability.
2. **Population diversity** — at every generation, the defender's
   "opponent pool" includes the current director PLUS frozen earlier
   versions. Defender can't overfit to one director if it's evaluated
   against many.
3. **Forced exploration** — both sides pay an exploration tax in
   their fitness. Defender that wins 100% against current director
   but uses only one tower is graded down vs. one that wins 95% with
   varied placements.

## The loop

```
                ┌───────────────────────────────────────┐
                │  Generation 0 (seed)                  │
                │   Defender: BalancedBrain (existing)  │
                │   Director: UniformWaveDirector       │
                └─────────────────┬─────────────────────┘
                                  ↓
                      ┌──────────────────────┐
                      │ Outer loop: every K  │
                      │ defender generations │
                      │   advance director.  │
                      └──────────┬───────────┘
                                 ↓
              ┌───────────────────────────────────────┐
              │ Defender phase (1 generation):         │
              │   - brain-search 300 evals             │
              │   - opponent: current director +       │
              │     last 2 frozen director generations │
              │     (round-robin per eval seed)        │
              │   - fitness = win_rate +               │
              │     diversityWeight·entropy +          │
              │     waveBonus                          │
              └─────────────────┬─────────────────────┘
                                ↓
                    Every K=3 defender generations:
                                ↓
              ┌───────────────────────────────────────┐
              │ Director phase (1 generation):         │
              │   - brain-search over WaveDirector     │
              │     params (creep-pick weights, mix    │
              │     temperature, lookahead horizon)    │
              │   - opponent: current best defender +  │
              │     last 2 frozen defender generations │
              │   - fitness = leak_rate (mirror of     │
              │     defender's win rate) +             │
              │     mixDiversityWeight·entropy         │
              └─────────────────┬─────────────────────┘
                                ↓
                  Repeat until convergence:
                  neither side improves > ε for 5 outer rounds
```

### Generation cadence

- **K=3 defender gens per director gen**. The defender's space is much
  larger (50× per the user's intuition), so it gets more iterations
  per round. Director catches up only as fast as we let it.
- **Defender first, director second**. Generation 0 ships a director
  (uniform) that's known-good; generation 1 advances the defender
  against it. Director learns later, after the defender has shown
  it can beat the easy case.

### Frozen-pool round-robin

When tuning the defender, each seed of the brain-search eval rolls a
random opponent from `[current_director, frozen_gen-1, frozen_gen-2]`.
This breaks the over-fit-to-current-director failure mode without
multiplying compute (each eval is still N seeds, just N seeds
distributed across 3 opponents).

Frozen directors are stored as JSON params in
`brain-search/v4/director-gen-{N}.json`; loading is a registry lookup.

## Entropy seeding — the hard part

Both agents need enough exploration during brain-search to escape
local optima. Three layers of entropy:

### Layer 1: search-time exploration (already in place)

The (μ+λ) ES with Gaussian mutation already handles this for
defender. We tune `mutationSigma` per-knob in the schemas (low for
discrete strategy indices, high for continuous weights).

### Layer 2: opponent-pool entropy (new — the round-robin above)

Round-robin across 3 directors per eval forces the defender's
optimal config to generalise. A defender that wins 50/50 vs current
director but only 30/50 vs gen-1 director will lose to one that wins
45/45/45 across all three.

### Layer 3: action-space stochasticity within agents (new)

The director itself should be **stochastic** at runtime, not
deterministic. Two-creep-mix (e.g. 60% heavy + 40% swarm) sampled
each wave, not picked deterministically. Why: a deterministic
director is fully predictable to a defender doing brain-search; the
defender's optimum is "the one config that beats the deterministic
opponent's exact sequence." A stochastic director forces the
defender to learn a robust strategy.

The director's params therefore include a `temperature` knob. At
temp=0, deterministic argmax pick. At temp→∞, uniform random. Brain-
search tunes temperature: low temp produces sharper exploits but
brittle, high temp produces uniform-like behaviour but robust. The
optimum is non-zero somewhere in the middle.

### Layer 4: starting-config diversity (new)

Without this, brain-search starts every run from the same defaults
and finds the same local optimum. Add a `--seed-from=path` flag that
loads μ parents from a previous run's `brain-search/.../parents.json`
*plus* `μ-1` random restarts injected with high-σ Gaussian noise.
The first parent stays near the prior solution; the rest explore
fresh.

For the very first defender generation, μ parents are:
1. v3.5 brain-search winner per faction (the existing tuned configs)
2. v3.5 winner + Gaussian noise σ=0.3 on every continuous knob
3. v3.5 winner with `enable_*` toggles randomised (swap one toggle's
   state to its opposite).

This guarantees the search starts somewhere reasonable but doesn't
collapse to "we already know the answer."

## What entropy does the WaveDirector specifically need?

The director's action space is **wave composition**: pick creep types
(from the difficulty's catalog), counts, hp/speed scale (±20% of
nominal). For v4.2a (CounterPickWaveDirector), the params are:

- `splash_target_weight`, `pierce_target_weight`, etc — bias toward
  creep types that counter the defender's most common tower trait.
- `randomness_temperature` — softmax over the counter scores. Low
  temp = always pick the strongest counter, high temp = uniform.
- `min_creep_diversity` — minimum number of distinct creep types in
  any wave (1 = monoculture allowed, 3 = always at least 3 types).
  Forces non-degenerate compositions.
- `boss_frequency` — likelihood of bosses in late waves vs. nominal.

For v4.2b future (AdversarialSearchWaveDirector), additional params:

- `lookahead_waves` — 0 (greedy) to 3 (look ahead 3 waves and pick
  the mix that maximises cumulative leaks).
- `tower_obs_weight` — how much to bias toward exploiting *placed*
  towers vs. faction-wide weakness.

## Convergence + termination

The loop terminates when one of:

1. **Plateau**: neither side improves average fitness by > 0.02
   across 5 consecutive outer rounds. Likely converged on Nash-ish
   equilibrium; further optimization is noise.
2. **Cycle detection**: defender's best fitness oscillates by > 0.1
   between rounds for 3+ rounds. Indicates rock-paper-scissors
   instability — saved as "unstable cell," output is mean of last 3
   rounds rather than current.
3. **Hard cap**: 30 outer rounds. Each outer round is K=3 defender
   gens + 1 director gen ≈ 4 brain-search runs ≈ 12-20 minutes per
   cell. 30 rounds × 20 min = 10 hours per cell maximum.

## Compute budget

Per (faction, difficulty) cell:

- Defender gen: 300 evals × 20 seeds ≈ 3 minutes (current rate with
  4 workers + v3.4 BFS dedup)
- Director gen: ~150 evals × 20 seeds ≈ 1.5 minutes (smaller schema)
- Outer round: 3 × 3 + 1 × 1.5 = 10.5 minutes
- 30 rounds = 5.25 hours worst case, 10-15 rounds typical = 1.75-2.6
  hours per cell

For 11 factions × 1 difficulty (normal): ~20-30 hours total compute.
Parallelisable across cells; 4 cells in parallel = ~8 hours.

## Output: what we keep

After self-play, `brain-search/v4-{faction}-{difficulty}/`:
- `defender.json` — final tuned defender params
- `director.json` — final tuned director params
- `frozen-defenders/` — last 5 generations for round-robin in future runs
- `frozen-directors/` — same for directors
- `convergence.json` — fitness history per round (for diagnostics)
- `evaluations.jsonl` — full eval log

Production deployment uses ONLY the defender; the director is kept
purely for re-running the loop on schema changes.

## What this does NOT solve

- **Cross-cell transfer**. Each (faction, difficulty) cell still
  needs its own self-play tune. We're not learning a meta-strategy
  that transfers.
- **Engine balance**. If a faction's kit is genuinely too weak, the
  defender will lose at every director level. v4 finds the best
  PLACEMENT given a kit; balance fixes the kit.
- **Multiplayer**. v4 is a tool for the single-player vs. CPU
  experience. Real multiplayer (versus mode) has human attackers
  with sends — that's a different system.

## Implementation order from here

1. **v4.2a — `CounterPickWaveDirector`** (next, ~1 day). Observes
   placed towers via WaveObservation, picks creep mix that counters.
   Stochastic via temperature knob. Schema in
   `WaveDirectorBrainSchema.ts` (new) for brain-search.
2. **v4.3 — Two-agent brain-search** (~3 days). Modify
   BrainSearchManager to support paired-evolution. Frozen-pool
   round-robin. Layer 4 entropy seeding from prior runs.
3. **v4.4 — Self-play CLI** (~2 days). `scripts/self-play.mjs`
   orchestrates the outer loop, persists frozen pools, tracks
   convergence. Resume support.
4. **v4.5 — Per-cell self-play tuning** (compute, ~1 day human +
   compute). Run across all 11 factions, validate vs v3.5 baseline.
5. **v4.6 — Update BrainSelector + brain-coverage matrix** with v4
   winners.
