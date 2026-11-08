#!/usr/bin/env python3
"""Convert RL placement recordings to replay-viewer format.

Reads the placement JSONL written by run_episode.mts --placements
(one line per place/upgrade decision: episode, wave, kind, col, row,
tower, cost, gold_after, level?, branch?) plus the episode summary
JSON from the same run, and writes one replay JSON per episode into
the output directory, in the exact schema ml/desktop/eval_set.mts
writes for ml/desktop/replay-viewer.html:

  {faction, difficulty, seed, won, waveReached, useLearnedScorer,
   evalName, placements: [{wave, kind, towerId, col, row, cost?,
   level?, branch?}]}

plus index.json listing the files.

Usage:
  python3 ml/desktop/rl/rl_to_replay.py \
    --placements ml/desktop/rl/rl-arcane-placements.jsonl \
    --summary ml/desktop/rl/rl-arcane-summary.json \
    --seeds 100,200,300 \
    --faction arcane --difficulty hard \
    --eval-name rl-arcane-lr1e3 \
    --out-dir ml/desktop/replays/rl-arcane-lr1e3
"""

import argparse
import json
import sys
from pathlib import Path


def load_placements(path):
    """Group placement records by episode index, preserving order."""
    by_episode = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            by_episode.setdefault(rec["episode"], []).append(rec)
    return by_episode


def load_summary(path):
    """Map episode index -> {won, waveReached} from a run_episode summary."""
    with open(path) as f:
        data = json.load(f)
    out = {}
    for ep in data.get("episodes", []):
        out[ep["episode"]] = {
            "won": bool(ep.get("won", False)),
            "waveReached": int(ep.get("waveReached", 0)),
        }
    return out


def to_replay_placement(rec):
    """Placement JSONL record -> replay-viewer placement."""
    p = {
        "wave": rec["wave"],
        "kind": rec["kind"],
        "towerId": rec["tower"],
        "col": rec["col"],
        "row": rec["row"],
    }
    if rec.get("cost") is not None:
        p["cost"] = rec["cost"]
    if rec.get("level") is not None:
        p["level"] = rec["level"]
    if rec.get("branch") is not None:
        p["branch"] = rec["branch"]
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--placements", required=True)
    ap.add_argument("--summary", required=True)
    ap.add_argument("--seeds", required=True,
                    help="Comma-separated seeds, one per episode, in order.")
    ap.add_argument("--faction", default="arcane")
    ap.add_argument("--difficulty", default="hard")
    ap.add_argument("--eval-name", default="rl-arcane-lr1e3")
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args()

    seeds = [int(s.strip()) for s in args.seeds.split(",") if s.strip()]
    by_episode = load_placements(args.placements)
    summary = load_summary(args.summary)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    index = []
    for ep, seed in enumerate(seeds):
        placements = [to_replay_placement(r) for r in by_episode.get(ep, [])]
        outcome = summary.get(ep, {"won": False, "waveReached": 0})
        replay = {
            "faction": args.faction,
            "difficulty": args.difficulty,
            "seed": seed,
            "won": outcome["won"],
            "waveReached": outcome["waveReached"],
            "useLearnedScorer": True,
            "evalName": args.eval_name,
            "placements": placements,
        }
        fname = (f"{args.faction}-{args.difficulty}-{seed}-"
                 f"{'won' if outcome['won'] else 'lost'}.json")
        (out_dir / fname).write_text(json.dumps(replay, indent=2))
        index.append({
            "file": fname,
            "faction": args.faction,
            "difficulty": args.difficulty,
            "seed": seed,
            "won": outcome["won"],
            "waveReached": outcome["waveReached"],
        })
        print(f"  ep {ep} seed={seed}: {'WON' if outcome['won'] else 'lost'} "
              f"wave {outcome['waveReached']}/20, "
              f"{len(placements)} placements -> {fname}")

    (out_dir / "index.json").write_text(json.dumps(index, indent=2))
    print(f"Saved {len(index)} replays to {out_dir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
