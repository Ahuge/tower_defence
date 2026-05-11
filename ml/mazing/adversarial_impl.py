import random
import heapq
from collections import deque
from copy import deepcopy

# =============================
# CONFIG
# =============================

EMPTY = 0
WALL = 1

GRID_W = 20
GRID_H = 20

START = (0, 0)
GOAL = (GRID_W - 1, GRID_H - 1)

BEAM_WIDTH = 5
MUTATIONS_PER_STATE = 25
WAVES = 15

BASE_BUDGET = 10
BUDGET_GROWTH = 8

# scoring weights
ALPHA = 5.0   # path length
BETA = 1.0    # nodes expanded
GAMMA = 0.5   # max queue


# =============================
# BFS EVALUATION
# =============================

def bfs(grid):
    q = deque()
    q.append(START)

    visited = set([START])
    dist = {START: 0}

    nodes_expanded = 0
    max_queue = 1

    while q:
        max_queue = max(max_queue, len(q))
        x, y = q.popleft()
        nodes_expanded += 1

        if (x, y) == GOAL:
            return {
                "path_length": dist[(x, y)],
                "nodes_expanded": nodes_expanded,
                "max_queue": max_queue,
                "success": True
            }

        for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
            nx, ny = x+dx, y+dy

            if 0 <= nx < GRID_W and 0 <= ny < GRID_H:
                if grid[ny][nx] == EMPTY and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    dist[(nx, ny)] = dist[(x, y)] + 1
                    q.append((nx, ny))

    return {
        "path_length": 0,
        "nodes_expanded": nodes_expanded,
        "max_queue": max_queue,
        "success": False
    }


def score(result):
    if not result["success"]:
        return -1e9

    return (
        ALPHA * result["path_length"] +
        BETA * result["nodes_expanded"] +
        GAMMA * result["max_queue"]
    )


# =============================
# STATE
# =============================

class State:
    def __init__(self, grid, cost=0):
        self.grid = grid
        self.cost = cost
        self.score = None

    def clone(self):
        return State(deepcopy(self.grid), self.cost)


# =============================
# COST MODEL
# =============================

def placement_cost(x, y):
    # simple but extensible
    dist_from_start = abs(x - START[0]) + abs(y - START[1])
    return 1 + (dist_from_start * 0.05)


# =============================
# MUTATIONS
# =============================

def random_empty_cell(grid):
    for _ in range(50):
        x = random.randint(0, GRID_W - 1)
        y = random.randint(0, GRID_H - 1)
        if grid[y][x] == EMPTY and (x, y) not in [START, GOAL]:
            return x, y
    return None


def add_wall(state, budget):
    s = state.clone()
    cell = random_empty_cell(s.grid)
    if not cell:
        return None

    x, y = cell
    c = placement_cost(x, y)

    if s.cost + c > budget:
        return None

    s.grid[y][x] = WALL
    s.cost += c
    return s


def remove_wall(state):
    s = state.clone()
    walls = [(x, y) for y in range(GRID_H) for x in range(GRID_W) if s.grid[y][x] == WALL]
    if not walls:
        return None

    x, y = random.choice(walls)
    s.grid[y][x] = EMPTY
    return s


def grow_branch(state, budget, length=5):
    s = state.clone()

    x, y = random_empty_cell(s.grid) or (None, None)
    if x is None:
        return None

    for _ in range(length):
        if s.cost > budget:
            break

        if s.grid[y][x] == EMPTY and (x, y) not in [START, GOAL]:
            c = placement_cost(x, y)
            if s.cost + c > budget:
                break
            s.grid[y][x] = WALL
            s.cost += c

        dx, dy = random.choice([(1,0),(-1,0),(0,1),(0,-1)])
        x = max(0, min(GRID_W-1, x+dx))
        y = max(0, min(GRID_H-1, y+dy))

    return s


def mutate(state, budget):
    ops = [
        lambda s: add_wall(s, budget),
        lambda s: grow_branch(s, budget, length=random.randint(3, 8)),
        lambda s: remove_wall(s),
    ]

    for _ in range(5):
        op = random.choice(ops)
        new_state = op(state)
        if new_state:
            return new_state

    return None


# =============================
# INITIAL GRID
# =============================

def empty_grid():
    return [[EMPTY for _ in range(GRID_W)] for _ in range(GRID_H)]


# =============================
# MAIN LOOP
# =============================

def run():
    initial = State(empty_grid())
    beam = [initial]

    for wave in range(WAVES):
        budget = BASE_BUDGET + wave * BUDGET_GROWTH
        candidates = []

        for state in beam:
            for _ in range(MUTATIONS_PER_STATE):
                new_state = mutate(state, budget)
                if not new_state:
                    continue

                result = bfs(new_state.grid)
                new_state.score = score(result)
                candidates.append(new_state)

        # keep best beam
        candidates.sort(key=lambda s: s.score, reverse=True)
        beam = candidates[:BEAM_WIDTH]

        best = beam[0]
        print(f"Wave {wave}: best score={best.score:.2f}")

    return beam[0]


# =============================
# VISUALIZATION
# =============================

def print_grid(grid):
    for y in range(GRID_H):
        row = ""
        for x in range(GRID_W):
            if (x, y) == START:
                row += "S"
            elif (x, y) == GOAL:
                row += "G"
            elif grid[y][x] == WALL:
                row += "#"
            else:
                row += "."
        print(row)


# =============================
# RUN
# =============================

if __name__ == "__main__":
    best = run()
    print("\nFinal Grid:\n")
    print_grid(best.grid)
