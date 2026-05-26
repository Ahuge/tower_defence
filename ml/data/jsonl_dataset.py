"""
BC training-data loader.

Reads gzipped JSONL files written by
`scripts/generate-bc-rollouts.mjs`. Each row encodes a single
decision: base64-encoded grid (Float32), globals (Float32), mask
(Uint8), plus the integer action index and faction string.

Holdout split is **by match_id** (GAP-G from the BC plan
re-evaluation) so correlated states from the same match never
leak across train/val.

In-memory load is OK for first-pass BC (smoke run = ~15k rows,
1000/faction = ~300k rows × ~13KB compressed each ≈ ~4 GB on
disk; expanded to ~290k float32 grids each ~52KB = ~15 GB in
RAM if we held them all decoded). For the real run we'll either
chunk on disk or convert to a binary format. For now: simple.
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import numpy as np
import torch
from torch.utils.data import Dataset

from networks.policy import (
    OBS_CHANNELS,
    OBS_GLOBALS,
    GRID_ROWS,
    GRID_COLS,
    ACTION_SPACE_SIZE,
)


GRID_FLOATS = OBS_CHANNELS * GRID_ROWS * GRID_COLS  # 14*26*36 = 13104


@dataclass
class BCRow:
    match_id: str
    faction: str
    action: int
    grid: np.ndarray      # float32, shape (14, 26, 36)
    globals_vec: np.ndarray  # float32, shape (25,)
    mask: np.ndarray      # uint8, shape (9361,)


def _decode_b64_f32(b64: str, n: int) -> np.ndarray:
    """Base64 string → np.float32 ndarray of length `n`."""
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.float32)
    if arr.size != n:
        raise ValueError(f'expected {n} float32 values, got {arr.size}')
    return arr


def _decode_b64_u8(b64: str, n: int) -> np.ndarray:
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    if arr.size != n:
        raise ValueError(f'expected {n} uint8 values, got {arr.size}')
    return arr


def _iter_rollout_files(run_dir: str) -> Iterator[Path]:
    base = Path(run_dir)
    for jsonl_gz in sorted(base.rglob('*.jsonl.gz')):
        yield jsonl_gz


def _is_holdout(match_id: str, holdout_pct: float, seed: int) -> bool:
    """Stable hash of match_id into the holdout bucket. By-match
    splitting so correlated states from the same match don't leak
    across train/val (BC plan GAP-G)."""
    h = hashlib.sha1(f'{seed}|{match_id}'.encode()).hexdigest()
    bucket = int(h[:8], 16) / 0xFFFFFFFF
    return bucket < holdout_pct


def parse_row(raw: dict) -> BCRow:
    grid = _decode_b64_f32(raw['grid_b64'], GRID_FLOATS).reshape(OBS_CHANNELS, GRID_ROWS, GRID_COLS).copy()
    globals_vec = _decode_b64_f32(raw['globals_b64'], OBS_GLOBALS).copy()
    mask = _decode_b64_u8(raw['mask_b64'], ACTION_SPACE_SIZE).copy()
    return BCRow(
        match_id=raw['match_id'],
        faction=raw['faction'],
        action=int(raw['action']),
        grid=grid,
        globals_vec=globals_vec,
        mask=mask,
    )


class BCRolloutDataset(Dataset):
    """
    In-memory dataset of BC rollout rows. Constructed from one or
    more rollout run directories (each containing per-match
    jsonl.gz files + a manifest.json).

    `split`: 'train' or 'val'.
    `holdout_pct`: fraction of MATCHES held out (default 0.1).
    `seed`: hash seed for the train/val split.
    """

    def __init__(self, run_dirs: list[str], split: str = 'train', holdout_pct: float = 0.1, seed: int = 42):
        if split not in ('train', 'val'):
            raise ValueError(f'split must be "train" or "val", got {split!r}')
        self.split = split
        self.rows: list[BCRow] = []
        want_holdout = (split == 'val')

        for run_dir in run_dirs:
            for jsonl_gz in _iter_rollout_files(run_dir):
                with gzip.open(jsonl_gz, 'rt', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        raw = json.loads(line)
                        match_id = raw['match_id']
                        in_holdout = _is_holdout(match_id, holdout_pct, seed)
                        if in_holdout != want_holdout:
                            continue
                        self.rows.append(parse_row(raw))

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int):
        r = self.rows[idx]
        return {
            'grid': torch.from_numpy(r.grid),                 # float32 [14, 26, 36]
            'globals': torch.from_numpy(r.globals_vec),       # float32 [25]
            'action': torch.tensor(r.action, dtype=torch.long),
            'mask': torch.from_numpy(r.mask),                 # uint8 [9361]
        }


def class_frequencies(dataset: BCRolloutDataset) -> np.ndarray:
    """Count action occurrences across the dataset. Returns array
    of shape [ACTION_SPACE_SIZE] (most entries 0 because action
    space is huge but only a few hundred classes are ever used).
    Used by the trainer to build inverse-frequency loss weights."""
    counts = np.zeros(ACTION_SPACE_SIZE, dtype=np.int64)
    for r in dataset.rows:
        counts[r.action] += 1
    return counts


if __name__ == '__main__':
    # Smoke against the committed rollouts/bc/smoke set.
    import sys
    run_dir = sys.argv[1] if len(sys.argv) > 1 else 'rollouts/bc/smoke'
    train = BCRolloutDataset([run_dir], split='train')
    val = BCRolloutDataset([run_dir], split='val')
    print(f'train: {len(train)} rows  val: {len(val)} rows')
    if len(train) > 0:
        sample = train[0]
        print(f'sample shapes: grid={tuple(sample["grid"].shape)}  globals={tuple(sample["globals"].shape)}  mask={tuple(sample["mask"].shape)}  action={int(sample["action"])}')
    counts = class_frequencies(train)
    seen = (counts > 0).sum()
    most_common = np.argsort(-counts)[:8]
    print(f'distinct action classes in train: {seen}')
    for ai in most_common:
        if counts[ai] > 0:
            print(f'  action {ai}: {counts[ai]} occurrences')
