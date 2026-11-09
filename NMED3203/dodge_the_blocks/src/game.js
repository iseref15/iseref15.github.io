// game.js — game state, update loop, spawning, collision and drawing.
//
// WHERE THE TWO PREMISES LIVE (find them quickly):
//   Agency      -> setMovement(), movePlayer(), checkCollision()   (input -> position -> hit or miss)
//   Temporality -> applyDifficulty()                               (elapsed time -> faster blocks)
//   Fairness    -> moveCorridor(), spawnObstacle(), checkFairness()
// Reads every rule from config.js. It never touches the page (HTML) directly:
// it talks to main.js through the "hooks" given to initGame().

import { CONFIG, THEME } from "./config.js";
import { createGameScenery } from "./scenery.js";

let canvas;
let ctx;
let hooks;
let state;
let frameId = null;   // id of the one running animation loop (null = no loop)
let lastTime = null;  // timestamp of the previous frame
let scenery;          // pixel-art background layers (see scenery.js)
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Which input sources currently hold each direction (keyboard keys, on-screen buttons).
const held = { left: new Set(), right: new Set() };

// ---------------------------------------------------------------- setup

export function initGame(canvasElement, uiHooks) {
  canvas = canvasElement;
  ctx = canvas.getContext("2d");
  hooks = uiHooks;

  // Sharp drawing on high-density screens; CSS scales the canvas to fit the page.
  const ratio = window.devicePixelRatio || 1;
  canvas.width = CONFIG.canvasWidth * ratio;
  canvas.height = CONFIG.canvasHeight * ratio;
  canvas.style.aspectRatio = `${CONFIG.canvasWidth} / ${CONFIG.canvasHeight}`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  scenery = createGameScenery(CONFIG.canvasWidth, CONFIG.canvasHeight, CONFIG.canvasHeight - CONFIG.playerBottomMarginPx);

  checkFairness().forEach((warning) => console.warn("[Dodge the Blocks]", warning));
  resetGame("normal");
}

export function getState() {
  return state;
}

// Speed at the start of a run. Fast mode differs from Normal ONLY here.
export function getStartSpeed(mode) {
  const multiplier = mode === "fast" ? CONFIG.fastModeMultiplier : 1;
  return Math.min(
    CONFIG.initialObstacleSpeedPxPerSecond * multiplier,
    CONFIG.maximumObstacleSpeedPxPerSecond
  );
}

// ---------------------------------------------------------------- run control

// Puts everything back to a clean, not-yet-started run (score 0, speed reset).
export function resetGame(mode = "normal") {
  stopLoop();
  state = {
    status: "ready",              // "ready" | "playing" | "gameover"
    mode,
    elapsed: 0,                   // simulation seconds survived (not wall-clock time)
    score: 0,
    level: 0,                     // how many speed milestones have been reached
    speed: getStartSpeed(mode),   // current obstacle speed in px/s
    spawnTimer: CONFIG.firstBlockDelayMilliseconds / 1000, // seconds until the next block may appear
    // Hidden "safe path": blocks never spawn on it, so a way through always exists.
    corridor: { x: CONFIG.canvasWidth / 2, target: CONFIG.canvasWidth / 2 },
    blockColor: THEME.obstaclePalette[0], // colour of all blocks; changes at every speed increase
    scroll: 0,                    // how far the clouds have drifted (only for the look of speed)
    obstacles: [],
    player: {
      size: CONFIG.playerSize,
      x: (CONFIG.canvasWidth - CONFIG.playerSize) / 2,
      y: CONFIG.canvasHeight - CONFIG.playerSize - CONFIG.playerBottomMarginPx
    }
  };
  draw();
  hooks.onUpdate(getHudInfo());
}

export function startGame(mode) {
  resetGame(mode);
  state.status = "playing";
  lastTime = null;
  frameId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
}

function endGame() {
  state.status = "gameover";
  stopLoop();
  draw(); // freeze the final frame
  hooks.onUpdate(getHudInfo());
  hooks.onGameOver(getHudInfo());
}

// ---------------------------------------------------------------- the loop

function loop(now) {
  // Delta time in seconds, capped so a paused tab cannot cause a giant jump.
  const seconds = lastTime === null ? 0 : (now - lastTime) / 1000;
  lastTime = now;
  update(Math.min(seconds, CONFIG.maxFrameSeconds));
  draw();
  hooks.onUpdate(getHudInfo());
  frameId = state.status === "playing" ? requestAnimationFrame(loop) : null;
}

function update(dt) {
  if (state.status !== "playing") return;

  state.elapsed += dt;
  state.scroll += state.speed * CONFIG.cloudScrollRatio * dt;
  applyDifficulty();
  movePlayer(dt);
  moveCorridor(dt);
  spawnBlocks(dt);

  for (const obstacle of state.obstacles) {
    obstacle.y += state.speed * dt;

    if (checkCollision(state.player, obstacle)) {
      endGame();
      return; // game over happens once; nothing else updates
    }

    // Temporality + Agency payoff: the block got past the player without a hit.
    if (!obstacle.scored && obstacle.y > state.player.y + state.player.size) {
      obstacle.scored = true;
      state.score += 1;
    }
  }

  state.obstacles = state.obstacles.filter((o) => o.y < CONFIG.canvasHeight);
}

// ---------------------------------------------------------------- Temporality

// Every difficultyIntervalSeconds of elapsed game time the speed goes up.
export function applyDifficulty() {
  const reachedLevel = Math.floor(state.elapsed / CONFIG.difficultyIntervalSeconds);
  if (reachedLevel <= state.level) return;

  state.level = reachedLevel;
  const newSpeed = Math.min(
    getStartSpeed(state.mode) + reachedLevel * CONFIG.speedIncreasePxPerSecond,
    CONFIG.maximumObstacleSpeedPxPerSecond
  );
  if (newSpeed > state.speed) {
    state.speed = newSpeed;
    state.blockColor = pickNewBlockColor();
    hooks.onSpeedUp(getHudInfo());
  }
}

// Random colour from the palette, never the same one twice in a row.
function pickNewBlockColor() {
  const choices = THEME.obstaclePalette.filter((color) => color !== state.blockColor);
  if (choices.length === 0) return state.blockColor;
  return choices[Math.floor(Math.random() * choices.length)];
}

// ---------------------------------------------------------------- Agency

// source = who is pressing ("KeyA", "button"...), so two inputs can hold the same direction.
export function setMovement(direction, source, isPressed) {
  if (isPressed) held[direction].add(source);
  else held[direction].delete(source);
}

export function releaseAllMovement() {
  held.left.clear();
  held.right.clear();
}

// -1 = left, +1 = right, 0 = none. Holding both directions cancels out.
function getDirection() {
  return (held.right.size > 0 ? 1 : 0) - (held.left.size > 0 ? 1 : 0);
}

function movePlayer(dt) {
  const player = state.player;
  player.x += getDirection() * CONFIG.playerSpeedPxPerSecond * dt;
  // Never leave the playfield.
  player.x = Math.max(0, Math.min(CONFIG.canvasWidth - player.size, player.x));
}

// ---------------------------------------------------------------- obstacles

// Blocks appear one by one at random moments. Nobody waits for the previous block to
// leave, and some moments simply have no block (spawnSkipChance).
function spawnBlocks(dt) {
  state.spawnTimer -= dt;
  while (state.spawnTimer <= 0) {
    const delayMs = CONFIG.spawnDelayMinMilliseconds +
      Math.random() * (CONFIG.spawnDelayMaxMilliseconds - CONFIG.spawnDelayMinMilliseconds);
    state.spawnTimer += delayMs / 1000;
    if (Math.random() >= CONFIG.spawnSkipChance) spawnObstacle();
  }
}

// Adds one block at a random valid x. It avoids the hidden safe path (fairness)
// and does not spawn right on top of another block.
export function spawnObstacle() {
  const half = getCorridorHalfWidth();
  for (let attempt = 0; attempt < CONFIG.spawnPlacementAttempts; attempt++) {
    const x = Math.random() * (CONFIG.canvasWidth - CONFIG.obstacleWidth);

    const onSafePath = x < state.corridor.x + half && x + CONFIG.obstacleWidth > state.corridor.x - half;
    const touchesAnother = state.obstacles.some(
      (o) => o.y < CONFIG.minBlockSpacingPx && x < o.x + o.width && x + CONFIG.obstacleWidth > o.x
    );
    if (onSafePath || touchesAnother) continue;

    state.obstacles.push({
      x,
      y: -CONFIG.obstacleHeight, // just above the top edge
      width: CONFIG.obstacleWidth,
      height: CONFIG.obstacleHeight,
      scored: false
    });
    return;
  }
  // No valid spot found this time: just skip this block.
}

// Axis-aligned rectangle overlap.
export function checkCollision(player, obstacle) {
  return (
    player.x < obstacle.x + obstacle.width &&
    player.x + player.size > obstacle.x &&
    player.y < obstacle.y + obstacle.height &&
    player.y + player.size > obstacle.y
  );
}

// ---------------------------------------------------------------- info for the page

function getHudInfo() {
  const maxed = state.speed >= CONFIG.maximumObstacleSpeedPxPerSecond;
  const intoInterval = state.elapsed % CONFIG.difficultyIntervalSeconds;
  const speedRange = CONFIG.maximumObstacleSpeedPxPerSecond - getStartSpeed(state.mode);
  return {
    status: state.status,
    mode: state.mode,
    score: state.score,
    elapsed: state.elapsed,
    level: state.level,
    maxLevel: Math.max(1, Math.ceil(speedRange / Math.max(1, CONFIG.speedIncreasePxPerSecond))),
    speed: state.speed,
    maxed,
    secondsToNextSpeedUp: CONFIG.difficultyIntervalSeconds - intoInterval,
    progressToNextSpeedUp: maxed ? 1 : intoInterval / CONFIG.difficultyIntervalSeconds
  };
}

// ---------------------------------------------------------------- fairness

// IDEA: the "safe path" is an invisible lane that wanders left and right. Blocks never
// spawn on it. It moves slower than the player can run (even when blocks are at their
// fastest), so the player can always follow it: every block is avoidable.

function getSlowestSpeed() {
  return Math.min(CONFIG.initialObstacleSpeedPxPerSecond, CONFIG.maximumObstacleSpeedPxPerSecond);
}

// Fastest the safe path may move sideways (px per second).
function getCorridorSpeed() {
  const catchUpRatio = getSlowestSpeed() / CONFIG.maximumObstacleSpeedPxPerSecond;
  return CONFIG.playerSpeedPxPerSecond * catchUpRatio * CONFIG.corridorSafetyFactor;
}

// Half of the no-block zone around the safe path: the player's body, a margin, and the
// distance the path drifts while a block (plus the player) passes by.
function getCorridorHalfWidth() {
  const drift =
    (CONFIG.playerSpeedPxPerSecond * CONFIG.corridorSafetyFactor *
      (CONFIG.obstacleHeight + CONFIG.playerSize)) / CONFIG.maximumObstacleSpeedPxPerSecond;
  return CONFIG.playerSize / 2 + CONFIG.safeGapMarginPx + drift;
}

// Moves the safe path toward a random target, never faster than getCorridorSpeed().
function moveCorridor(dt) {
  const path = state.corridor;
  const step = getCorridorSpeed() * dt;
  const distance = path.target - path.x;
  if (Math.abs(distance) <= step) {
    path.x = path.target;
    const half = getCorridorHalfWidth();
    const low = Math.min(half, CONFIG.canvasWidth / 2);
    const high = Math.max(CONFIG.canvasWidth - half, CONFIG.canvasWidth / 2);
    path.target = low + Math.random() * (high - low);
  } else {
    path.x += Math.sign(distance) * step;
  }
}

// Returns a list of warnings (empty = fair). Edit CONFIG and look at the console.
export function checkFairness() {
  const c = CONFIG;
  const warnings = [];

  if (getCorridorHalfWidth() * 2 + c.obstacleWidth > c.canvasWidth) {
    warnings.push(
      "The safe path is too wide for the playfield. Lower safeGapMarginPx, playerSpeedPxPerSecond or the " +
      "maximum speed, or widen the canvas."
    );
  }
  if (c.spawnDelayMinMilliseconds > c.spawnDelayMaxMilliseconds) {
    warnings.push("spawnDelayMinMilliseconds must not be larger than spawnDelayMaxMilliseconds.");
  }
  if (c.corridorSafetyFactor <= 0 || c.corridorSafetyFactor > 1) {
    warnings.push("corridorSafetyFactor should be between 0 and 1.");
  }
  if (c.maxFrameSeconds * c.maximumObstacleSpeedPxPerSecond >= c.obstacleHeight + c.playerSize) {
    warnings.push("maxFrameSeconds is too large: fast blocks could pass through the player.");
  }
  return warnings;
}

// ---------------------------------------------------------------- drawing

export function draw() {
  // Layers from back to front: sky + clouds, city + grass, blocks, player.
  scenery.drawSky(ctx, reduceMotion ? 0 : state.scroll);
  scenery.drawGround(ctx);
  state.obstacles.forEach(drawObstacle);
  drawPlayer(state.player);
}

function drawObstacle(o) {
  // Coloured rectangle with diagonal stripes: a different SHAPE/PATTERN, not just a different colour.
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.width, o.height);
  ctx.clip();
  ctx.fillStyle = state.blockColor;
  ctx.fillRect(o.x, o.y, o.width, o.height);
  ctx.strokeStyle = THEME.obstacleStripe;
  ctx.lineWidth = 5;
  for (let sx = o.x - o.height; sx < o.x + o.width; sx += 14) {
    ctx.beginPath();
    ctx.moveTo(sx, o.y + o.height);
    ctx.lineTo(sx + o.height, o.y);
    ctx.stroke();
  }
  ctx.fillStyle = THEME.obstacleLight; // light top edge
  ctx.fillRect(o.x, o.y, o.width, 3);
  ctx.fillStyle = THEME.obstacleShade; // dark bottom edge
  ctx.fillRect(o.x, o.y + o.height - 4, o.width, 4);
  ctx.restore();
  ctx.strokeStyle = THEME.obstacleOutline;
  ctx.lineWidth = 3;
  ctx.strokeRect(o.x + 1.5, o.y + 1.5, o.width - 3, o.height - 3);
}

function drawPlayer(p) {
  // Small shadow on the grass.
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(p.x + 4, p.y + p.size, p.size - 8, 4);

  // Blue rounded square with a dark outline, a white inner line and two eyes.
  roundedRectPath(p.x, p.y, p.size, p.size, 9);
  ctx.fillStyle = THEME.player;
  ctx.fill();
  ctx.strokeStyle = THEME.playerOutline;
  ctx.lineWidth = 4;
  ctx.stroke();
  roundedRectPath(p.x + 3, p.y + 3, p.size - 6, p.size - 6, 6);
  ctx.strokeStyle = THEME.playerHighlight;
  ctx.lineWidth = 2;
  ctx.stroke();

  const eyeY = p.y + p.size * 0.42;
  for (const eyeX of [p.x + p.size * 0.33, p.x + p.size * 0.67]) {
    ctx.fillStyle = THEME.playerHighlight;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, p.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = THEME.playerOutline;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, p.size * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundedRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
