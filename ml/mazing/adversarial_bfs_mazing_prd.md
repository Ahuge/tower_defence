# PRD: Adversarial BFS-Maximizing Grid Placement System

## 1\. Overview

This system generates grid-based obstacle layouts (“tower placements”) that maximize the computational work and traversal length of a Breadth-First Search (BFS) algorithm.

Unlike traditional maze generation, this system uses an **adversarial, iterative optimization loop** with **budget-constrained placement** and **wave-based feedback** to progressively improve layouts.

The output is a grid configuration that:

* Maximizes shortest-path length between start and goal
* Maximizes BFS exploration cost (nodes expanded, queue size)
* Produces complex, misleading traversal structures

\---

## 2\. Goals

### Primary Goals

* Maximize BFS shortest path length from `start → goal`
* Maximize BFS computational effort:

  * Nodes expanded
  * Frontier (queue) size

### Secondary Goals

* Encourage misleading structures (dead ends, branches)
* Avoid trivial or degenerate layouts
* Maintain valid connectivity (start must reach goal)

\---

## 3\. Non-Goals

* Real-time generation (offline optimization is acceptable)
* Perfect maze generation
* Weighted pathfinding (this system targets unweighted BFS)

\---

## 4\. Key Concepts

### 4.1 Grid Representation

* 2D grid of cells
* Each cell is:

  * `EMPTY` (walkable)
  * `WALL` (blocked / tower)

### 4.2 BFS Evaluation

Each candidate grid is evaluated using BFS:

Metrics collected:

* `path\_length`: shortest path from start to goal
* `nodes\_expanded`: total visited nodes
* `max\_queue\_size`: peak BFS frontier size
* `success`: whether goal is reachable

\---

### 4.3 Budgeted Placement

Each wave provides a **budget** used to place walls.

Each placement has a cost:

&#x20;   cost(cell) = base\_cost + positional\_penalty


Constraints:

* Total placement cost ≤ wave budget
* Budget increases each wave

\---

### 4.4 Waves

The system runs in discrete iterations ("waves"):

Each wave:

1. Increases placement budget
2. Generates candidate mutations
3. Evaluates candidates via BFS
4. Selects best candidates for next wave

\---

## 5\. System Architecture

### 5.1 Core Loop

&#x20;   initialize beam with empty grid

    for each wave:
        compute budget

        generate candidate states via mutation
        evaluate each candidate with BFS
        score each candidate

        select top K candidates (beam search)

    return best candidate


\---

### 5.2 State Representation

&#x20;   State:
        grid: 2D array
        cost: total placement cost
        score: evaluation score


\---

### 5.3 Beam Search

* Maintain top `K` candidate states per wave
* Each state produces `N` mutations
* Next beam = best `K` scoring candidates

Benefits:

* Stability vs random search
* Retains strong structures across waves

\---

## 6\. Scoring Function

### 6.1 Base Formula

&#x20;   score =
        α \* path\_length
      + β \* nodes\_expanded
      + γ \* max\_queue\_size


### 6.2 Suggested Defaults

* α = 5.0 (primary driver)
* β = 1.0 (exploration cost)
* γ = 0.5 (frontier width)

### 6.3 Constraints

* If no valid path exists:

  * score = large negative penalty

\---

## 7\. Mutation System (Adversarial Engine)

### 7.1 Mutation Types

#### Local Mutations

* Add wall
* Remove wall
* Move wall

#### Structural Mutations

* Grow branch (random walk placing walls)
* Extend barrier
* Create corridor

\---

### 7.2 Mutation Constraints

* Must respect budget
* Must not overwrite start/goal
* Should preserve connectivity (optional enforcement)

\---

### 7.3 Mutation Strategy

Each candidate:

* Applies multiple random mutation attempts
* Accepts first valid mutation
* Produces multiple variants per wave

\---

## 8\. Budget Model

### 8.1 Budget Growth

&#x20;   budget(wave) = base\_budget + wave \* growth\_rate


Example:

* base = 10
* growth = 8

\---

### 8.2 Placement Cost Model

Simple baseline:

&#x20;   cost(x, y) = 1 + distance\_from\_start \* 0.05


Extensions:

* Penalize clustering
* Penalize blocking central corridors
* Encourage spatial diversity

\---

## 9\. Feedback Loop (Adversarial Component)

### 9.1 Implicit Feedback

The system learns via:

* BFS evaluation metrics
* Selection pressure (beam search)

\---

### 9.2 Future Explicit Feedback (Planned)

Introduce:

* BFS visitation heatmaps
* Path tracing
* Dead-end detection

Use these to:

* Target high-traffic areas for disruption
* Expand low-traffic areas to force exploration

\---

## 10\. Wave Progression Strategy

### Early Waves

* Small budget
* Simple mutations
* Focus on maintaining connectivity

### Mid Waves

* Increase branching
* Introduce misleading paths

### Late Waves

* Structural rewrites
* Fine-tuning bottlenecks
* Maximize BFS workload

\---

## 11\. Metrics \& Observability

Track per wave:

* Best score
* Path length
* Nodes expanded
* Max queue size
* Budget utilization

\---

## 12\. MVP Scope

### Included

* Grid + BFS evaluator
* Basic scoring function
* Beam search
* Mutation operators:

  * Add wall
  * Remove wall
  * Grow branch
* Wave-based budget system

### Excluded (Future Work)

* Heatmap-driven mutations
* Advanced structural heuristics
* Parallel execution
* Learned mutation policies

\---

## 13\. Future Enhancements

### 13.1 Heatmap-Guided Mutations

* Track BFS visitation frequency
* Reinforce or disrupt key areas

\---

### 13.2 Connectivity Enforcement

* Guarantee valid path exists
* Repair invalid grids instead of discarding

\---

### 13.3 Advanced Structures

* Backbone path generation
* Controlled loops
* Symmetry traps

\---

### 13.4 Parallelization

* Evaluate candidates concurrently
* Distribute across workers

\---

### 13.5 Learning-Based Approaches

* Reinforcement learning for mutation selection
* Evolutionary strategies

\---

## 14\. Risks \& Tradeoffs

|Risk|Mitigation|
|-|-|
|Degenerate grids (blocked path)|Penalize invalid states|
|Convergence to local optima|Increase mutation diversity|
|Too random / unstable|Use beam search|
|Performance scaling|Parallel BFS evaluation|

\---

## 15\. Key Insight

This system is not “building a maze” directly.

It is:

> Searching the space of all possible grids to find ones that are adversarial to BFS.

The most successful outputs will naturally converge toward:

* Long, winding backbone paths
* Deep misleading branches
* Minimal early shortcuts

\---

## 16\. Reference Implementation

The accompanying Python implementation includes:

* BFS evaluator with metrics
* Beam search loop
* Budget-constrained mutations
* Wave progression system

This PRD should be considered the architectural blueprint for evolving that implementation into a production-quality system.
