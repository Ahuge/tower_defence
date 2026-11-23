/**
 * generate_bc_data.mts — Behavior-cloning dataset for the RL pipeline.
 *
 * Runs headless matches with a named strategist brain (or any registered
 * brain) and records (state, action) pairs at every between-wave
 * decide() call, so `train_ppo.py` can behavior-clone expert play before
 * PPO fine-tunes.
 *
 * Usage:
 *   node --import tsx ml/desktop/rl/generate_bc_data.mts \
 *     --faction harmonic --brain strategist --difficulty hard \
 *     --maps all --episodes 5 --out ml/desktop/rl/bc-harmonic.jsonl \
 *     --state-version 8 --wins-only \
 *     --params '{"harmonicResonators":5,"harmonicAuras":6,"panicLives":13}'
 *
 *  --faction      fixed-roster faction to train on (must have a roster)
 *  --brain         brain to clone from: 'strategist' or any
 *                  BRAIN_REGISTRY id (harmonic, nature, ...)
 *  --difficulty   'hard' | 'normal'
 *  --maps          comma-separated map ids, or 'all' for the 8 standard maps
 *  --episodes      episodes per map
 *  --seed-base     seed for the first episode of the first map
 *  --out           output JSONL path
 *  --state-version state feature version used to build the recorded states
 *  --wins-only    keep only examples whose match ended in a win
 *  --params        JSON object merged over DEFAULT_STRATEGIST_PARAMS when
 *                  --brain strategist (e.g. evolved harmonic knobs)
 */

await import('../../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../../src/headless/HeadlessMatch.ts');
const { StrategistBrain } = await import('../../../playtest/StrategistBrain.ts');
const { BRAIN_REGISTRY } = await import('../../../src/systems/bots/BotBrain.ts');
const { RLBrain, RL_FACTION_TOWERS, buildSlotsForTowers, extractState, zoneOfCell } =
  await import('../../../src/systems/bots/brains/RLBrain.ts');
import type { MapId } from '../../../src/data/Maps.ts';
import type { FactionId } from '../../../src/data/Factions.ts';
import { writeFileSync } from 'node:fs';

const MAPS: MapId[] = [
  'plains', 'crossroads', 'fortress', 'serpentine',
  'islands', 'gauntlet', 'spiral', 'siege',
];
const args = process.argv.slice(2);
const getArg = (name: string, def: string): string => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};
const FACTION = getArg('faction', 'arcane') as FactionId;
const BRAIN = getArg('brain', 'strategist');
const DIFFICULTY = getArg('difficulty', 'hard') as 'hard' | 'normal';
const MAP_ARG = getArg('maps', 'all');
const EPISODES = parseInt(getArg('episodes', '5'), 10);
const SEED_BASE = parseInt(getArg('seed-base', '1000'), 10);
const OUT = getArg('out', 'ml/desktop/rl/bc-data.jsonl');
const STATE_VERSION = parseInt(getArg('state-version', '8'), 10);
const WINS_ONLY = args.includes('--wins-only');
const PARAMS = getArg('params', '');

const towerIds = RL_FACTION_TOWERS[FACTION];
const slots = buildSlotsForTowers(towerIds);
const saveAction = buildSlotsForTowers(towerIds) * 12;
const upgradeAction = saveAction + 1;

interface BcRecord {
  state: number[];
  action: number;
  faction: string;
  mapId: string;
  wave: number;
  won: boolean;
}

async function main(): Promise<void> {
  const maps = MAPS.filter(m => MAP_ARG === 'all' || MAP_ARG.split(',').includes(m));
  const records: BcRecord[] = [];
  let mid = 0;

  for (const mapId of maps) {
    for (let i = 0; i < EPISODES; i++) {
      const seed = SEED_BASE + mid;
      let brain: any;
      if (BRAIN === 'strategist') {
        brain = new StrategistBrain(
          PARAMS ? JSON.parse(PARAMS) : undefined,
        );
      } else {
        brain = BRAIN_REGISTRY[BRAIN];
        if (!brain) throw new Error(`unknown brain: ${BRAIN}`);
      }

      const captured: BcRecord[] = [];
      const origDecide = brain.decide.bind(brain);
      brain.decide = (ctx: any) => {
        const d = origDecide(ctx);
        if (ctx.betweenWaves) {
          let action = saveAction;
          if (d.kind === 'place') {
            const towerIdx = towerIds.indexOf(d.type.id);
            action = towerIdx * 12 + zoneOfCell(d.col, d.row);
          } else if (d.kind === 'upgrade') {
            action = upgradeAction;
          }
          captured.push({
            state: extractState(ctx, towerIds, STATE_VERSION as any, slots),
            action,
            faction: FACTION,
            mapId,
            wave: ctx.wave ?? 0,
            won: false,
          });
        }
        return d;
      };

      const result = await runMatch({
        faction: FACTION,
        difficulty: DIFFICULTY,
        mapId,
        brainId: BRAIN,
        matchMode: 'standard',
        waveCount: 20,
        seed,
      }, brain);

      const won = result.outcome === 'win';
      for (const r of captured) {
        r.won = won;
        if (WINS_ONLY) continue;
        records.push(r);
      }
      mid++;
      process.stderr.write(
        `${FACTION}/${BRAIN}/${DIFFICULTY}/${mapId} seed=${seed} ${won ? 'WIN' : 'loss'}\n`,
      );
    }
  }

  writeFileSync(OUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`\nWrote ${records.length} BC records -> ${OUT}`);
}

void main();
