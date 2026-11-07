# LearningBrain Retrain — November 2026

## Setup
- Branch: ml/retrain-nov1
- Training data: 1,275,074 bot turns + 2,416 human turns (all captures in ml/captured/)
- Human data: 19 matches, 2,278 win-turns, 138 loss-turns
- New since last retrain: void win, cypherpunk win, chaos win x2, military win (all Hard)

## Training configuration
- `--human-weight=10 --fan-human`
- --fan-human: each human row fanned across 10 bot proposer one-hots (24,160 fanned rows)
- Effective human influence: ~19% of weighted training signal
- Val AUC: 0.9647 (vs 0.9938 previous, vs 0.998 original)

## Validation results (n=20 per cell)

### Retrained model (--fan-human)
| faction | best | learning | Δ |
|---|---|---|---|
| arcane | 20/20 | 16/20 | -4 |
| mechanical | 0/20 | 0/20 | 0 |
| nature | 20/20 | 20/20 | 0 |
| void | 20/20 | 20/20 | 0 |
| military | 20/20 | 20/20 | 0 |
| aliens | 0/20 | 0/20 | 0 |
| cypherpunk | 17/20 | 16/20 | -1 |
| infernal | 20/20 | 20/20 | 0 |
| celestial | 20/20 | 20/20 | 0 |
| psionic | 8/20 | 0/20 | -8 |
| harmonic | 0/20 | 1/20 | +1 |
**Net Δ: -12, Cells ≥ best: 8/11**

### Production model (original, n=20 baseline)
| faction | best | learning | Δ |
|---|---|---|---|
| arcane | 20/20 | 20/20 | 0 |
| mechanical | 0/20 | 0/20 | 0 |
| nature | 20/20 | 20/20 | 0 |
| void | 20/20 | 20/20 | 0 |
| military | 20/20 | 20/20 | 0 |
| aliens | 0/20 | 0/20 | 0 |
| cypherpunk | 17/20 | 15/20 | -2 |
| infernal | 20/20 | 20/20 | 0 |
| celestial | 20/20 | 20/20 | 0 |
| psionic | 8/20 | 1/20 | -7 |
| harmonic | 0/20 | 0/20 | 0 |
**Net Δ: -9, Cells ≥ best: 9/11**

## Conclusion
**REVERTED** — retrain is worse than production (-12 vs -9 net Δ, 8/11 vs 9/11 cells).

The --fan-human approach (designed to overcome the fixed proposer-set limitation)
did not fix the structural problem. Key observations:

1. **Psionic collapse**: Both models score ~0/20 on psionic vs 8/20 for the psionic brain.
   The human psionic data (confuse-trap: 65 probes + 34 mesmers) cannot be expressed
   through the 10 fixed proposers — none of them do mesmer/probe interleaving.

2. **Arcane regression**: Retrain dropped from 20/20 to 16/20 on arcane. The fanned
   human data may be adding noise to cells where the model was already optimal.

3. **No faction improved meaningfully**: The new human knowledge (void spam, cypherpunk
   firewall corridors, military sniper/artillery) did not translate to validation wins
   because the proposers don't generate those strategies.

## Structural diagnosis (confirmed)
The Q-model ranks proposals from a fixed set of 10 sub-brains. Human knowledge that
requires NEW proposal types (mesmer interleaving, siphon spam, firewall corridors,
sniper/artillery positioning) cannot be expressed. --fan-human maps human actions onto
bot proposer identities, but this is lossy: the model learns "when in this state, the
balanced-brain action is good" without understanding WHY (the underlying strategy).

The right vehicle remains structural encoding (StrategistBrain/DirectorBrain), not
Q-value regression over a fixed proposal set.
