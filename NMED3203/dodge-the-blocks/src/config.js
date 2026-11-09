// config.js — ALL live-edit settings live here.
// Change a number, save, refresh the browser. Nothing else needs to be touched.

export const CONFIG = {
  // --- Playfield (pixels) ---
  canvasWidth: 640,
  canvasHeight: 520,

  // --- Player (Agency) ---
  playerSize: 36,                 // width and height of the blue square
  playerSpeedPxPerSecond: 320,    // how fast the player slides left/right
  playerBottomMarginPx: 24,       // gap between the player and the bottom edge

  // --- Obstacles ---
  obstacleWidth: 55,
  obstacleHeight: 30,
  minBlockSpacingPx: 12,          // new blocks never spawn closer than this to the block above them

  // --- Spawning: blocks arrive one by one at random moments, never in fixed rows ---
  spawnDelayMinMilliseconds: 100, // shortest wait before the next block may appear
  spawnDelayMaxMilliseconds: 450, // longest wait
  spawnSkipChance: 0.2,           // 0-1: chance that a moment brings NO block (0 = never skip)
  firstBlockDelayMilliseconds: 200, // wait before the very first block of a run
  spawnPlacementAttempts: 25,     // tries to find a free spot for a new block before skipping it

  // --- Fairness: an invisible safe path always stays free of blocks ---
  safeGapMarginPx: 14,            // extra room around the safe path (bigger = easier)
  corridorSafetyFactor: 0.8,      // 0-1: how fast the safe path may move (lower = easier)

  // --- Time pressure (Temporality) ---
  initialObstacleSpeedPxPerSecond: 180,
  speedIncreasePxPerSecond: 20,   // added at every milestone
  difficultyIntervalSeconds: 10,  // time between milestones
  maximumObstacleSpeedPxPerSecond: 360,
  fastModeMultiplier: 1.5,        // Fast mode = initial speed x this number

  // --- Technical / feedback ---
  maxFrameSeconds: 0.05,          // cap one frame's time step (stops giant jumps after a tab pause)
  speedMessageSeconds: 1.5,       // how long "Speed increased!" stays visible
  cloudScrollRatio: 0.35          // background clouds drift down at this share of the block speed
};

// Canvas colours for the player and the blocks (the scenery colours live in scenery.js).
// The shapes (rounded square with eyes vs. striped rectangle) also differ,
// so the game does not rely on colour alone.
export const THEME = {
  player: "#2f6cf0",
  playerOutline: "#0a1f4d",
  playerHighlight: "#ffffff",
  // Block colours. A new random one is picked at every speed increase.
  // The first entry is the starting colour. No blues, so blocks never look like the player.
  obstaclePalette: ["#e5484d", "#f97316", "#ec4899", "#a855f7", "#22c55e", "#facc15"],
  obstacleStripe: "rgba(0, 0, 0, 0.3)",
  obstacleLight: "rgba(255, 255, 255, 0.35)",
  obstacleShade: "rgba(0, 0, 0, 0.25)",
  obstacleOutline: "#0a1f4d"
};
