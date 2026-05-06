# CPU Brain

How the CPU bots decide what to do each frame. Two layers: the **driver**
(`BotAI`, `src/systems/bots/BotAI.ts`) decides *when* the bot gets to
act, and the **brain** (`BalancedBrain`, `src/systems/bots/brains/BalancedBrain.ts`)
decides *what* to do in that slot. Used identically by Circle Co-op
(shared grid, zone-restricted) and 1v1 Versus CPU opponent (private
grid, full-board).

## Driver layer — `BotAI.tick()`

Runs every frame. For each bot:

1. **Cooldown gate.** Each bot has a staggered cooldown (base 4s,
   random offset at spawn so bots don't all fire on frame 1).
   Decrement by `delta`; skip until it hits 0, then reset.
2. **Affordability gate.** Compute
   `minActionCost = min(cheapestTower, minUpgradeCost, minSendCost, minFrontierCost)`.
   If the bot has no placeable cells, no sellable towers, no
   upgradable towers, no affordable send, and no affordable
   frontier → skip. If budget is below `minActionCost` and there's
   nothing to sell → skip.
3. **Build context.** Snapshot live state: budget (bot's
   `EconomyManager`), wave, lives, candidate cells, placed towers
   (with fresh `upgradeCost` / `sellValue`), send options
   (cost-scaled, unlock-respected), frontier options,
   `betweenWaves` flag, all paths.
4. **Call `brain.decide(ctx)`**, then validate + execute the
   returned decision. On `place` / `upgrade` / `send` / `frontier`,
   debit the cost from the bot's private economy first; if the
   scene rejects the action, refund.

## Brain layer — `BalancedBrain.decide()`

Decision priority, top-to-bottom:

### 1. Meta pass (only `betweenWaves === true`)

Roll a random number:

- **< 0.4 → frontier.** Filter affordable frontier buildings, pick
  the best `income / cost` ratio. Return `{ kind: 'frontier' }`.
- **0.4–0.7 → send.** Filter unlocked + affordable sends, pick the
  most expensive one (bigger sends = more pressure per gold spent
  than spamming cheap tiers). Return `{ kind: 'send' }`.
- **≥ 0.7 → fall through** to the tower pass below.

If the preferred meta action has no affordable option, fall
through rather than re-rolling.

### 2. Phase selection

Tower-placement phase is picked by priority:

- `lives > 0 && lives <= 5` → **panic**
- `wallsPlaced < 8` → **building-maze**
- else → **filling-dps**

### 3. Phase handler

Each phase tries to return a `place` decision; on failure, falls
through to the next phase:

- **building-maze** → pick a wall tower, use `bestMazeCell`
  (path-length gain). If no wall extends the path, bump
  `wallsPlaced` to cap so we stop re-trying, then fall through.
- **panic** → pick a slow tower, place it on the cell with highest
  path coverage. Fall through if no slow affordable.
- **filling-dps** → pick the most expensive affordable
  splash-or-single DPS. Place on the cell with the most path cells
  in range. Fall through if no pool affordable or no coverage.

Any phase failure falls to **filling-dps** as the default attempt.

### 4. Upgrade fallback

If no `place` decision came back, call `decideUpgrade`: from the
bot's placed towers with `upgradeCost > 0 && upgradeCost <= budget`,
prefer non-wall DPS, rank by path coverage, upgrade the best.

### 5. Sell fallback (rare)

Only if `candidateCells.length === 0 && placedTowers.length >= 3`:
`decideSell` picks the lowest-coverage wall (or the lowest-coverage
tower overall if no walls) and sells it to free gold for something
bigger.

### 6. Skip

If none of the above fit, return `{ kind: 'skip' }` and wait for
the next cooldown tick.

## Mental model

> Between waves, roll the dice on spending income-building gold
> first. If that can't fire, try to put down a new tower — wall if
> still shaping the maze, slow if panicking, DPS otherwise. If the
> map is too full to place, upgrade your best DPS. If nothing
> works, sell the weakest wall. Otherwise, wait 4 seconds and try
> again.

## Economy wiring

The economy side (kill gold, wave-clear bonus, per-wave income
bonus from frontier + sends) flows through the bot's own
`EventBus` + `EconomyManager` — identical wiring to the human — so
economic rules never drift between player and CPU. Income bonuses
bought via `frontier` / `send` decisions accumulate on a per-bot
`incomeBonus` counter and pay out on every `creditWaveClear`.

**Per-hit tower gold** (Void's `gold_on_hit`, Nature's `jackpot`,
etc.) is routed via `TowerManager.botGoldRouter` → `BotAI.creditGold`
so Circle Co-op bots get the bonuses their own towers trigger
instead of fattening the human's shared pool. 1v1 CPU bots fire
through an approximation-only shadow sim (`OpponentSimulation`)
and currently don't simulate per-hit traits — a known limitation.

## Adding a new brain

1. Implement `BotBrain` in `src/systems/bots/brains/<Name>Brain.ts`.
2. Call `registerBrain('<id>', () => new YourBrain())` at the
   bottom of the file.
3. Import it as a side-effect in `BotAI.ts` so the registry is
   populated at module-load time.
4. Pass the new id via `addBot(playerIndex, faction, zone, '<id>')`.
