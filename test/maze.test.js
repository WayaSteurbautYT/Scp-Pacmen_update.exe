import test from "node:test";
import assert from "node:assert/strict";
import { createMaze, expandMaze, COLUMNS, ROWS, PACMAN_START, GHOST_STARTS, TEAM_STARTS, isOpen, findNextStep, reachablePositions } from "../src/maze.js";

test("maze dimensions, borders, and character spawns are valid", () => {
  const maze = createMaze();
  assert.equal(maze.length, ROWS);
  assert.ok(maze.every((row) => row.length === COLUMNS));
  assert.ok(maze[0].every((cell) => cell === "#"));
  assert.ok(maze.at(-1).every((cell) => cell === "#"));
  assert.ok(maze.every((row) => row[0] === "#" && row.at(-1) === "#"));
  assert.ok(isOpen(maze, PACMAN_START.x, PACMAN_START.y));
  for (const ghost of GHOST_STARTS) assert.ok(isOpen(maze, ghost.x, ghost.y));
  assert.ok(isOpen(maze, TEAM_STARTS.ghosts.x, TEAM_STARTS.ghosts.y));
});

test("maze has four power orbs and collectible pellets", () => {
  const maze = createMaze();
  assert.equal(maze.flat().filter((cell) => cell === "O").length, 4);
  assert.ok(maze.flat().filter((cell) => cell === ".").length > 100);
  assert.equal(maze.flat().filter((cell) => cell === "W").length, 2);
});

test("pathfinding returns a legal first move to reachable targets", () => {
  const maze = createMaze();
  const start = GHOST_STARTS[0];
  const target = { ...PACMAN_START };
  const step = findNextStep(maze, start, target);
  assert.ok(step);
  assert.ok(isOpen(maze, step.x, step.y));
  assert.equal(Math.abs(step.x - start.x) + Math.abs(step.y - start.y), 1);
  for (const ghost of GHOST_STARTS) assert.ok(findNextStep(maze, ghost, target));
});

test("pathfinding reports no step when already at the target", () => {
  const maze = createMaze();
  assert.equal(findNextStep(maze, { x: 1, y: 1 }, { x: 1, y: 1 }), null);
});

test("generated world is deterministic for a given seed", () => {
  assert.deepEqual(createMaze(COLUMNS, ROWS, 4321), createMaze(COLUMNS, ROWS, 4321));
  assert.notDeepEqual(createMaze(COLUMNS, ROWS, 3), createMaze(COLUMNS, ROWS, 7));
});

test("generated regions and collectibles stay connected across varied seeds", () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const maze = createMaze(COLUMNS, ROWS, seed);
    const reachable = reachablePositions(maze, PACMAN_START);
    for (let y = 1; y < maze.length - 1; y += 1) {
      for (let x = 1; x < maze[0].length - 1; x += 1) {
        if (maze[y][x] !== "#") assert.ok(reachable.has(`${x},${y}`), `unreachable tile ${x},${y} in seed ${seed}`);
      }
    }
  }
});

test("world expansion opens connected exits in every direction", () => {
  const maze = createMaze();
  const cases = [
    ["left", { x: 1, y: 18 }, (expanded) => expanded[18][11]],
    ["right", { x: COLUMNS - 2, y: 18 }, (expanded) => expanded[18][COLUMNS - 1]],
    ["up", { x: 20, y: 1 }, (expanded) => expanded[11][20]],
    ["down", { x: 20, y: ROWS - 2 }, (expanded) => expanded[ROWS - 1][20]],
  ];

  for (const [direction, anchor, getExit] of cases) {
    const expanded = expandMaze(maze, direction, anchor);
    assert.ok(isOpen(expanded, ...findExitCoordinates(direction, anchor, COLUMNS, ROWS)));
    assert.equal(getExit(expanded), " ");
    assert.equal(expanded.length, ROWS + (direction === "up" || direction === "down" ? 12 : 0));
    assert.equal(expanded[0].length, COLUMNS + (direction === "left" || direction === "right" ? 12 : 0));
    assert.ok(expanded[0].every((cell) => cell === "#"));
    assert.ok(expanded.at(-1).every((cell) => cell === "#"));
    assert.ok(expanded.every((row) => row[0] === "#" && row.at(-1) === "#"));
    const [start, target] = expansionRoute(direction, anchor);
    assert.ok(findNextStep(expanded, start, target), `${direction} expansion should remain traversable`);
  }
});

function findExitCoordinates(direction, anchor, width, height) {
  if (direction === "left") return [11, anchor.y];
  if (direction === "right") return [width - 1, anchor.y];
  if (direction === "up") return [anchor.x, 11];
  return [anchor.x, height - 1];
}

function expansionRoute(direction, anchor) {
  if (direction === "left") return [{ x: anchor.x + 12, y: anchor.y }, { x: 2, y: anchor.y }];
  if (direction === "right") return [{ x: anchor.x, y: anchor.y }, { x: COLUMNS + 10, y: anchor.y }];
  if (direction === "up") return [{ x: anchor.x, y: anchor.y + 12 }, { x: anchor.x, y: 2 }];
  return [{ x: anchor.x, y: anchor.y }, { x: anchor.x, y: ROWS + 10 }];
}
