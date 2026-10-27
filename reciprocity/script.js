"use strict";

// ============================================================
// 1. DESIGN — ayarlanabilir bütün temel tasarım kararları burada.
// mode: "accumulation" toplam koşulu, "sequence" sıra koşuludur.
// ============================================================
const DESIGN = {
  mode: "accumulation",
  colors: {
    background: "#090d16",
    backgroundSoft: "#0d1421",
    panel: "#111a28",
    panelRaised: "#172334",
    text: "#f0f1e8",
    muted: "#a2afbd",
    dim: "#718194",
    accent: "#b8e4c5",
    glow: "#a6ead3",
    petal: "#e8cce8",
    border: "rgba(190, 213, 214, 0.16)",
    focusRing: "#f5d28c"
  },
  sizes: {
    sceneMinHeight: "420px",
    plantWidth: "min(76%, 330px)",
    hotspotSize: "76px",
    pageMaxWidth: "1180px",
    panelRadius: "22px",
    contentGap: "28px"
  },
  timing: {
    // Eylem sonrasında kontrol kilidi ve tepki animasyonunun süresi.
    responseMs: 720,
    // Arka plan yıldızları ve sisinin hareket hızı.
    ambientMs: 16000
  },
  thresholds: {
    // Toplam koşulunda her eylem türünün kaç kez gerekli olduğu.
    accumulationPerAction: 1,
    // Son üç eylemin görünür izinde kaç yer gösterileceği.
    visibleHistoryLength: 3
  },
  rules: {
    accumulation: {
      requiredActions: ["water", "rest", "light"]
    },
    sequence: {
      // Sıralı koşulda çiçeği açan dizi.
      pattern: ["water", "rest", "light"]
    }
  },
  actions: {
    water: { label: "Water", symbol: "滴", response: "Water settles into the soil." },
    rest: { label: "Rest", symbol: "☾", response: "The garden listens in the quiet." },
    light: { label: "Light", symbol: "✳", response: "A pale beam reaches toward the stem." }
  },
  messages: {
    initial: "The garden is still. Make your first gesture.",
    seed: "A seed, waiting",
    sprout: "A first sign of life",
    leaves: "Leaves turn toward the night",
    bud: "A flower holds its breath",
    bloom: "The flower opens. This attempt is complete; reset to begin again.",
    paused: "The garden is paused. Resume when you are ready.",
    completedHint: "This attempt has ended. Reset the garden to begin again.",
    readyHint: "The garden will open in its own time. You can reset at any moment."
  }
};

// ============================================================
// 2. STATE — etkileşimin belleği; sunucuya ya da diske yazılmaz.
// ============================================================
const state = {
  counts: { water: 0, rest: 0, light: 0 },
  history: [],
  lastAction: "none",
  growthStage: 0,
  sequenceProgress: 0,
  isBloomed: false,
  isPaused: false,
  isResponding: false,
  responseTimer: null,
  responseStartedAt: null,
  responseRemainingMs: DESIGN.timing.responseMs
};

// ============================================================
// 3. INPUT — düğmeler ve tüm girişlerin ortak işlem yolu.
// ============================================================
const gardenScene = document.getElementById("gardenScene");
const actionButtons = Array.from(document.querySelectorAll("[data-action]"));
const pauseButton = document.getElementById("pauseButton");
const pauseLabel = document.getElementById("pauseLabel");
const pauseIcon = document.getElementById("pauseIcon");
const resetButton = document.getElementById("resetButton");

function dispatchAction(action) {
  // Animasyon, duraklatma veya tamamlanmış deneme sırasında giriş kabul edilmez.
  if (state.isPaused || state.isResponding || state.isBloomed) return;
  if (!Object.prototype.hasOwnProperty.call(DESIGN.actions, action)) return;

  const result = RULE.applyAction(action);
  OUTPUT.render();
  OUTPUT.playResponse();
  startResponseLock();

  if (result.bloomed) {
    state.isBloomed = true;
    OUTPUT.render();
  }
}

function startResponseLock() {
  state.isResponding = true;
  state.responseRemainingMs = DESIGN.timing.responseMs;
  armResponseTimer();
  OUTPUT.renderControls();
}

function armResponseTimer() {
  if (state.responseTimer !== null || state.isPaused || !state.isResponding) return;
  state.responseStartedAt = performance.now();
  state.responseTimer = window.setTimeout(() => {
    state.responseTimer = null;
    state.responseStartedAt = null;
    state.responseRemainingMs = 0;
    state.isResponding = false;
    gardenScene.classList.remove("is-responding");
    OUTPUT.renderControls();
  }, Math.max(0, state.responseRemainingMs));
}

function togglePause() {
  if (!state.isPaused) {
    state.isPaused = true;
    if (state.responseTimer !== null) {
      window.clearTimeout(state.responseTimer);
      state.responseTimer = null;
      const elapsed = performance.now() - state.responseStartedAt;
      state.responseRemainingMs = Math.max(0, state.responseRemainingMs - elapsed);
      state.responseStartedAt = null;
    }
    gardenScene.classList.add("is-paused");
  } else {
    state.isPaused = false;
    gardenScene.classList.remove("is-paused");
    if (state.isResponding) {
      if (state.responseRemainingMs <= 0) {
        state.isResponding = false;
        gardenScene.classList.remove("is-responding");
      } else {
        armResponseTimer();
      }
    }
  }
  OUTPUT.render();
}

function resetGarden() {
  // Sıfırlama, duraklatılmışken bile çalışır ve bekleyen zamanlayıcıyı iptal eder.
  if (state.responseTimer !== null) window.clearTimeout(state.responseTimer);
  state.counts.water = 0;
  state.counts.rest = 0;
  state.counts.light = 0;
  state.history = [];
  state.lastAction = "none";
  state.growthStage = 0;
  state.sequenceProgress = 0;
  state.isBloomed = false;
  state.isPaused = false;
  state.isResponding = false;
  state.responseTimer = null;
  state.responseStartedAt = null;
  state.responseRemainingMs = DESIGN.timing.responseMs;
  gardenScene.classList.remove("is-paused", "is-responding", "is-bloomed");
  OUTPUT.render();
}

actionButtons.forEach((button) => {
  button.addEventListener("click", () => dispatchAction(button.dataset.action));
});
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", resetGarden);

// ============================================================
// 4. RULE — hafıza değişikliği ve çiçeğin açılma kuralı.
// Tasarım ayarı hariç görünüm koduna bağımlı değildir.
// ============================================================
const RULE = {
  applyAction(action) {
    state.counts[action] += 1;
    state.history.push(action);
    state.lastAction = action;

    // Her iki koşulda da aynı eylem çeşitliliği bitkiyi seed -> sprout -> leaves -> bud aşamasına taşır.
    const required = DESIGN.rules.accumulation.requiredActions;
    state.growthStage = required.filter((name) => state.counts[name] > 0).length;

    let bloomed = false;
    if (DESIGN.mode === "accumulation") {
      const threshold = Math.max(1, Number(DESIGN.thresholds.accumulationPerAction) || 1);
      bloomed = required.every((name) => state.counts[name] >= threshold);
    } else if (DESIGN.mode === "sequence") {
      const pattern = DESIGN.rules.sequence.pattern;
      // Sıra eşleşmezse ilerleme sıfırlanır; Water yeniden gelirse yeni dizi başlatabilir.
      if (action === pattern[state.sequenceProgress]) {
        state.sequenceProgress += 1;
      } else {
        state.sequenceProgress = action === pattern[0] ? 1 : 0;
      }
      bloomed = state.sequenceProgress >= pattern.length;
    } else {
      // Bilinmeyen bir ayarda güvenli varsayılan olarak toplam kuralına düş.
      bloomed = required.every((name) => state.counts[name] >= DESIGN.thresholds.accumulationPerAction);
    }

    return {
      bloomed,
      message: bloomed ? DESIGN.messages.bloom : DESIGN.actions[action].response
    };
  }
};

// ============================================================
// 5. OUTPUT — state değerlerini erişilebilir arayüze yansıtır.
// ============================================================
const stateTitle = document.getElementById("stateTitle");
const stageLabel = document.getElementById("stageLabel");
const historyTrail = document.getElementById("historyTrail");
const feedbackText = document.getElementById("feedbackText");
const controlHint = document.getElementById("controlHint");

const OUTPUT = {
  applyDesignSettings() {
    const root = document.documentElement;
    const vars = {
      "--color-background": DESIGN.colors.background,
      "--color-background-soft": DESIGN.colors.backgroundSoft,
      "--color-panel": DESIGN.colors.panel,
      "--color-panel-raised": DESIGN.colors.panelRaised,
      "--color-text": DESIGN.colors.text,
      "--color-muted": DESIGN.colors.muted,
      "--color-dim": DESIGN.colors.dim,
      "--color-accent": DESIGN.colors.accent,
      "--color-glow": DESIGN.colors.glow,
      "--color-petal": DESIGN.colors.petal,
      "--color-border": DESIGN.colors.border,
      "--focus-ring": DESIGN.colors.focusRing,
      "--scene-min-height": DESIGN.sizes.sceneMinHeight,
      "--plant-width": DESIGN.sizes.plantWidth,
      "--hotspot-size": DESIGN.sizes.hotspotSize,
      "--page-max-width": DESIGN.sizes.pageMaxWidth,
      "--panel-radius": DESIGN.sizes.panelRadius,
      "--content-gap": DESIGN.sizes.contentGap,
      "--response-duration": `${DESIGN.timing.responseMs}ms`,
      "--ambient-duration": `${DESIGN.timing.ambientMs}ms`
    };
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  },

  render() {
    gardenScene.dataset.stage = String(state.growthStage);
    gardenScene.dataset.lastAction = state.lastAction;
    gardenScene.classList.toggle("is-bloomed", state.isBloomed);
    gardenScene.classList.toggle("is-paused", state.isPaused);

    if (state.isBloomed) {
      stateTitle.textContent = DESIGN.messages.bloom.startsWith("The flower opens") ? "The flower opens" : "A flower in bloom";
      stageLabel.textContent = "BLOOM";
      feedbackText.textContent = DESIGN.messages.bloom;
      controlHint.textContent = DESIGN.messages.completedHint;
    } else if (state.isPaused) {
      feedbackText.textContent = DESIGN.messages.paused;
      controlHint.textContent = "The memory is preserved while the garden is paused.";
      this.renderStageText();
    } else {
      const latest = state.lastAction === "none" ? DESIGN.messages.initial : DESIGN.actions[state.lastAction].response;
      feedbackText.textContent = latest;
      controlHint.textContent = DESIGN.messages.readyHint;
      this.renderStageText();
    }

    this.renderHistory();
    this.renderControls();
  },

  renderStageText() {
    const stages = [DESIGN.messages.seed, DESIGN.messages.sprout, DESIGN.messages.leaves, DESIGN.messages.bud];
    const labels = ["SEED", "SPROUT", "LEAVES", "BUD"];
    stateTitle.textContent = stages[Math.min(state.growthStage, stages.length - 1)];
    stageLabel.textContent = labels[Math.min(state.growthStage, labels.length - 1)];
  },

  renderHistory() {
    const limit = Math.max(1, Number(DESIGN.thresholds.visibleHistoryLength) || 3);
    const recent = state.history.slice(-limit);
    const slots = [];
    for (let index = 0; index < limit; index += 1) {
      const actionName = recent[index];
      if (actionName) {
        const action = DESIGN.actions[actionName];
        slots.push(`<div class="history-slot" aria-label="${action.label}"><span class="history-symbol" aria-hidden="true">${action.symbol}</span><span class="history-word">${action.label.toUpperCase()}</span></div>`);
      } else {
        slots.push('<div class="history-slot is-empty" aria-label="Empty gesture slot"><span class="history-symbol" aria-hidden="true">·</span><span class="history-word">EMPTY</span></div>');
      }
    }
    historyTrail.innerHTML = slots.join("");
    historyTrail.setAttribute("aria-label", recent.length ? `Recent gestures: ${recent.map((name) => DESIGN.actions[name].label).join(", ")}` : "No gestures yet");
  },

  renderControls() {
    const lockActions = state.isPaused || state.isResponding || state.isBloomed;
    actionButtons.forEach((button) => { button.disabled = lockActions; });
    pauseLabel.textContent = state.isPaused ? "Resume" : "Pause";
    pauseIcon.textContent = state.isPaused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-pressed", String(state.isPaused));
  },

  playResponse() {
    gardenScene.classList.remove("is-responding");
    // Aynı sınıfla art arda gelen animasyonu yeniden başlatmak için tarayıcıya stil okuması yaptırılır.
    void gardenScene.offsetWidth;
    gardenScene.classList.add("is-responding");
  }
};

OUTPUT.applyDesignSettings();
OUTPUT.render();
