# 5-Critic Synthesis: Why The RL System Is Stuck

Five independent ML engineers (RL/PPO, network architect, BC/imitation, reward design, methodology) reviewed the system. Their findings converge brutally.

## The headline (all 5 agree)

**The system has independent, serious defects at every layer.** Not "one knob away from working." The "improvement" pattern across v3→v6 was likely never statistically real — the measurement apparatus can't distinguish 50% wins from 0% wins at n=20. Each fix moved one variable without measuring whether anything actually changed. Six iterations of unmeasured, confounded changes.

## What each critic identified

### 1. RL/PPO specialist
- **Value function is probably broken.** No diagnostics logged. γ=0.995 over 100-decision episodes with 16 episodes/iter = noise-dominated advantages.
- **KL ≈ 0.01/iter** means the clip never engages — PPO is barely moving the policy.
- **Sample budget 100× too small** for mode-escape from peaked BC prior. 960 episodes can't dislodge a 9361-way distribution.
- **Higher BC top1 → worse PPO climb** (v4@43%→50% wins, v6@65%→0% wins). Peaked prior kills gradient on un-tried actions.

### 2. Network architect
- **Receptive field 7×7 on 26×36 grid — physically impossible to see entry and exit simultaneously.** The convnet can only emit local *textures* (exactly what we see: "parallel-horizontal lines with bumps").
- **No positional encoding** despite a fixed entry/exit map. Translation equivariance is the wrong inductive bias.
- **10 independent action channels** (one per tower slot) — no shared "good cell" latent across tower types.
- **Globals tile-and-concat** wastes ~11k params re-learning that channels 14-38 are spatially uniform.

### 3. BC / imitation learning
- **Higher BC top1 IS the failure signal, not the success signal.**
- **Teacher is stochastic and multimodal** (top-K=5, random affordable types, flip-v augmentation, 5-brain rotation). Same `(obs, ctx)` produces 25-35 different action labels across the dataset.
- **flip-v augmentation is a label catastrophe** — asks one head to assign p≈0.5 to two contradictory cells. Argmax picks neither — picks the *centroid* between them. This **exactly explains v5/v6's "out-of-order, towers in the middle, doing nothing" pattern**.
- **No outcome filtering.** Losing matches weighted equally to winning ones — BC clones a losing policy.
- **Wave-gate filter destroys the most informative signal** — the brain's *intent* to place gets dropped mid-wave.

### 4. Reward design
- **"Your reward function has one optimum and the policy found it."** 7 shaping terms all describe variants of one geometric property — their joint argmax is ONE template.
- **Stalling and losing is reward-positive.** wave-bonus (+0.1 × 15 = +1.5) > winBonus (+1.0). A 20-wave drag-out → +3 shaping − 1 loss = +2.
- **L×C is an L² reward-hack** (coverage scales with L, multiplying = quadratic). Single global maximum.
- **Box-in ⊂ corridor ⊂ turns** — paying 2-3× for the same wall cells.

### 5. Methodology
- **"You're not running experiments — you're running demonstrations."**
- Wilson 95% CI on 10/20 wins = **[29%, 71%]**. v4's "50% wins" is statistically indistinguishable from v6's "0% wins". The 6-version improvement story is **likely noise the whole way through.**
- **No baselines logged in the same protocol** — we don't know if PPO even beats BalancedBrain solo or random.
- **Single PPO seed per version** — never measured seed variance vs version variance.
- **No held-out map** — don't know if we learned "maze" or "Plains-shaped placements".
- **Confounded version diffs** (each version changed 2-3 things). Even with perfect measurement, attribution impossible.

## Convergent recommendations (cross-critic alignment)

| recommendation | RL | Arch | BC | Reward | Method |
|---|---|---|---|---|---|
| Measurement crisis must be fixed first | weak | weak | — | — | **strong** |
| Teacher generates contradictory labels (multimodal, stochastic) | — | — | **strong** | weak | — |
| Reward function has one peak / overlapping terms | — | — | — | **strong** | — |
| Value learning needs diagnostics | **strong** | — | — | — | weak |
| Receptive field is too small | — | **strong** | — | — | — |
| Sample budget too small | **strong** | — | weak | — | — |
| Higher BC top1 ≠ better | **strong** | — | **strong** | — | — |
| Pivot from "more changes" → "measure what we have" | weak | — | — | — | **strong** |

## The order of operations (synthesized)

The methodology critic is right that we **must not** keep iterating on technical changes without fixing the measurement crisis first — every other critic's recommendation would otherwise be evaluated against the same broken eval.

**Stage 1 — measurement (this week, compute only, ~4 hours dev):**
1. Run **100-match Wilson-CI baselines** for: random brain, BalancedBrain solo, OptimizerBrain teacher itself, BC v4 alone, PPO v4. Same map, same waves.
2. Run **PPO v4 five times from same BC, different seeds** (5 × 60 iter ≈ 10h). Measure final win-rate variance.
3. **Hold-out evaluation on one non-Plains map** (any). Run v4 PPO + BalancedBrain on it.

This costs compute, not engineering. After stage 1, one of three things is true:
- The teacher ceiling is low (OptimizerBrain doesn't actually win much itself) → fix the teacher
- PPO seed variance is huge (σ ≥ 15%) → the v3-v6 story was all noise → fix eval before any technical changes
- Plains→held-out collapses → memorized terrain, need multi-map training

**Stage 2 — fix the teacher (if methodology shows ceiling exists):**
- Single deterministic teacher: K=1 cell pick, single brain, single W*, single transform
- Win-only outcome filter on training data
- Stop dropping in-wave place proposals — record as skip with intent annotation
- Validate via greedy BC rollout matching teacher's W* shape

**Stage 3 — simplify rewards:**
- Cut from 7 terms to 2-3: outcome + ONE terminal maze quality scalar (or: outcome + corridor only, between-wave only)
- Wave bonus → terminal, lives-conditional (kill stall hack)

**Stage 4 — architecture:**
- Positional embedding + FiLM globals (~75k → ~85k params)
- Dilated convs to reach full-grid receptive field
- Tower embedding action head (parameter sharing across slots)

**Stage 5 — PPO machinery:**
- Add explained-variance, clip-fraction, per-epoch KL logging
- Lower γ to 0.99
- KL-based epoch early-stop
- Broaden BC prior before PPO (divide final layer logits by 2-3)
- 5-10× sample budget OR switch to ES/CEM for mode escape

## What we should NOT do next

Pre-emptively rejected by multiple critics:
- More reward shaping terms (4 critics)
- Higher entropy regularization in BC (BC critic, RL critic)
- Throw out OptimizerBrain teacher approach without measuring it first (methodology critic)
- More PPO iters / different hyperparameter tweaks (all 5)
- Scaling network depth/channels without RF expansion (network critic)
- Per-decision rotation of brains (BC critic)

## The "is it salvageable" verdict

Yes — but **the measurement crisis must be fixed before any other change**. The methodology critic is unambiguous: doing more BC→PPO iterations now is wasted compute and wasted engineering time. We literally cannot tell if the technical fixes from the other 4 critics would help or hurt.
