#!/usr/bin/env node
/**
 * Run a headless match with a chosen brain, render every Nth tick
 * to a PNG frame via node-canvas, and pipe the frame sequence to
 * ffmpeg to produce a webm.
 *
 * No browser. No Puppeteer. The MatchRenderer's visuals are coarse
 * (colored squares for towers, dots for creeps) but accurate — they
 * show every placement, the path creeps walk, and the HUD ticking.
 * Enough to verify whether a policy is playing legitimately.
 *
 * CLI:
 *   --brain=ppo|balanced|...
 *   --faction=arcane|mechanical|...
 *   --difficulty=normal|hard|insane
 *   --waves=15
 *   --seed=14000
 *   --map=plains
 *   --model=models/ppo-policy.onnx
 *   --meta=models/ppo-policy.meta.json
 *   --temperature=0       (argmax — deterministic)
 *   --frame-every=4       (render 1 frame per N sim steps; default 4 → ~7.8fps real-time, 4x speedup at 30fps output)
 *   --fps=30              (output framerate in webm)
 *   --out=media/<id>.webm
 *   --keep-frames         (don't delete PNGs after webm assembly; useful for debugging)
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { renderMatchFrame, CANVAS_W, CANVAS_H } = await import('../src/headless/MatchRenderer.ts');
const { BRAIN_REGISTRY } = await import('../src/systems/bots/BotBrain.ts');

await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/GreedyBrain.ts');
await import('../src/systems/bots/brains/RushBrain.ts');
await import('../src/systems/bots/brains/EconBrain.ts');
await import('../src/systems/bots/brains/SynergyBrain.ts');
await import('../src/systems/bots/brains/UltimateBrain.ts');
await import('../src/systems/bots/brains/AOEFocusBrain.ts');
await import('../src/systems/bots/brains/NatureBrain.ts');
await import('../src/systems/bots/brains/HarmonicBrain.ts');
await import('../src/systems/bots/brains/PsionicBrain.ts');
await import('../src/systems/bots/brains/LearningBrain.ts');
await import('../src/systems/bots/brains/DumbBrain.ts');
const { PPOBrain, preloadPPOModel } = await import('../src/systems/bots/brains/PPOBrain.ts');

// node-canvas. Already a project dep.
const { createCanvas } = await import('canvas');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    brain: 'balanced',
    faction: 'arcane',
    difficulty: 'normal',
    mapId: 'plains',
    waves: 10,
    seed: 1001,
    model: 'models/ppo-policy.onnx',
    meta: 'models/ppo-policy.meta.json',
    temperature: 0.0,
    frameEvery: 4,
    fps: 30,
    out: null,
    keepFrames: false,
  };
  for (const a of args) {
    if (a.startsWith('--brain=')) out.brain = a.slice('--brain='.length);
    else if (a.startsWith('--faction=')) out.faction = a.slice('--faction='.length);
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--map=')) out.mapId = a.slice('--map='.length);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--seed=')) out.seed = parseInt(a.slice('--seed='.length), 10);
    else if (a.startsWith('--model=')) out.model = a.slice('--model='.length);
    else if (a.startsWith('--meta=')) out.meta = a.slice('--meta='.length);
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
    else if (a.startsWith('--frame-every=')) out.frameEvery = parseInt(a.slice('--frame-every='.length), 10);
    else if (a.startsWith('--fps=')) out.fps = parseInt(a.slice('--fps='.length), 10);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a === '--keep-frames') out.keepFrames = true;
  }
  if (!out.out) {
    out.out = `media/${out.brain}-${out.faction}-${out.difficulty}-w${out.waves}-s${out.seed}.webm`;
  }
  return out;
}

const opts = parseArgs();
console.log('[record-render] opts:', opts);

// ----- Build the brain -----
let brain;
if (opts.brain === 'ppo') {
  if (!existsSync(opts.model)) {
    console.error(`[record-render] PPO model not found: ${opts.model}`);
    process.exit(1);
  }
  const session = await preloadPPOModel(opts.model, opts.meta);
  if (!session) {
    console.error('[record-render] failed to load ONNX session');
    process.exit(2);
  }
  brain = new PPOBrain({ modelPath: opts.model, metaPath: opts.meta, temperature: opts.temperature });
} else {
  const factory = BRAIN_REGISTRY[opts.brain];
  if (!factory) {
    console.error(`[record-render] unknown brain: ${opts.brain}`);
    process.exit(3);
  }
  brain = factory();
}

// ----- Set up the canvas + tmp dir -----
const canvas = createCanvas(CANVAS_W, CANVAS_H);
const ctx = canvas.getContext('2d');

const framesDir = join(tmpdir(), `td-render-${process.pid}-${Date.now()}`);
mkdirSync(framesDir, { recursive: true });

// ----- Drive the match step-by-step, capturing every Nth step -----
const cfg = {
  faction: opts.faction,
  difficulty: opts.difficulty,
  mapId: opts.mapId,
  brainId: opts.brain,
  matchMode: 'standard',
  waveCount: opts.waves,
  seed: opts.seed,
};

const match = new Match(cfg, brain);
const t0 = Date.now();
let stepIdx = 0;
let frameIdx = 0;

// Snapshot the initial state as frame 0.
renderMatchFrame(ctx, match);
writeFileSync(join(framesDir, `frame_${String(frameIdx++).padStart(6, '0')}.png`), canvas.toBuffer('image/png'));

while (!match.isDone()) {
  if (opts.brain === 'ppo') {
    await match.stepAsync();
  } else {
    match.step();
  }
  stepIdx++;
  if (stepIdx % opts.frameEvery === 0) {
    renderMatchFrame(ctx, match);
    writeFileSync(join(framesDir, `frame_${String(frameIdx++).padStart(6, '0')}.png`), canvas.toBuffer('image/png'));
  }
  if (stepIdx > 200_000) {
    console.error('[record-render] step cap reached; aborting');
    break;
  }
}
// Final frame (terminal state).
renderMatchFrame(ctx, match);
writeFileSync(join(framesDir, `frame_${String(frameIdx++).padStart(6, '0')}.png`), canvas.toBuffer('image/png'));

const result = match.result();
const simSec = match.getSimTimeMs() / 1000;
const wallSec = (Date.now() - t0) / 1000;
console.log(`[record-render] match: ${result.outcome}  wave=${result.waveReached}  lives=${result.livesRemaining}`);
console.log(`[record-render] captured ${frameIdx} frames over ${stepIdx} sim steps (sim=${simSec.toFixed(1)}s wall=${wallSec.toFixed(1)}s)`);

// ----- Assemble via ffmpeg -----
mkdirSync(dirname(opts.out), { recursive: true });
console.log(`[record-render] ffmpeg → ${opts.out}`);
const ffmpegArgs = [
  '-y',
  '-framerate', String(opts.fps),
  '-i', join(framesDir, 'frame_%06d.png'),
  '-c:v', 'libvpx-vp9',
  '-pix_fmt', 'yuv420p',
  '-b:v', '1M',
  '-crf', '30',
  opts.out,
];
const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
const ffmpegCode = await new Promise(resolve => proc.on('exit', resolve));

if (ffmpegCode !== 0) {
  console.error(`[record-render] ffmpeg exited with ${ffmpegCode}`);
  if (!opts.keepFrames) {
    console.error(`[record-render] frames kept at ${framesDir} for inspection`);
  }
  process.exit(ffmpegCode);
}

if (!opts.keepFrames) {
  rmSync(framesDir, { recursive: true, force: true });
}

const outSize = readFileSync(opts.out).length;
console.log(`[record-render] DONE  ${opts.out}  (${(outSize / 1024).toFixed(1)} KB)`);
