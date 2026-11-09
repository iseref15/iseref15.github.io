// scenery.js — pixel-art scenery (sky, clouds, city, trees, grass) drawn with plain
// rectangles. No image files are used. Colours are only for looks, not game rules.

const COLORS = {
  skyBands: ["#1565c9", "#1a70d2", "#237cdb", "#3189e2", "#4698e8", "#5da8ee", "#78b9f2", "#94caf6"],
  cloud: "#ffffff",
  cloudShade: "#d3e7fa",
  cityFar: "#86abd0",
  cityNear: "#6f97bf",
  cityWindow: "#b3cfe8",
  grassDark: "#2f7d32",
  grass: "#43a047",
  grassLight: "#6cc070",
  treeDark: "#1b5e20",
  tree: "#2e7d32",
  treeLight: "#4caf50",
  trunk: "#6d4c41",
  trunkDark: "#4e342e",
  flowerWhite: "#fafafa",
  flowerRed: "#e53935",
  flowerYellow: "#fdd835"
};

// Small seeded random generator: the scenery looks the same on every load.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- tiny drawing helpers
// "unit" = size of one big pixel. gx/gy are grid cells, not screen pixels.

function cell(ctx, unit, gx, gy, gw, gh, color) {
  ctx.fillStyle = color;
  ctx.fillRect(gx * unit, gy * unit, gw * unit, gh * unit);
}

// A round blob made of square cells.
function disc(ctx, unit, cx, cy, radius, color) {
  for (let dy = -radius; dy <= radius; dy++) {
    const half = Math.floor(Math.sqrt(radius * radius - dy * dy + 0.5));
    cell(ctx, unit, cx - half, cy + dy, half * 2 + 1, 1, color);
  }
}

function sky(ctx, unit, gridW, horizonRow) {
  const bands = COLORS.skyBands;
  for (let row = 0; row < horizonRow; row++) {
    const index = Math.min(bands.length - 1, Math.floor((row / horizonRow) * bands.length));
    cell(ctx, unit, 0, row, gridW, 1, bands[index]);
  }
}

// size 1 = small cloud, 3 = big cloud
function drawCloud(ctx, unit, gx, gy, size) {
  const r = size * 3;
  const parts = [
    [0, 0, r],
    [Math.round(r * 1.4), Math.round(-r * 0.3), Math.round(r * 0.8)],
    [Math.round(-r * 1.3), Math.round(r * 0.2), Math.round(r * 0.7)],
    [Math.round(r * 0.5), Math.round(-r * 0.9), Math.round(r * 0.7)]
  ];
  parts.forEach(([dx, dy, pr]) => disc(ctx, unit, gx + dx, gy + dy + 1, pr, COLORS.cloudShade));
  parts.forEach(([dx, dy, pr]) => disc(ctx, unit, gx + dx, gy + dy, pr, COLORS.cloud));
}

// A row of buildings with one tall tower, like a far-away city.
function city(ctx, unit, fromCol, toCol, baseRow, seed, towerCol) {
  const random = seeded(seed);
  let col = fromCol;
  while (col < toCol) {
    const width = 3 + Math.floor(random() * 4);
    const height = 4 + Math.floor(random() * 11);
    const color = random() > 0.5 ? COLORS.cityFar : COLORS.cityNear;
    cell(ctx, unit, col, baseRow - height, width, height, color);
    for (let wy = baseRow - height + 1; wy < baseRow - 1; wy += 2) {
      if (random() > 0.55) cell(ctx, unit, col + 1 + Math.floor(random() * (width - 2)), wy, 1, 1, COLORS.cityWindow);
    }
    col += width + (random() > 0.6 ? 1 : 0);
  }
  if (towerCol !== undefined) {
    cell(ctx, unit, towerCol, baseRow - 22, 3, 22, COLORS.cityNear);
    cell(ctx, unit, towerCol - 1, baseRow - 14, 5, 3, COLORS.cityFar);
    cell(ctx, unit, towerCol + 1, baseRow - 28, 1, 6, COLORS.cityNear);
    cell(ctx, unit, towerCol + 1, baseRow - 30, 1, 2, COLORS.cityWindow);
  }
}

function grass(ctx, unit, gridW, topRow, rows, seed) {
  const random = seeded(seed);
  cell(ctx, unit, 0, topRow, gridW, rows, COLORS.grass);
  for (let col = 0; col < gridW; col++) {
    if (random() > 0.45) cell(ctx, unit, col, topRow - 1, 1, 1, COLORS.grass); // ragged top edge
    for (let row = 0; row < rows; row++) {
      const roll = random();
      if (roll > 0.86) cell(ctx, unit, col, topRow + row, 1, 1, COLORS.grassLight);
      else if (roll < 0.14) cell(ctx, unit, col, topRow + row, 1, 1, COLORS.grassDark);
    }
  }
  for (let i = 0; i < gridW / 7; i++) {
    const flower = [COLORS.flowerWhite, COLORS.flowerRed, COLORS.flowerYellow][Math.floor(random() * 3)];
    cell(ctx, unit, Math.floor(random() * gridW), topRow + Math.floor(random() * rows), 1, 1, flower);
  }
}

function tree(ctx, unit, baseCol, baseRow, scale) {
  const trunkHeight = 5 * scale;
  cell(ctx, unit, baseCol - scale, baseRow - trunkHeight, 2 * scale, trunkHeight, COLORS.trunk);
  cell(ctx, unit, baseCol, baseRow - trunkHeight, scale, trunkHeight, COLORS.trunkDark);
  const top = baseRow - trunkHeight;
  disc(ctx, unit, baseCol, top - 3 * scale, 5 * scale, COLORS.treeDark);
  disc(ctx, unit, baseCol - scale, top - 4 * scale, 4 * scale, COLORS.tree);
  disc(ctx, unit, baseCol - 2 * scale, top - 5 * scale, 2 * scale + 1, COLORS.treeLight);
}

function bush(ctx, unit, col, row, size) {
  disc(ctx, unit, col, row, size, COLORS.treeDark);
  disc(ctx, unit, col - 1, row - 1, Math.max(1, size - 1), COLORS.tree);
}

// ---------------------------------------------------------------- scenery for the game canvas

// Builds the still layers once. Only the clouds move (they drift down with the block speed).
export function createGameScenery(width, height, groundTop) {
  const unit = 4;
  const gridW = Math.ceil(width / unit);
  const groundRow = Math.round(groundTop / unit);
  const gridH = Math.ceil(height / unit);

  const skyLayer = document.createElement("canvas");
  skyLayer.width = width;
  skyLayer.height = height;
  sky(skyLayer.getContext("2d"), unit, gridW, groundRow);

  const groundLayer = document.createElement("canvas");
  groundLayer.width = width;
  groundLayer.height = height;
  const g = groundLayer.getContext("2d");
  city(g, unit, 12, gridW - 12, groundRow, 7, Math.round(gridW * 0.62));
  bush(g, unit, 4, groundRow, 4);
  bush(g, unit, gridW - 5, groundRow, 5);
  bush(g, unit, gridW - 14, groundRow, 3);
  grass(g, unit, gridW, groundRow, gridH - groundRow, 21);

  const random = seeded(5);
  const clouds = Array.from({ length: 6 }, (_, i) => ({
    x: Math.floor(random() * gridW),
    y: Math.floor((i / 6) * groundRow),
    size: 1 + Math.floor(random() * 2)
  }));
  const wrapRows = groundRow + 24;

  return {
    drawSky(ctx, cloudScroll) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skyLayer, 0, 0, width, height);
      const shift = Math.floor(cloudScroll / unit);
      clouds.forEach((c) => {
        const row = ((c.y + shift) % wrapRows) - 12; // wraps around the top and bottom
        drawCloud(ctx, unit, c.x, row, c.size);
      });
    },
    drawGround(ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(groundLayer, 0, 0, width, height);
    }
  };
}

// ---------------------------------------------------------------- scenery for the page background

export function drawPageBackdrop(canvas) {
  const unit = 6;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const gridW = Math.ceil(width / unit);
  const gridH = Math.ceil(height / unit);
  const horizon = Math.round(gridH * 0.7);

  sky(ctx, unit, gridW, horizon);

  const random = seeded(11);
  for (let i = 0; i < Math.max(4, gridW / 14); i++) {
    drawCloud(ctx, unit, Math.floor(random() * gridW), 4 + Math.floor(random() * (horizon - 16)), 1 + Math.floor(random() * 3));
  }

  city(ctx, unit, Math.round(gridW * 0.04), Math.round(gridW * 0.62), horizon, 3, Math.round(gridW * 0.3));
  tree(ctx, unit, Math.round(gridW * 0.05), horizon + 3, 1);
  tree(ctx, unit, Math.round(gridW * 0.14), horizon + 2, 2);
  grass(ctx, unit, gridW, horizon, gridH - horizon, 33);
  tree(ctx, unit, Math.round(gridW * 0.92), horizon + 10, 3); // big tree on the right
  bush(ctx, unit, Math.round(gridW * 0.78), horizon + 5, 3);
  bush(ctx, unit, Math.round(gridW * 0.2), horizon + 8, 4);
}
