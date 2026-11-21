#!/usr/bin/env python3
"""analyze_sweep.py — learning diagnostics for an RL sweep results dir.

Answers the questions a win-rate table alone hides:

  * Did the policy explore, or collapse to one action?
    (entropy trajectory + final build/save/upgrade mix)
  * Is the reward signal attributed to decisions, or lost on forced saves?
  * Which configs actually improved over training vs. plateaued?

Usage:
    python ml/desktop/rl/analyze_sweep.py ml/desktop/rl/sweep-results-psionic
    python ml/desktop/rl/analyze_sweep.py <dir> --config v2-life-0.05-build-0.002

It reads only files the sweep already writes (summary.csv and the
per-config *-train.log), so it works on past runs too.
"""

import argparse
import csv
import re
import sys
from pathlib import Path

ITER_RE = re.compile(
    r"iter (?P<iter>\d+): .*?mean_reward=(?P<reward>-?[\d.]+) "
    r".*?avg_wave=(?P<wave>[\d.]+).*?entropy=(?P<entropy>[\d.]+) "
    r".*?ent_coef=(?P<ent_coef>[\d.]+) "
    r".*?mix\(build/save/upg\)=(?P<build>[\d.]+)/(?P<save>[\d.]+)/"
    r"(?P<upg>[\d.]+) top=(?P<top>\d+)"
)
# Older logs (before the action-mix log line) only have these fields.
ITER_OLD_RE = re.compile(
    r"iter (?P<iter>\d+): .*?mean_reward=(?P<reward>-?[\d.]+) "
    r".*?avg_wave=(?P<wave>[\d.]+).*?entropy=(?P<entropy>[\d.]+)"
)


def parse_log(path: Path):
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text(errors="replace").splitlines():
        m = ITER_RE.search(line) or ITER_OLD_RE.search(line)
        if m:
            rows.append({k: float(v) for k, v in m.groupdict().items()})
    return rows


def fmt(v, nd=2):
    return "?" if v is None else f"{v:.{nd}f}"


def summarize_config(name, rows):
    if not rows:
        return None
    first, last = rows[0], rows[-1]
    waves = [r["wave"] for r in rows]
    peak = max(waves)
    # Collapse heuristic: the last 10% of iterations have high entropy
    # concentration (top action share) or very low entropy.
    tail = rows[-max(1, len(rows) // 10):]
    ent = sum(r["entropy"] for r in tail) / len(tail)
    top_share = None
    if "build" in last:
        # top action's share is not logged directly; use the dominant
        # category as a proxy for "one action dominates".
        top_share = max(last["build"], last["save"], last["upg"])
    return {
        "config": name,
        "iters": int(last["iter"]),
        "wave_first": first["wave"],
        "wave_last": last["wave"],
        "wave_peak": peak,
        "reward_last": last["reward"],
        "entropy_first": first["entropy"],
        "entropy_tail": ent,
        "build": last.get("build"),
        "save": last.get("save"),
        "upg": last.get("upg"),
        "top_action": last.get("top"),
        "top_share": top_share,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("results_dir", type=Path)
    ap.add_argument("--config", default=None,
                    help="only analyze this config (default: all)")
    args = ap.parse_args()

    d = args.results_dir
    if not d.is_dir():
        sys.exit(f"not a directory: {d}")

    print(f"=== {d} ===")

    # --- Eval table from summary.csv ---------------------------------
    summary = d / "summary.csv"
    rows = []
    if summary.exists():
        with summary.open() as f:
            rows = list(csv.DictReader(f))
    if rows:
        print("\nEval results (sorted by wins, then avg wave):")
        def key(r):
            try:
                return (int(r["eval_wins"]), float(r["avg_wave"]))
            except (ValueError, TypeError, KeyError):
                return (-1, -1.0)
        for r in sorted(rows, key=key, reverse=True):
            name = r.get("config", "?")
            if args.config and name != args.config:
                continue
            print(f"  {name:34s} wins={r.get('eval_wins','?'):>3s}"
                  f"/{r.get('eval_total','?')} "
                  f"avg_wave={r.get('avg_wave','?'):>5s} "
                  f"reward={r.get('mean_reward','?'):>7s}")
    else:
        print("\n(no summary.csv yet)")

    # --- Training dynamics from the per-config logs ------------------
    logs = sorted(d.glob("*-train.log"))
    if args.config:
        logs = [p for p in logs if p.name == f"{args.config}-train.log"]
    if not logs:
        print("\n(no per-config train logs found)")
        return

    print("\nTraining dynamics (first -> last iteration):")
    print(f"  {'config':34s} {'wave':>11s} {'peak':>5s} "
          f"{'reward':>7s} {'ent':>11s} {'mix b/s/u':>14s} {'top':>4s} flag")
    flagged = 0
    for p in logs:
        name = p.name[:-len("-train.log")]
        s = summarize_config(name, parse_log(p))
        if not s:
            continue
        flags = []
        if s["wave_last"] < 4.0:
            flags.append("EARLY-WIPE")
        if s["entropy_tail"] < 0.20:
            flags.append("LOW-ENTROPY")
        if s["top_share"] is not None and s["top_share"] > 0.70:
            flags.append("COLLAPSED")
        if s["wave_last"] < s["wave_peak"] - 1.0:
            flags.append("REGRESSED")
        if flags:
            flagged += 1
        mix = ("-" if s["build"] is None else
               f"{s['build']:.2f}/{s['save']:.2f}/{s['upg']:.2f}")
        top = "-" if s["top_action"] is None else str(int(s["top_action"]))
        print(f"  {name:34s} "
              f"{s['wave_first']:4.1f}->{s['wave_last']:4.1f} "
              f"{s['wave_peak']:5.1f} "
              f"{s['reward_last']:7.2f} "
              f"{s['entropy_first']:.2f}->{s['entropy_tail']:.2f} "
              f"{mix:>14s} {top:>4s} {','.join(flags) or 'ok'}")

    print(f"\n{flagged}/{len(logs)} configs flagged. "
          "COLLAPSED = one action category >70%; LOW-ENTROPY = <0.20; "
          "EARLY-WIPE = final avg wave <4; REGRESSED = ended >1 wave below peak.")


if __name__ == "__main__":
    main()
