# BotBrain v4 — Adversarial Self-Play

## Why v4

v1–v3.4 progressively built up a single-agent optimization system: the
TowerPlacer brain places towers to maximize a score function over a
fixed creep mix. The "adversarial" name in `AdversarialBeam.ts` refers
to path-extension dynamics — BFS represents creeps finding the shortest
route — but the creeps don't *learn* or *respond*. Wave compositions
are static, picked from `WaveDefinitions.ts` based on difficulty.

This caps win rate on cells where:
- **The optimal static layout still loses to specific late-game waves.**
  Mechanical, Nature, Military all sit at 0/50 on plains/normal because
  no fixed tower mix clears the wave 18+ creep compositions reliably.
- **The wave generator is exploitable.** A real human attacker would
  pick send mixes that target the bot's weaknesses; the bot has never
  faced that pressure during tuning.
- **Synergy-heavy kits don't get tested under stress.** Harmonic's
  amplifier chain looks good against medium-armor swarms but collapses
  against high-armor + flying mix; brain-search currently can't see
  this because it runs against fixed waves.

v4 introduces a **second agent — the WaveDirector** — that adversarially
optimizes against the TowerPlacer's current strategy. Self-play between
the two converges toward a more robust placer.

## Architecture

### Two-agent self-play loop

```
                ┌─────────────────────┐
                │  Generation N       │
                ├─────────────────────┤
                │ TowerPlacer_N       │
                │   (current best)    │
                │ WaveDirector_N        │
                │   (current best)    │
                └─────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            ↓                           ↓
   ┌────────────────┐         ┌────────────────┐
   │ Optimize       │         │ Optimize       │
   │ TowerPlacer    │         │ WaveDirector     │
   │ vs WaveDirector_N│         │ vs TowerPlacer_N│
   └────────┬───────┘         └────────┬───────┘
            ↓                           ↓
   ┌────────────────┐         ┌────────────────┐
   │ TowerPlacer_N+1│         │ WaveDirector_N+1 │
   └────────┬───────┘         └────────┬───────┘
            └────────────┬──────────────┘
                         ↓
              ┌─────────────────┐
              │ Min-max:        │
              │ TowerPlacer_N+1 │
              │ vs WaveDirector_N+1│
              │  → fitness      │
              └─────────────────┘
```

### Components to build

#### 1. `WaveDirectorBrain` (new agent type)

The WaveDirector is the **wave-composer adversary** — for each upcoming
wave, it picks the creep mix that best pressures the defender's current
layout. **It is NOT the player-facing "send" mechanic** (which is a
gold-cost interrupt action in versus mode); the WaveDirector replaces
the static `WaveDefinitions` generator only.

**Hard invariant: creeps cannot damage towers.** The WaveDirector's
action space is constrained to creep-type / count / hp-or-speed scale
within the difficulty curve's bounds. No new creep abilities, no
"tower-attacker" creep type, no creeps that grant damage to other
creeps' attacks. Outcome is identical to current TD: more creeps
reach exit → more lives lost. Towers are untouchable as in v1-v3.5.

```ts
interface WaveDirectorBrain {
  name: string;
  init(ctx: WaveDirectorContext): void;
  /** Called once between waves. Returns the wave's creep composition. */
  decide(ctx: WaveDirectorContext): WaveDecision;
}

interface WaveDirectorContext {
  wave: number;                    // current wave index
  livesRemaining: number;          // defender's lives — director's "objective"
  observedTowers: PlacedTower[];   // what the defender built (visible)
  observedPath: PathPoint[];       // current creep route through the maze
  upcomingHorizon: number;         // waves ahead to plan for
  creepCatalog: CreepType[];       // available creep types (per difficulty)
  hpScaleBounds: { min: number; max: number };  // ±20% around nominal
  speedScaleBounds: { min: number; max: number };
}

type WaveDecision = { kind: 'wave'; groups: WaveCreepGroup[] };
```

The decision is always a fully-specified wave composition. There's no
"skip" or "send" branch — every wave fires, the director just picks
which creeps populate it within the difficulty bounds.

#### 2. WaveDirector brains (initial roster)

Start with 3 WaveDirectors covering the strategic spectrum:

- **`UniformWaveDirector`** — picks creep mix uniformly across types.
  Baseline that mimics current static wave generator.
- **`CounterPickWaveDirector`** — observes placed towers, picks creeps
  whose armor/behavior counters the bot's tower mix. E.g. bot placed
  splash → send shielded; bot placed slow → send fast.
- **`AdversarialSearchWaveDirector`** — runs a 1-step lookahead: for
  each candidate creep mix, simulates the bot's likely placements,
  picks the mix that maximizes leak count. Mini-beam-search.

#### 3. Engine hooks for wave-director dispatch

`SpawnManager` and `WaveController` currently read static
`WaveDefinitions[]`. Need to plumb a `WaveDirectorBrain` hook that
generates `WaveDefinition` per wave at runtime. Affects:

- `MatchConfig` gains `waveDirectorId?: string`
- `HeadlessMatch.runMatchInner` instantiates the WaveDirector if set,
  calls `decide()` between waves, materializes the chosen creep mix
- `WaveController` emits "between-wave" events the WaveDirector subscribes to
- (No separate attacker economy — wave compositions are scaled by
  difficulty/wave-index, not by an attacker gold budget. That keeps
  WaveDirector strictly a wave-composer, not a "sender".)

#### 4. Two-agent brain-search

Extend `BrainSearchManager` to support paired-evolution:

- `TowerPlacerSchema` (existing MazingBrainSchema) — known-good
- `WaveDirectorSchema` (new) — knobs for the picker's behavior
- Match config takes `placerParams` + `pickerParams`
- Self-play loop alternates: tune placer vs frozen picker, then
  tune picker vs frozen placer
- Convergence detection: when neither side improves > ε for K generations

#### 5. Min-max fitness

Match outcome: leak count + waveReached.
- TowerPlacer minimizes leaks (current win-rate definition)
- WaveDirector maximizes leaks
- Two fitness functions; both use the same EvalRecord shape

## Implementation order

### Phase 4.1: WaveDirectorBrain interface + UniformWaveDirector

- Define `WaveDirectorBrain` + `WaveDirectorContext` + `WaveDecision`
- Implement `UniformWaveDirector` (currently-static wave generator
  reimplemented as a brain)
- Plumb `MatchConfig.waveDirectorId` through `HeadlessMatch`
- Verify: with `waveDirectorId='uniform'` (or omitted), behavior
  matches current static-wave system (regression-clean)

Estimated: 3-4 days. Mostly mechanical refactoring of wave generation
into a brain interface.

### Phase 4.2: CounterPickWaveDirector + wave-director tests

- Implement counter-pick logic (observed towers → creep weakness)
- Match harness needs to expose tower observations to WaveDirector
- Brain tests for counter-pick: when bot places X, picker should
  prefer Y
- Run all existing TowerPlacer brains vs CounterPickWaveDirector;
  measure win-rate delta vs UniformWaveDirector

Estimated: 2-3 days.

### Phase 4.3: Two-agent brain-search

- `BrainSearchManager` parametrized by which agent is being tuned
  (placer or picker)
- New `--mode=self-play` CLI flag that alternates generations
- Convergence + checkpointing per generation
- Results dir: `brain-search/v4-{faction}-{difficulty}/gen-N/...`

Estimated: 3-4 days.

### Phase 4.4: AdversarialSearchWaveDirector

- Mini-beam-search inside the WaveDirector
- Lookahead: 1 wave ahead, simulate placer's response (using cached
  placer plan from previous wave), pick creep mix with highest
  expected leaks
- Compute cost: this is the expensive new piece. Need to budget
  ~2× the placer's beam time for the picker.

Estimated: 4-5 days.

### Phase 4.5: Per-faction self-play tuning + matrix update

- Run self-play for each faction × difficulty cell
- Compare: v3.4 TowerPlacer vs v4 TowerPlacer-from-self-play
- Goal: reclaim the unwinnable cells (mechanical, nature, military)
- Update BrainSelector with v4 winners

Estimated: 1-2 days of compute (parallel) + analysis.

**Total v4 effort: ~2-3 weeks of focused work.**

## What v4 unlocks

- **Robust placers** — the TowerPlacer is no longer overfit to a fixed
  wave generator; it has been stress-tested against an adversary.
- **Variety as emergent behavior** — facing a counter-picker, the
  placer naturally diversifies tower choices to avoid being countered.
  The v3.3 variety knob becomes redundant in many cases.
- **New game modes** — the WaveDirector brain becomes the AI for human-vs-CPU
  matches where the human plays the attacker. Repurposable for
  competitive multiplayer scenarios.
- **Learning brain reborn** — the existing LearningBrain pipeline
  consumes human captures; v4's adversarial mode could train both
  agents simultaneously from human-vs-human captures.

## What v4 does NOT solve

- **Faction balance** — if the kit is genuinely undertuned (low DPS for
  cost), no amount of tower placement will save it. v4 finds the best
  PLACEMENT given a kit; balance fixes the kit itself.
- **Engine performance** — self-play multiplies the beam search cost
  (placer + picker run interleaved). v3.4 M4 BFS dedup is the start;
  v4 will need further optimization (incremental scoring, per-tower
  contribution caching) before self-play is fast enough for production
  brain-search.
- **Cross-faction transfer** — each (faction, difficulty) cell still
  needs its own self-play tune. No "learn once, apply everywhere"
  emerging from this design.

## Decision points to lock before starting

1. **Wave-director action space.** Allowing arbitrary creep compositions
   per wave is too unconstrained. Realistic options:
   - "Pick from a fixed roster of 5 wave templates per difficulty"
   - "Pick a creep type + count, scale by difficulty curve"
   - "Adjust hp/speed multipliers within ±20% of nominal"
   We need to commit to one. **Recommendation**: middle option —
   gives the picker enough variety to be interesting without breaking
   the player's mental model of the difficulty curve.

2. **Self-play vs centralized eval.** Either:
   - Each generation, optimize one side fully then swap (clean but slow)
   - Co-evolve in a single search (faster but harder to debug)
   **Recommendation**: alternating generations. Easier to diagnose and
   matches existing brain-search infrastructure.

3. **Match length.** Self-play matches need to be long enough for
   strategy to matter but short enough to run thousands per
   generation. **Recommendation**: keep the existing 20-wave default;
   add a 30-wave "stress test" mode for final validation.

4. **WaveDirector economy?** The in-game "send" mechanic is a
   versus-mode player action with gold cost and unlock tiers — that's
   separate from this work. The WaveDirector replaces only the static
   wave generator; it doesn't queue sends. **Recommendation**: no
   economy for the WaveDirector — its action space is bounded by
   difficulty/wave-index curves, not by gold. Keeps the abstraction
   clean and prevents conflating with the player-facing send system.
