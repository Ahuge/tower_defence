#!/usr/bin/env python3
"""
Train a gradient-boosted-tree regressor on captured (state, action,
outcome) tuples from the headless harness. Output is a JSON file
the TypeScript LearningBrain reads at runtime.

Usage:
    python train.py <turns.jsonl> <model.json>

The model predicts P(win | state, action). At inference time, the
LearningBrain enumerates proposals from sub-brains, scores each
through the model, and picks argmax.

Inputs:
    turns.jsonl — one JSON object per turn:
      { matchId, turnIdx, stateFeatures, actionFeatures,
        decisionKind, faction, brain, difficulty, wave,
        outcome, won, waveReached }

Outputs:
    model.json — XGBoost JSON dump, plus our own metadata header so
    TS knows feature shapes.
"""
import json
import sys
import time
from pathlib import Path

import numpy as np
import xgboost as xgb


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: train.py <turns.jsonl> <model.json>", file=sys.stderr)
        return 1
    turns_path = Path(sys.argv[1])
    model_path = Path(sys.argv[2])
    if not turns_path.exists():
        print(f"error: {turns_path} not found", file=sys.stderr)
        return 1

    print(f"reading {turns_path}…")
    t0 = time.monotonic()
    rows = load_jsonl(turns_path)
    print(f"  {len(rows):,} turns loaded in {time.monotonic() - t0:.1f}s")

    # Build matrices.
    state_dim = len(rows[0]["stateFeatures"])
    action_dim = len(rows[0]["actionFeatures"])
    feat_dim = state_dim + action_dim
    print(f"  state_dim={state_dim} action_dim={action_dim} total={feat_dim}")

    X = np.zeros((len(rows), feat_dim), dtype=np.float32)
    y = np.zeros(len(rows), dtype=np.float32)
    for i, r in enumerate(rows):
        X[i, :state_dim] = r["stateFeatures"]
        X[i, state_dim:] = r["actionFeatures"]
        y[i] = r["won"]

    # Class balance — most matches lose, so most rows are 0.
    pos_rate = y.mean()
    print(f"  positive rate (turns from winning matches): {pos_rate:.3f}")

    # Train/val split — group by matchId so val matches are entirely
    # held out (no leakage from the same match into both splits).
    rng = np.random.default_rng(42)
    match_ids = np.array([r["matchId"] for r in rows])
    unique_matches = np.unique(match_ids)
    rng.shuffle(unique_matches)
    cut = int(0.85 * len(unique_matches))
    train_matches = set(unique_matches[:cut].tolist())
    train_mask = np.array([m in train_matches for m in match_ids], dtype=bool)
    Xtr, ytr = X[train_mask], y[train_mask]
    Xva, yva = X[~train_mask], y[~train_mask]
    print(f"  train: {len(Xtr):,} turns from {cut} matches")
    print(f"  val:   {len(Xva):,} turns from {len(unique_matches) - cut} matches")

    # Train. Logistic regression objective so output is in [0,1].
    print("training xgboost…")
    t1 = time.monotonic()
    dtr = xgb.DMatrix(Xtr, label=ytr)
    dva = xgb.DMatrix(Xva, label=yva)
    params = {
        "objective": "binary:logistic",
        "eval_metric": ["logloss", "auc"],
        "max_depth": 6,
        "eta": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "tree_method": "hist",
    }
    booster = xgb.train(
        params,
        dtr,
        num_boost_round=300,
        evals=[(dtr, "train"), (dva, "val")],
        early_stopping_rounds=20,
        verbose_eval=50,
    )
    print(f"  trained in {time.monotonic() - t1:.1f}s")
    print(f"  best iteration: {booster.best_iteration} (used)")

    # Dump trees as JSON. xgboost's `save_model(*.json)` writes a
    # full model spec we can walk in TS. We also stash a lightweight
    # header so the TS side can verify feature shapes.
    print(f"writing {model_path}…")
    model_path.parent.mkdir(parents=True, exist_ok=True)
    # Save in xgboost's native JSON format (which we'll parse manually
    # in TS — we don't pull xgboost into the runtime).
    booster.save_model(str(model_path))

    # Read it back, prepend metadata header, rewrite.
    raw = json.loads(model_path.read_text())
    wrapped = {
        "trainingMeta": {
            "stateDim": state_dim,
            "actionDim": action_dim,
            "totalDim": feat_dim,
            "trainRows": int(len(Xtr)),
            "valRows": int(len(Xva)),
            "bestIteration": int(booster.best_iteration),
            "positiveRate": float(pos_rate),
            "trainedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "xgboost": raw,
    }
    model_path.write_text(json.dumps(wrapped, separators=(",", ":")))
    sz = model_path.stat().st_size
    print(f"  wrote {sz:,} bytes")

    # Feature importance — interpretability bonus.
    importance = booster.get_score(importance_type="gain")
    if importance:
        sorted_imp = sorted(importance.items(), key=lambda kv: -kv[1])[:15]
        print("top-15 feature importance (gain):")
        for k, v in sorted_imp:
            idx = int(k[1:])  # 'f12' → 12
            print(f"  f{idx:>3} : {v:.3f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
