# Rung 2 state (read after rung1 + cheap-clone state)

## What's built

### Infrastructure (durable across iterations)
- `Match.snapshot()` returns `MatchSnapshot` interface, throws if mid-wave
- `Match.restoreFromSnapshot(config, snapshot, brain)` static factory builds a fresh Match + applies snapshot state
- Determinism: 10/16 EXACT-match round-trips. Mismatches are wave-off-by-one with identical build hash — game state is captured correctly, only sim-timer drift remains
- See `scripts/test-snapshot-determinism.mjs` to re-verify after any change

### Beam search v2
- `BeamSearchBrain` — `src/systems/bots/brains/BeamSearchBrain.ts`
- K candidates per decision, each evaluated by `lookaheadWaves`-deep rollout with smart brain (OnlineMazeOptimizerBrain) playing the future
- One of the K candidates is "defer to rung1" — beam can decide "let rung1 choose here" when no specific placement is clearly best
- Score = `lives * 100 + wave * 10 + pathLen ± outcome bonus`

### Eval harness
- `scripts/eval-beam-search.mjs` — runs 4 brains (dumb, balanced, rung1, beam) across 5 maps with Wilson CIs
- `scripts/debug-beam.mjs` — single-match telemetry

## Smoke (one match plains seed 47919)
v2 beam reached wave 25 (cap) vs rung1's wave 17 on same seed. 49 towers placed. Deferred to rung1 47 times, committed to specific placement 2 times. ~10s wall time per match.

Suggests: beam mostly acts as rung1 (deferring) but occasionally overrides when it finds a clearly-better placement via lookahead. Lives=0 means lost overall but reached the cap.

## Full n=10 eval running now
~20+ min runtime. When done the CSV (`notes/rl/rung2-eval.csv`) will have plains/crossroads/fortress/serpentine/gauntlet results.

## What to look for in the result

**If beam-d3-w10 wins on plains** (any non-zero rate): rung 2 works. Scale to n=100 for confidence, then consider rung 3 (V-network) only if needed.

**If beam matches rung 1** on plains (still 0%) but improves elsewhere: scoring is partially right but doesn't crack plains. Likely needs longer lookahead or better candidate generation.

**If beam underperforms rung 1**: scoring still wrong. Probable fixes:
1. Use OnlineMazeOptimizerBrain in lookahead with a DIFFERENT inner brain for variety
2. Score over MORE waves (5+ instead of 3)
3. Weight pathLen more heavily (currently dominated by lives_remaining)

## Decision tree from here

1. Beam clears rung 2 bar (≥60% plains + ≥25% gauntlet): ship rung 2, done
2. Beam beats rung 1 but doesn't clear bar: iterate scoring once more, then escalate to rung 3
3. Beam matches or underperforms rung 1: rung 2 doesn't fit, go directly to rung 3 (train V-network on rung 1 data)

Path 3 is Option 3 from the menu — "skip to rung 3 (train V-network)". That was the user's "1 then 3" choice if 1 didn't work.
