# BotBrain v6 — Human Pattern Learning

## The diagnosis pivot

v5 produced reproducible win-rate gains by tuning faction-internal
parameters. **The plan now is to NOT apply those.** Per-cell playtester
data (hundreds of humans) shows every faction is winnable at easy /
normal / hard for typical players. The v5 wins were "make the kit
easier so the bot can win" — applying them would gut the human
experience.

The real diagnosis: **the brain plays differently than humans, and
worse.** v5's diff per cell is now most useful as a *signal of where
the brain is most divergent from human strategy*. The cells with the
biggest required cost-cuts (mechanical -45%, harmonic -50%, celestial
-52%) are where the brain understands the kit least.

v6 makes the brain learn human patterns instead of asking the kit to
accommodate the brain.

## Existing infrastructure (don't rebuild)

`src/systems/bots/learning/` has the LearningBrain pipeline:
- `LiveCapture.ts` — records human gameplay decisions to in-memory log
- `RecorderBrain.ts` — wraps any brain in headless to capture bot data
- `FeatureExtractor.ts` — single source of feature truth (56-dim flat)
- `TreeInference.ts` — pure-TS XGBoost JSON walker
- `LearningBrain.ts` — runtime: scores 10 brains' proposals through the model
- `ml/train.py` — Python xgboost trainer, weights human rows
- `models/brain-q-model.json` — committed model artefact (~1MB, 250 trees)
- `scripts/validate-learning-brain.mjs` — n=50 vs best-of-existing per cell

**Why XGBoost not NN**: gradient-boosted trees are robust on small
data (~hundreds of human rows), browser inference is instant
(comparison + lookups), no autodiff infrastructure needed. A small NN
would need 10× more data to learn the same patterns from a
56-dim feature vector. We'll re-evaluate if v6.2 plateaus due to
representation limits (not data sparsity).

## Why the existing setup hasn't closed the gap

1. **Sparse human data.** Per CLAUDE.md captures-handling, current
   captured/ contains a Cypherpunk match and not much else. ~1 match
   per faction is too few; the model can't generalize from one
   example. Human players have dozens of patterns per faction; one
   capture sees a thin slice.
2. **The model SCORES proposals**, doesn't pick moves directly. It
   re-ranks candidates from existing brains (Mazing, Greedy, etc.).
   If none of the candidates look human-shaped, the model's "best"
   pick is still un-human.
3. **Bot-flavored features.** The 56-dim feature vector was designed
   around the brain's existing decision space (tower role, path
   coverage, budget). It probably misses signals humans use:
   - Tower-tower spatial relationships ("is there a slow within range
     of this DPS placement?")
   - Wave-timing patterns ("hold gold for ult next wave")
   - Map-shape priors ("this is a chokepoint")

## Three-phase plan

### v6.1 — Capture campaign + UX (~1 week + playtest time)

**Goal**: get from ~10 human matches in `ml/captured/` to 100-500.

**v6.1.a — Capture toggle UI**. In-game visible toggle (settings
screen or sidebar) that:
- Enables/disables `__learningCapture` recorder
- Shows a "RECORDING" indicator while active
- Auto-stops at match end and prompts for download (or auto-saves to
  IndexedDB / file-system)
- Auto-tags the capture file with faction / difficulty / map / outcome
  / wave-reached / playtime
- Stores captures even if user closes tab (IndexedDB persistence)

**v6.1.b — Capture campaign**. Roll out to playtester base. Goal:
5-10 matches per (faction, difficulty=normal) cell × 11 factions
= 55-110 matches. Hard difficulty: another 55-110.
For diversity, ask each playtester to play different factions.

**v6.1.c — Capture quality controls**. CLAUDE.md already documents
the modifier-lock pattern. Extend with:
- Skip captures where match aborted (player rage-quit < wave 5)
- Skip captures with ≤30 decisions (too short to be informative)
- Tag captures with player skill level (self-reported: novice /
  intermediate / expert) so we can train per-skill models if needed.

**Deliverable**: `ml/captured/` populated. CHANGELOG entry tracking
distribution per faction × difficulty.

### v6.2 — Behavioral-cloning brain (~3-5 days)

**Goal**: a brain that DIRECTLY picks human-likely moves, not one
that scores other brains' candidates.

**v6.2.a — `ImitationBrain`**. New brain in
`src/systems/bots/brains/ImitationBrain.ts`:
- At each `decide(ctx)`, enumerate every legal action (place tower
  type T at cell C, upgrade existing tower, send, frontier, skip)
- Score each via the trained model (P(action | state))
- Sample with temperature: low temp = argmax (always best),
  high temp = stochastic (mimics human variability)

**v6.2.b — Behavioral-cloning training**. Modify `ml/train.py` to
support a `mode=imitation` flag:
- Input: per-decision (state, chosen_action) rows from captures
- Output: classifier P(action | state)
- Action space: discrete categorical over (tower_id × cell) + (upgrade
  cell) + (sell cell) + (send option) + (frontier option) + skip

**v6.2.c — Validation**. Compare ImitationBrain vs Mazing vs Balanced
on the per-cell coverage matrix. Goal: ImitationBrain matches or
exceeds Mazing on cells where humans win (most cells), without
requiring kit changes.

### v6.3 — Pattern mining + soft priors (~1 week)

**Goal**: find recurring (state-shape → action) patterns in human
captures and inject as priors in the existing planner.

**v6.3.a — Pattern miner**. Offline analysis script that finds:
- Spatial patterns: "humans place a slow tower at cells (a±2, b±2)
  by wave 5 with probability P"
- Tower-pair patterns: "humans pair Amplifier with Resonator within
  range R with probability P"
- Timing patterns: "humans save for ult after placing N walls"
- Output: `ml/patterns/<faction>.json` — list of (predicate, action,
  prior_weight) tuples.

**v6.3.b — Pattern-aware scorer**. New `HumanPriorScorer` in
`src/systems/bots/mazing/scorers/`:
- Reads pattern file at brain init.
- For each candidate placement, checks which patterns its predicate
  matches.
- Adds a bonus proportional to the pattern's prior weight.

**v6.3.c — Validation**. Re-run brain-coverage matrix with
HumanPriorScorer enabled. Goal: cells where v3.5 mazing was
struggling (mechanical, military, nature, harmonic) recover via
human patterns rather than kit changes.

## Diagnostic loop integration

Every time we collect new human captures:
1. Retrain LearningBrain (`ml/train.py`)
2. Validate against per-cell baselines
3. Surface remaining gap: "on cell X, model still picks A but humans
   pick B with probability P"
4. Attribute gap to: missing feature, missing pattern, or missing
   capture diversity

This is the feedback loop the existing CLAUDE.md sketches. v6 just
makes it produce more data through more captures and richer features.

## What v6 explicitly does NOT do

- **Tune kits.** We have v5 if we ever decide a kit is genuinely
  weak; for now we treat v5 results as diagnostics, not prescriptions.
- **Buff existing brains.** v3.5 mazing, v4 self-play, v5 self-balance
  are all production-stable. v6 adds an alternative path (LearningBrain,
  ImitationBrain) without breaking what works.
- **Change difficulty curve / wave generator.** Those are tuned for
  humans. We're tuning the brain to play the game humans play, not
  building a different game.

## Success criteria

v6 is successful when:
1. LearningBrain wins 30+/50 on cells where Mazing wins 0-5/50 in
   v3.5 (mechanical, military, nature, celestial, arcane) **without
   any kit changes**.
2. No regression on cells where existing brains already win (void,
   infernal, aliens, harmonic).
3. Human captures show < 1pp validation drift week-over-week as the
   dataset grows (model is generalizing, not memorizing one player).

## Estimated effort

- v6.1 (capture UX): 3-5 days code + playtest cycle for data collection
- v6.2 (ImitationBrain): 3-5 days
- v6.3 (pattern mining): 5-7 days
- Total: ~3 weeks engineering + ongoing playtest data trickle.
