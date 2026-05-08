# v4 self-play — first production run results

First real compute on the v4 architecture (v4.1–v4.6 shipped earlier).
Three cells run, ~25–35 min each (4 workers, 6 outer rounds, 120 defender
evals + 60 director evals per phase). Results are diagnostic, not yet
production-promoted.

## Cells tested

### military / normal / plains
- v3.5 baseline: 0/50 wins
- v4 self-play: **0/100 plateau across all 5 rounds** (early plateau-converged)
- defender survives to wave 4.2 reliably; no parameter combination
  in the explored space let the kit clear counter-pick wave 5+
- **Conclusion**: structurally unwinnable for mazing. The Military
  tower kit (sandbag/wire walls + mobile units) lacks DPS density
  to handle counter-pick wave compositions. This is a *kit-balance
  finding*, not a search-quality finding — no amount of v4 tuning
  fixes a kit that genuinely can't survive the adversary.

### mechanical / normal / plains
- v3.5 baseline: 0/50 wins
- v4 self-play: **0/100 plateau across all 5 rounds**
- defender survives to wave 4.2 reliably; same plateau as military
- **Conclusion**: same diagnosis. Mech kit can't handle counter-pick.

### harmonic / normal / plains
- v3.5 baseline: 1/50 (3/100 at higher n)
- v4 self-play across 6 rounds:
  - Round 1: 1% wins (warm-start), director 99% leak
  - Round 2: 4%, director 100%
  - Round 3: 3%, director 99%
  - Round 4: 4%, director 99%
  - **Round 5: 7%** (best), director 100%
  - Round 6: 4%, director 100%
- defender-gen-5 + defender-gen-6 vs Balanced n=100 plains/normal:
  - v3.5 (faction config): 3/100
  - v4 gen-5: **7/100**
  - v4 gen-6: **7/100**
- **Conclusion**: real but small directional gain (+4pp) consistent
  across both v4 defender generations and both validation sample
  sizes. **Not statistically significant at n=100** (binomial 95% CI
  for 3% vs 7% overlaps), so not worth promoting to production
  without more compute or wider validation. The v4 defender IS more
  robust under adversarial pressure (~7% vs uniform mirrors the 7%
  it scored vs counter_pick at gen-5), which is the right shape of
  improvement; the magnitude is just modest.

## What this validates

- **Architecture works as designed** — the self-play loop converges,
  round-robin pool expansion behaves correctly, plateau detection
  triggers when both sides stabilise, brain-search successfully
  searches both sides via env injection.
- **Adversarial dynamics are real** — director's leak rate climbed
  98% → 99% → 100% as it adapted to each new defender; defender
  oscillated 1→4→3→4→7→4 as it tried to stay ahead. This is the
  expected GAN-style co-evolution pattern, including the "best
  defender comes from a peak gen, not the latest" subtlety
  (gen-5 > gen-6 in the harmonic run).
- **Plateau detection saves compute** — military and mechanical
  early-converged at round 5 with 0% defender, avoiding the full
  6-round budget when neither side could move.

## What this doesn't validate

- **Production deployment value is unclear**. None of the three runs
  produced a defender we'd promote with confidence. Harmonic +4pp is
  at the noise threshold; military and mechanical found nothing.
- **Cells where v3.5 already wins (void 49/50, infernal 48/50,
  aliens 38/50) weren't tested**. v4 might find marginal robustness
  improvements there too, but the gain ceiling is small.

## Limits surfaced

- **Counter-pick is too strong for some kits**. The default
  CounterPickWaveDirector at temperature=2.0 hits 100% leak rate on
  military / mechanical no matter what the defender does. Either:
  - The director needs a difficulty cap (don't be 100% optimal vs
    weak kits — leave room for the defender to win sometimes)
  - Or those kits need balance changes (more DPS density, better
    early-game tools)
  - Or the BrainSelector should fall back to non-mazing brains for
    those cells (already does — BalancedBrain is the production
    choice for military, mechanical via brain-coverage data)

## Recommendations

1. **Don't promote v4 results to production yet**. Gains are at
   noise threshold; existing v3.5 configs are stable and tested.
2. **Keep v4 architecture as a diagnostic tool**. Use it to identify
   cells where the kit is structurally weak (military, mechanical
   confirmed) vs where there's actual room to grow (harmonic
   borderline).
3. **Investigate director ceiling**. The 100% leak rate on
   military/mechanical suggests counter_pick is too strong against
   those kits at default settings. A `--director-temperature` floor
   (or per-cell director caps) might let the defender find footing
   to grow from.
4. **Try v4 on the strong cells (void/aliens/infernal)**. They
   might benefit from robustness improvements even at the same raw
   win rate. Estimated cost: ~30 min × 3 cells = 1.5 hours compute.

## Compute budget summary

|Cell|Wall time|Final defender|Final director|Notes|
|---|---|---|---|---|
|military|~10 min|0/100|100% leak|Plateau-converged round 5|
|mechanical|~12 min|0/100|100% leak|Plateau-converged round 5|
|harmonic|~25 min|gen-5: 7%|100% leak|Reached max-rounds=6|

Total compute: ~50 min wall, ran 3 cells in parallel (12 of 28 cores).
v4 architecture cost ≈ ~30 min/cell typical, ~10 min/cell when
plateau-converged early.
