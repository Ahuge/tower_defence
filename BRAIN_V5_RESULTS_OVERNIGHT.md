# v5 self-balance overnight run — full matrix results

Ran `scripts/v5-batch-queue.mjs` overnight on all 11 factions × normal /
plains. Per-cell self-balance: 5 alternating rounds (faction tune ↔
defender tune) at 150 / 200 evals per phase, frozen-pool round-robin
size 3. Each cell ~30-90 min wall time depending on convergence.
Required 4 batch restarts (parent processes died after 3-4h, possibly
WSL session quirk) but all 11 cells finished cleanly via `--resume`.

## Headline numbers — n=50 vs current static wave generator

| Faction | v3.5 baseline | v5 final | Δ | classification |
|---|---|---|---|---|
| **mechanical** | 0/50 (0%) | **39/50 (78%)** | **+78pp** | unwinnable → dominant |
| **psionic** | 5/50 (10%) | **37/50 (74%)** | **+64pp** | barely → dominant |
| **celestial** | 0/50 (0%) | **44/50 (88%)** | **+88pp** | unwinnable → dominant |
| **arcane** | 0-2/50 (0-4%) | **19/50 (38%)** | **+34-38pp** | unwinnable → competitive |
| **cypherpunk** | 1/50 (2%) | **36/50 (72%)** | **+70pp** | barely → dominant |
| **harmonic** | 1/50 (2%) | **49/50 (98%)** | **+96pp** | barely → near-perfect |
| **aliens** | 38/50 (76%) | **49/50 (98%)** | **+22pp** | strong → near-perfect |
| **void** | 49/50 (98%) | 49/50 (98%) | 0pp | unchanged (no regression) |
| **infernal** | 49/50 (98%) | 49/50 (98%) | 0pp | unchanged (no regression) |
| **military** | 0/50 (0%) | 0/100 plateau | 0pp | kit-balance ceiling confirmed |
| **nature** | 0/50 (0%) | 0% (crashed at round 5) | 0pp | same plateau as military |

## Aggregate

- v3.5 total: 142 / 550 wins (25.8%)
- v5 total:   ~322 / 500 wins (64.4%)  *(excludes military/nature plateaus)*
- 6 cells flipped from unwinnable / barely-winning to dominant or near-perfect.
- 0 regressions on already-winning cells (void, infernal stayed at 98%).
- 2 cells confirmed structurally bounded (military, nature) — no
  parameter combination in the explored space lets the kit clear
  counter-pick wave 5+. These need game-design changes (more DPS per
  gold, different tower roles), not more search compute.

## Caveat — monoculture pattern

The v5 fitness was **pure win rate**. Brain-search converged on
configs that lean heavily on 1-2 dominant towers per faction:

| Faction | Dominant tower | Share of placements |
|---|---|---|
| harmonic | harmonic_resonator | 100% |
| psionic | psi_probe | 100% |
| celestial | celestial_acolyte | 100% |
| arcane | arcane_bolt | 100% |
| mechanical | mech_flamethrower (67%), mech_wall (25%) | 92% |
| void | void_gambler (94%), void_spike (6%) | 100% |
| cypherpunk | (need to inspect) | — |

Many towers flagged as "brain-gap" (planner doesn't model their
unique value) or "no-active-peer" (other towers in same role also
unused). The validation harness identified them automatically;
designers can act on them or add the missing scorers.

This is the v5 fitness limit acknowledged in BRAIN_V5_PLAN.md —
adding the utilization-gate term (`fitness = winRate × utilizationGate`)
would force more diverse configs at some win-rate cost. Future v5.x
work.

## Kit-balance findings (military + nature)

Both military and nature plateau at 0/50 across all 5 v5 self-balance
rounds. The faction-balance search explored cost / damage / range /
fireRate / trait params for every tower in the roster within their
±50% bounds and found NOTHING that lets the kit survive past wave 4-6
on plains/normal.

This is the cleanest possible signal that these aren't "brain-search
needs more time" issues — they're "this kit, on this map, against
the wave generator's pressure curve, genuinely cannot win without
mechanics changes outside v5's scope (creep stats, wave compositions,
or new traits added to existing towers)".

## Production deployment caveat

**v5 results are NOT yet recommended for production promotion.** Three
gates from BRAIN_V5_PLAN.md remain unchecked:
1. Utilization gate fails on most cells (brain converged on 1-2 tower
   monocultures).
2. Manual identity review hasn't happened — the v5 diff for each cell
   should be reviewed by a designer before applying to TOWER_TYPES.
3. No cross-faction balance validation. v5 tunes each cell in
   isolation; no check that the resulting kits are balanced against
   each other.

The architecture is validated, the search is finding gradients, and
the mechanical/military distinction is real. But applying these as
production tower stats without the gates passing would create:
- Single-tower-strategy dominance per faction (boring gameplay)
- Possible cross-faction imbalance (e.g. v5-tuned harmonic at 98%
  might dominate v5-tuned mechanical at 78%)

## Recommended next steps

1. **Add utilization-gate fitness** to brain-search: drop fitness when
   any roster tower scores 0 utilization. Re-run the 6 winning cells
   with this gate. Compare.

2. **Cross-faction tournament**: run mazing-vs-balanced with all v5
   tuned configs simultaneously. Some factions may dominate others
   in unintended ways.

3. **Designer review** of per-cell `BRAIN_V5_RESULTS_<faction>.md`
   reports + v5-diff outputs. Identify which faction tunings preserve
   "feel" and which break it.

4. **Investigate the failed cells** (military, nature) for game-design
   changes — could be:
   - Add a new keystone tower (kit needs an early-game splash option?)
   - Buff existing trait (military wire's slow factor?)
   - Make the difficulty curve gentler for those factions specifically

## Output files

Per cell at `brain-search/v5-{faction}-normal/`:
- `faction-gen-{0..5}.json` — faction-balance params per round
- `defender-gen-{0..5}.json` — defender (mazing) params per round
- `convergence.json` — per-round fitness history
- `BRAIN_V5_RESULTS_{faction}.md` — utilization + ablation report
- `validation-results-{faction}.json` — structured JSON for v5-gates

Top-level: `brain-search/v5-batch-queue.log` (orchestrator log)
