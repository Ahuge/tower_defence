# RL PvP Plan — Play Against the Trained Models

Status: **design + first implementation pass**. The in-game wiring is in
place (lobby brain picker, policy loading, `BotAI` RL brain); this doc
records the plan, the reasoning, and what still needs verifying.

## Goal

Let a human play 1v1 Versus against the trained RL policies (the same
`policy-<faction>-multimap.json` files the headless eval uses), with the
CPU faction locked to the policy's roster and the model playing its
deterministic argmax policy.

## Why it does not work today

- RL policies are only consumable by `ml/desktop/rl/run_episode.mts`
  (headless, Node). `RLBrain` is not registered in `BRAIN_REGISTRY`.
- `BotAI` (the in-game CPU driver) side-effect-imports only
  `DumbBrain`, `BalancedBrain`, `AttackerDefenderBrain`.
- `LobbyScreen.startVsCpu()` hardcodes the CPU brain to `'balanced'`.
- `RLBrain` reads its policy with `readFileSync` (Node-only) and builds
  a `LearnedScorer` that also needs Node `fs` — neither works in the
  browser bundle.

## Design

Keep the trained artifacts as the single source of truth and add a thin
"game-side adapter":

1. **Policy as data, not a file path.** `RLBrain` gains a
   `policyJSON?: PolicyWeights` option. The existing `loadPolicy(path)`
   is refactored into `validatePolicyWeights(raw, source)` +
   `loadPolicy(path)`; both paths now share one validation function and
   one `applyPolicyShape()` helper (policy version, build slots, state
   feature version are derived from the policy's `action_dim` /
   `state_dim`, so a v8 122-dim policy still works in-game).
2. **Browser-safe placement.** The imitation `LearnedScorer` is
   Node-only (it reads `playtest/models/scorer-<faction>.json` with
   `fs`), but the game already code-splits those JSON files for
   `PlacementAdvisor`. A new `scorerModelLoader.ts` loads the selected
   faction's model via dynamic `import()` and caches it;
   `RLBrain.getScorer` prefers that cached model, then the Node fs path,
   then a `NullScorer` (neutral scores, `hasModel() === false`) so the
   browser never constructs the fs-backed class. This matters for
   fidelity: the policies were trained with the learned placement prior
   active, so the CPU should use it too.
3. **Policy delivery.** Trained policies are copied to
   `public/rl-policies/policy-<faction>-multimap.json` (11 fixed-roster
   factions). The lobby fetches the JSON on demand and hands the parsed
   object to `VersusManager` → `GameScene` → `BotAI`. The URL is built
   from Vite's `import.meta.env.BASE_URL` (the app may be deployed under
   a sub-path such as `/tower_defence/`, so a hard-coded `/rl-policies`
   404s and the CPU silently keeps its random faction).
4. **CPU brain selection.** `LobbyScreen` gains a brain picker in the
   Versus setup phase. Options:
   - `Balanced (default)`, plus the faction specialists
     (`Harmonic`, `Nature`, `Psionic`).
   - `RL <Faction>` for every fixed-roster faction (brain id
     `rl-<faction>`).
   Choosing an RL brain fetches its policy, locks the CPU faction to the
   policy's roster, and calls
   `versus.startCpuOpponent('rl-<faction>', faction, policy)`.

### Data flow

```
LobbyScreen (fetch /rl-policies/policy-<f>-multimap.json)
      │  pickCpuBrain(rl-<f>)
      ▼
VersusManager.startCpuOpponent(brainId, faction, policy)
      │  cpuBrainId / cpuFaction / cpuPolicy
      ▼
GameScene: cpuOpponentAI.addBot(CPU_INDEX, cpuFaction, cells, cpuBrainId, cpuPolicy)
      ▼
BotAI.addBot: brainId.startsWith('rl-')
      → new RLBrain({ faction, policyJSON, deterministic: true,
                      recordTrajectory: false, useLearnedScorer: false })
```

## Implementation checklist

- [x] `RLBrain`: `policyJSON` + `useLearnedScorer` options;
      `validatePolicyWeights()` refactor; `PlacementScorer`/`NullScorer`.
- [x] `LearnedScorer`: optional in-memory `models` constructor arg
      (skips `fs`), `ScorerModel` exported.
- [x] `scorerModelLoader.ts`: dynamic-import + cache for the browser;
      `RLBrain.getScorer` prefers the cached model, then Node fs, then
      `NullScorer`.
- [x] `BotAI`: import `RLBrain`; `addBot(..., policyJSON?)` builds an RL
      brain for `rl-*` ids.
- [x] `VersusManager`: `cpuPolicy` field; `startCpuOpponent(brainId,
      faction, policy?)`.
- [x] `GameScene`: pass `versus.cpuPolicy` into `addBot`.
- [x] `LobbyScreen`: brain picker, `fetchRLPolicy` (BASE_URL-aware),
      `loadScorerModel` preload, `pickCpuBrain`.
- [x] `public/rl-policies/` populated for all 11 fixed-roster factions.
- [x] Verify a real Vs CPU match end-to-end (dev server + built bundle).
- [x] Smoke tests: `policyJSON` alone (Harmonic Hard/Plains win, wave
      20) and `policyJSON` + preloaded LearnedScorer (same result).
- [x] Preload the CPU faction's scorer model when the Versus CPU match
      starts (GameScene), so the RL opponent keeps its learned placement
      prior even if the lobby picker never ran.
- [x] Placement Advisor loads your faction's RL policy and re-ranks its
      top picks with it (`PlacementAdvisor.loadRlPolicy` /
      `refreshWithRlPolicy`, `RLBrain.rankActions`).
- [ ] Add a vitest case: `RLBrain` with `policyJSON` reproduces the same
      action as the file-loaded policy.

## How the player uses it

1. Open Versus → **VS CPU**.
2. In **GAME SETUP**, under **CPU opponent brain**, pick e.g.
   **RL Harmonic**.
3. Pick your own faction, map and difficulty; the CPU faction is locked
   to Harmonic and the policy loads from
   `/rl-policies/policy-harmonic-multimap.json`.
4. Play the mirrored 1v1 as usual — the CPU's placements come from the
   trained policy, running deterministic argmax.

## Files touched

| File | Change |
| --- | --- |
| `src/systems/bots/brains/RLBrain.ts` | `policyJSON` / `useLearnedScorer` options, `validatePolicyWeights`, `PlacementScorer`/`NullScorer`, `applyPolicyShape`, browser-safe `getScorer` |
| `src/systems/bots/brains/scorerModelLoader.ts` | dynamic-import + cache for the browser scorer models |
| `playtest/LearnedScorer.ts` | optional in-memory `models` constructor arg, `ScorerModel` exported |
| `src/systems/bots/BotAI.ts` | import `RLBrain`; `addBot` accepts `policyJSON`, special-cases `rl-*` |
| `src/systems/multiplayer/VersusManager.ts` | `cpuPolicy` field, `startCpuOpponent(..., policy?)` |
| `src/scenes/GameScene.ts` | pass `cpuPolicy` to `addBot` |
| `src/ui/screens/LobbyScreen.tsx` | brain picker, `fetchRLPolicy`, `pickCpuBrain` |
| `public/rl-policies/*.json` | 11 trained policies served to the game |

## Risks / open questions

- **24 MB of duplicated policy JSON** in `public/` (the same files live
  in `ml/desktop/rl/`). The repo already carries multi-GB history, so
  this is acceptable; a build-time copy step would remove the
  duplication if desired.
- **State-version mismatch.** Policies are per-version (v7 = 94/95
  dims, v8 = 122/123). `applyPolicyShape` auto-detects from the loaded
  policy, so old policies keep working; but the *eval* numbers in
  `ml/desktop/rl/eval-*.json` must be interpreted against the matching
  policy.
- **In-game placement quality.** The CPU uses the imitation
  `LearnedScorer` when the lobby preloaded its model (the same prior the
  policies trained with); without a model it falls back to the
  heuristic coverage/mazing/aura scorer. Cell choice inside the zone can
  still differ from the headless runner because the headless runner
  also copies scorer models next to its bundle.
- **Determinism.** `deterministic: true` (argmax) matches the committed
  eval protocol. Sampling would be more varied but is not what the
  reported win rates measure.
- **Balance.** RL policies are trained against waves on the 8 standard
  maps; Vs CPU uses mirrored maps with sends/frontier enabled. Expect
  the models to be strong but not identical to their headless numbers.
