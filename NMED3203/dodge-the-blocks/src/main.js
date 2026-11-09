// main.js — connects the page (buttons, keyboard, text) to the game in game.js.

import { CONFIG } from "./config.js";
import { drawPageBackdrop } from "./scenery.js";
import { initGame, startGame, resetGame, setMovement, releaseAllMovement, getState, getStartSpeed } from "./game.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const startScreen = $("start-screen");
const gameOverScreen = $("gameover-screen");
const messageBox = $("message");
let messageTimer = null;

// ---------------------------------------------------------------- page background

const backdrop = $("backdrop");
let resizeTimer = null;
drawPageBackdrop(backdrop);
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => drawPageBackdrop(backdrop), 150);
});

// ---------------------------------------------------------------- text from CONFIG

// Show the real numbers on the page, so a live config change is visible immediately.
$("normal-speed").textContent = `Starts at ${getStartSpeed("normal")} px/s`;
$("fast-speed").textContent = `Starts at ${getStartSpeed("fast")} px/s`;
$("rule-text").textContent =
  `Every ${CONFIG.difficultyIntervalSeconds} s the blocks fall ${CONFIG.speedIncreasePxPerSecond} px/s faster.`;

// ---------------------------------------------------------------- messages and HUD

function showMessage(text, seconds) {
  clearTimeout(messageTimer);
  messageBox.textContent = text;
  messageBox.classList.add("visible");
  messageTimer = setTimeout(hideMessage, seconds * 1000);
}

function hideMessage() {
  clearTimeout(messageTimer);
  messageBox.classList.remove("visible");
}

function updateHud(info) {
  $("score").textContent = info.score;
  $("time").textContent = `${info.elapsed.toFixed(1)} s`;
  $("mode").textContent = info.mode === "fast" ? "Fast" : "Normal";
  $("speed").textContent =
    `Level ${info.level + 1} · ${Math.round(info.speed)} px/s${info.maxed ? " (max)" : ""}`;
  $("next-speedup").textContent = info.maxed
    ? "Maximum speed reached"
    : `Next speed-up in ${Math.ceil(info.secondsToNextSpeedUp)} s`;
  updateGauge(info);
}

// Speed gauge: one segment per speed level. Past levels are full,
// the current segment fills up as the next speed-up approaches.
const gauge = $("speed-gauge");

function updateGauge(info) {
  const stepCount = info.maxLevel + 1;
  if (gauge.children.length !== stepCount) {
    gauge.replaceChildren(
      ...Array.from({ length: stepCount }, () => {
        const step = document.createElement("span");
        step.className = "gauge-step";
        step.appendChild(document.createElement("i"));
        return step;
      })
    );
  }
  Array.from(gauge.children).forEach((step, index) => {
    let fill = 0;
    if (index < info.level) fill = 1;
    else if (index === info.level) fill = info.maxed ? 1 : info.progressToNextSpeedUp;
    step.firstChild.style.width = `${fill * 100}%`;
  });
}

function showGameOver(info) {
  const modeName = info.mode === "fast" ? "Fast" : "Normal";
  $("final-text").textContent =
    `Final score: ${info.score}\nSurvived ${info.elapsed.toFixed(1)} s · ${modeName} mode · ${Math.round(info.speed)} px/s`;
  gameOverScreen.hidden = false;
  // Announced by screen readers; not shown as the yellow banner.
  hideMessage();
  messageBox.textContent = `Game over. Final score ${info.score}.`;
  $("restart-button").focus();
}

initGame(canvas, {
  onUpdate: updateHud,
  onSpeedUp: () => showMessage("Speed increased!", CONFIG.speedMessageSeconds),
  onGameOver: showGameOver
});

// ---------------------------------------------------------------- start / restart

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function begin(mode) {
  startScreen.hidden = true;
  gameOverScreen.hidden = true;
  hideMessage();
  messageBox.textContent = "";
  startGame(mode);
  canvas.focus({ preventScroll: true }); // arrow keys now belong to the game
}

$("start-button").addEventListener("click", () => begin(selectedMode()));
$("restart-button").addEventListener("click", () => begin(getState().mode));
$("menu-button").addEventListener("click", () => {
  gameOverScreen.hidden = true;
  hideMessage();
  messageBox.textContent = "";
  resetGame(getState().mode);
  startScreen.hidden = false;
  $("start-button").focus();
});

// ---------------------------------------------------------------- keyboard (Agency)

const KEY_DIRECTIONS = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right"
};

document.addEventListener("keydown", (event) => {
  const direction = KEY_DIRECTIONS[event.code];
  // Only take over the keys while a run is active, so menus and radio buttons still work.
  if (!direction || getState().status !== "playing") return;
  event.preventDefault(); // stops the page from scrolling
  setMovement(direction, event.code, true);
});

document.addEventListener("keyup", (event) => {
  const direction = KEY_DIRECTIONS[event.code];
  if (direction) setMovement(direction, event.code, false);
});

// Losing focus or hiding the tab must not leave the player "stuck" moving.
window.addEventListener("blur", releaseAllMovement);
document.addEventListener("visibilitychange", releaseAllMovement);

// ---------------------------------------------------------------- on-screen buttons (touch, mouse, keyboard)

function wireControlButton(button, direction) {
  const source = `button-${direction}`;
  const press = () => setMovement(direction, source, true);
  const release = () => setMovement(direction, source, false);

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    press();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((name) => button.addEventListener(name, release));
  button.addEventListener("contextmenu", (event) => event.preventDefault());

  // Keyboard: hold Space or Enter while the button is focused.
  button.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      press();
    }
  });
  button.addEventListener("keyup", (event) => {
    if (event.code === "Space" || event.code === "Enter") release();
  });
  button.addEventListener("blur", release);
}

wireControlButton($("left-button"), "left");
wireControlButton($("right-button"), "right");
