# Creeps — Names + Descriptions

Creep inspector panel text + wave preview tooltips.

Extracted by `scripts/extract-game-text.mjs` — re-run after source edits to refresh this file. Each entry shows the source location; apply edits by hand back to the TS source, then regenerate to confirm.

**Entries**: 17

---
### `id=standard`
<sub>src/data/CreepTypes.ts:50</sub>

**name**:

> Standard

**description**:

> Balanced. No surprises.

---

### `id=fast`
<sub>src/data/CreepTypes.ts:58</sub>

**name**:

> Fast

**description**:

> Double speed, half HP. Rushes through.

---

### `id=armored`
<sub>src/data/CreepTypes.ts:74</sub>

**name**:

> Armored

**description**:

> Heavy armor, slow, tanky. Resists physical.

---

### `id=swarm`
<sub>src/data/CreepTypes.ts:92</sub>

**name**:

> Swarm

**description**:

> Tiny but many. Spawns in groups of 3.

---

### `id=healer`
<sub>src/data/CreepTypes.ts:108</sub>

**name**:

> Healer

**description**:

> Heals nearby creeps 3%/s. Priority target.

---

### `id=boss`
<sub>src/data/CreepTypes.ts:125</sub>

**name**:

> Boss

**description**:

> Massive HP, shield, heavy armor.

---

### `id=group`
<sub>src/data/CreepTypes.ts:148</sub>

**name**:

> Group

**description**:

> Arrives in tight clusters. Hard to pick off individually.

---

### `id=splitter`
<sub>src/data/CreepTypes.ts:156</sub>

**name**:

> Splitter

**description**:

> Splits into 2 smaller creeps on death.

---

### `id=splitter_child`
<sub>src/data/CreepTypes.ts:175</sub>

**name**:

> Splitling

**description**:

> Fragment of a splitter.

---

### `id=mage_armor`
<sub>src/data/CreepTypes.ts:183</sub>

**name**:

> Iron Mage

**description**:

> Aura: nearby creeps gain +1 armor tier.

---

### `id=mage_speed`
<sub>src/data/CreepTypes.ts:200</sub>

**name**:

> Haste Mage

**description**:

> Aura: nearby creeps move 30% faster.

---

### `id=mage_evasion`
<sub>src/data/CreepTypes.ts:217</sub>

**name**:

> Mist Mage

**description**:

> Aura: nearby creeps gain 15% evasion.

---

### `id=mage_heal`
<sub>src/data/CreepTypes.ts:234</sub>

**name**:

> Heal Mage

**description**:

> Aura: heals nearby creeps for flat HP periodically.

---

### `id=shielded`
<sub>src/data/CreepTypes.ts:254</sub>

**name**:

> Shielded

**description**:

> Energy shield: max 1 damage per hit until shield breaks.

---

### `id=evasive`
<sub>src/data/CreepTypes.ts:275</sub>

**name**:

> Evasive

**description**:

> 25% dodge chance. Attacks can miss entirely.

---

### `id=regenerator`
<sub>src/data/CreepTypes.ts:296</sub>

**name**:

> Regenerator

**description**:

> Heavy armor, regenerates 2% max HP/s. DPS check.

---

### `id=flying`
<sub>src/data/CreepTypes.ts:317</sub>

**name**:

> Flying

**description**:

> Ignores maze. Flies direct to exit.
