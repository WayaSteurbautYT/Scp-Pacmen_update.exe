export const COLUMNS = 59;
export const ROWS = 37;
export const PACMAN_START = Object.freeze({ x: 4, y: 18 });
export const GHOST_STARTS = Object.freeze([
  Object.freeze({ x: 51, y: 15 }),
  Object.freeze({ x: 54, y: 17 }),
  Object.freeze({ x: 51, y: 20 }),
  Object.freeze({ x: 48, y: 18 }),
]);
export const TEAM_STARTS = Object.freeze({
  pacmen: PACMAN_START,
  ghosts: Object.freeze({ x: 54, y: 18 }),
});

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createMaze(width = COLUMNS, height = ROWS, seed = Date.now()) {
  const random = seededRandom(seed);
  const maze = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || x === width - 1 || y === 0 || y === height - 1 ? "#" : ".",
    ),
  );

  // Break long walls into multiple gates so every region has more than one route.
  for (let y = 3; y < height - 3; y += 4) {
    const gaps = [];
    const gapCount = width >= 20 ? 2 + Math.floor(random() * 2) : 1;
    while (gaps.length < gapCount) {
      const gap = 3 + Math.floor(random() * (width - 6));
      if (gaps.every((existing) => Math.abs(existing - gap) >= 5)) gaps.push(gap);
    }
    for (let x = 2; x < width - 2; x += 1) {
      if (gaps.some((gap) => Math.abs(x - gap) < 3)) continue;
      maze[y][x] = "#";
    }
  }
  for (let x = 6; x < width - 5; x += 8) {
    const gap = 2 + Math.floor(random() * (height - 4));
    for (let y = 2; y < height - 2; y += 1) {
      if (Math.abs(y - gap) < 2 || maze[y][x] === "#") continue;
      if (random() > 0.25) maze[y][x] = "#";
    }
  }

  carvePocketRooms(maze);
  clearSpawnPad(maze, PACMAN_START);
  clearSpawnPad(maze, TEAM_STARTS.ghosts);
  for (const [x, y] of [[2, 2], [width - 3, 2], [2, height - 3], [width - 3, height - 3]]) {
    maze[y][x] = "O";
  }
  for (const [x, y] of [[Math.floor(width / 2), Math.floor(height / 2)], [Math.floor(width / 2) - 7, Math.floor(height / 2) + 6]]) {
    if (maze[y]?.[x] !== undefined) maze[y][x] = "W";
  }
  for (const ghost of GHOST_STARTS) maze[ghost.y][ghost.x] = " ";
  connectOpenRegions(maze, PACMAN_START);

  return maze;
}

function carvePocketRooms(maze) {
  const height = maze.length;
  const width = maze[0].length;
  for (let centerY = 7; centerY < height - 5; centerY += 11) {
    for (let centerX = 9; centerX < width - 6; centerX += 16) {
      for (let y = centerY - 2; y <= centerY + 2; y += 1) {
        for (let x = centerX - 3; x <= centerX + 3; x += 1) {
          if (maze[y]?.[x] === "#") maze[y][x] = ".";
        }
      }
    }
  }
}

function clearSpawnPad(maze, center) {
  for (let y = center.y - 3; y <= center.y + 3; y += 1) {
    for (let x = center.x - 3; x <= center.x + 3; x += 1) {
      if (maze[y]?.[x] !== undefined) maze[y][x] = " ";
    }
  }
}

function connectOpenRegions(maze, start) {
  let reachable = reachablePositions(maze, start);
  while (true) {
    let disconnected = null;
    for (let y = 1; y < maze.length - 1 && !disconnected; y += 1) {
      for (let x = 1; x < maze[y].length - 1; x += 1) {
        if (maze[y][x] !== "#" && !reachable.has(`${x},${y}`)) {
          disconnected = { x, y };
          break;
        }
      }
    }
    if (!disconnected) return;

    const queue = [disconnected];
    const parents = new Map([[`${disconnected.x},${disconnected.y}`, null]]);
    let connection = null;
    for (let index = 0; index < queue.length && !connection; index += 1) {
      const current = queue[index];
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const next = { x: current.x + dx, y: current.y + dy };
        if (next.x <= 0 || next.x >= maze[0].length - 1 || next.y <= 0 || next.y >= maze.length - 1) continue;
        const key = `${next.x},${next.y}`;
        if (parents.has(key)) continue;
        parents.set(key, `${current.x},${current.y}`);
        if (reachable.has(key)) {
          connection = next;
          break;
        }
        queue.push(next);
      }
    }

    if (!connection) return;
    let cursor = `${connection.x},${connection.y}`;
    while (cursor) {
      const [x, y] = cursor.split(",").map(Number);
      if (maze[y][x] === "#") maze[y][x] = ".";
      cursor = parents.get(cursor);
    }
    reachable = reachablePositions(maze, start);
  }
}

export function expandMaze(maze, direction, anchor, chunkSize = 12, seed = Date.now() ^ maze[0].length ^ maze.length) {
  const height = maze.length;
  const width = maze[0].length;
  const random = seededRandom(seed);
  let expanded;

  if (direction === "left" || direction === "right") {
    expanded = maze.map((row) => direction === "left"
      ? [...Array(chunkSize).fill("."), ...row]
      : [...row, ...Array(chunkSize).fill(".")]);
    const seam = direction === "left" ? chunkSize : width - 1;
    const anchorX = direction === "left" ? chunkSize - 1 : width - 1;
    for (let y = 0; y < height; y += 1) {
      expanded[y][seam] = y === 0 || y === height - 1 ? "#" : ".";
    }
    expanded[0].fill("#");
    expanded[height - 1].fill("#");
    for (let y = Math.max(1, anchor.y - 2); y <= Math.min(height - 2, anchor.y + 2); y += 1) {
      expanded[y][anchorX] = " ";
    }
    const obstacleX = direction === "left" ? 5 : width + 5;
    const gap = Math.max(2, Math.min(height - 3, anchor.y + Math.floor(random() * 5) - 2));
    for (let y = 2; y < height - 2; y += 1) {
      if (Math.abs(y - gap) > 1 && Math.abs(y - anchor.y) > 2) expanded[y][obstacleX] = "#";
    }
    const itemX = direction === "left" ? 2 : width + 8;
    expanded[Math.max(2, Math.min(height - 3, anchor.y + 4))][itemX] = "O";
    expanded[Math.max(2, Math.min(height - 3, anchor.y - 4))][itemX] = "W";
    if (direction === "left") {
      for (let y = 1; y < height - 1; y += 1) expanded[y][0] = "#";
    } else {
      for (let y = 1; y < height - 1; y += 1) expanded[y][width + chunkSize - 1] = "#";
    }
  } else {
    const newRows = Array.from({ length: chunkSize }, () =>
      Array.from({ length: width }, () => "."),
    );
    expanded = direction === "up" ? [...newRows, ...maze.map((row) => [...row])] : [...maze.map((row) => [...row]), ...newRows];
    for (const row of expanded) {
      row[0] = "#";
      row[width - 1] = "#";
    }
    const seam = direction === "up" ? chunkSize : height - 1;
    const anchorY = direction === "up" ? chunkSize - 1 : height - 1;
    for (let x = 0; x < width; x += 1) expanded[seam][x] = x === 0 || x === width - 1 ? "#" : ".";
    for (let x = Math.max(1, anchor.x - 2); x <= Math.min(width - 2, anchor.x + 2); x += 1) expanded[anchorY][x] = " ";
    const obstacleY = direction === "up" ? 5 : height + 5;
    const gap = Math.max(2, Math.min(width - 3, anchor.x + Math.floor(random() * 5) - 2));
    for (let x = 2; x < width - 2; x += 1) {
      if (Math.abs(x - gap) > 1 && Math.abs(x - anchor.x) > 2) expanded[obstacleY][x] = "#";
    }
    const itemY = direction === "up" ? 2 : height + 8;
    expanded[itemY][Math.max(2, Math.min(width - 3, anchor.x + 4))] = "O";
    expanded[itemY][Math.max(2, Math.min(width - 3, anchor.x - 4))] = "W";
    if (direction === "up") {
      for (let x = 1; x < width - 1; x += 1) expanded[0][x] = "#";
    } else {
      for (let x = 1; x < width - 1; x += 1) expanded[height + chunkSize - 1][x] = "#";
    }
  }

  return expanded;
}

export function isOpen(maze, x, y) {
  return Boolean(maze[y]?.[x] && maze[y][x] !== "#");
}

export function reachablePositions(maze, start) {
  if (!isOpen(maze, start.x, start.y)) return new Set();
  const queue = [{ x: start.x, y: start.y }];
  const reachable = new Set([`${start.x},${start.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (!isOpen(maze, x, y) || reachable.has(key)) continue;
      reachable.add(key);
      queue.push({ x, y });
    }
  }
  return reachable;
}

export function findNextStep(maze, start, target) {
  if (start.x === target.x && start.y === target.y) return null;

  const directions = [
    { x: 0, y: -1, name: "up" },
    { x: 1, y: 0, name: "right" },
    { x: 0, y: 1, name: "down" },
    { x: -1, y: 0, name: "left" },
  ];
  const queue = [{ x: start.x, y: start.y, firstStep: null }];
  const visited = new Set([`${start.x},${start.y}`]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const direction of directions) {
      const x = current.x + direction.x;
      const y = current.y + direction.y;
      const key = `${x},${y}`;
      if (!isOpen(maze, x, y) || visited.has(key)) continue;

      const firstStep = current.firstStep ?? { x, y, direction: direction.name };
      if (x === target.x && y === target.y) return firstStep;
      visited.add(key);
      queue.push({ x, y, firstStep });
    }
  }

  return null;
}
