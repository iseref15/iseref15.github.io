// 1. DESIGN — Görünüm, süreler ve fizik kuralları buradan değiştirilebilir.
const DESIGN = {
  colors: {
    accent: "#4f46e5",          // Seçili kontroller ve vurgu rengi.
    accentSoft: "#eef0ff",      // Seçili mod ve bilgi kutularının açık zemini.
    ink: "#21233e",             // Ana yazı rengi.
    muted: "#656b82",           // İkincil yazı rengi.
    background: "#f8f9fd",      // Sayfanın arka planı.
    surface: "#ffffff",         // Panellerin arka planı.
    platform: "#31395b",        // Platformun rengi.
    ball: "#4f46e5",            // Topun ana rengi.
    ballHighlight: "#c1bfff"    // Topun ışık alan kısmı.
  },
  sizes: {
    platformLengthPx: 460,      // Platformun referans uzunluğu; hareket alanını etkiler.
    platformThicknessPx: 12,    // Platformun kalınlığı.
    ballDiameterPx: 38,         // Topun çapı; kenar sınırını da etkiler.
    stageHeightPx: 350,         // Oyun alanının masaüstü yüksekliği.
    stageSidePaddingPx: 24,     // Dar ekranlarda kenarlarda bırakılan boşluk.
    ballGapPx: 2,               // Top ile platform arasındaki görsel boşluk.
    fallDropPx: 48              // Düşen topun platformun altına inme mesafesi.
  },
  timings: {
    acknowledgementMs: 240,    // Basılan düğmenin ne kadar vurgulanacağı.
    telemetryMs: 180,          // Full moddaki sayıların güncellenme sıklığı.
    announcementCooldownMs: 900, // Ekran okuyucu duyuruları arasında asgari süre.
    physicsStepMs: 20          // Büyük zaman aralıklarının fizik hesaplama adımı.
  },
  thresholds: {
    centerRatio: 0.20,         // Merkez bölgesinin toplam yarı mesafeye oranı.
    edgeRatio: 0.78,           // Kenara yakın sayılmanın oranı.
    edgePaddingPx: 3,          // Top platformdan düşmeden önceki güvenlik payı.
    stoppedSpeedPxPerSec: 1.3  // Bunun altındaki hız 'Still' olarak gösterilir.
  },
  rules: {
    tiltStepDegrees: 4,            // Her Tilt Left/Right basışı ile eğim değişimi.
    maxTiltDegrees: 12,            // İzin verilen en büyük sağ/sol eğim.
    accelerationAtOneSinPxPerSec2: 440, // Eğim kaynaklı ivmenin gücü.
    dragPerSecond: 0.10,           // Hareketi zamanla azaltan hafif sürtünme.
    initialPositionPx: 0,         // Her denemedeki başlangıç konumu (0 = merkez).
    initialVelocityPxPerSec: 35   // Her denemede sağa doğru aynı küçük başlangıç hızı.
  }
};

// 2. STATE — Mod, topun fiziksel durumu ve animasyon yönetimi.
const state = {
  x: DESIGN.rules.initialPositionPx,
  velocity: DESIGN.rules.initialVelocityPxPerSec,
  tilt: 0,
  mode: "full",
  ended: false,
  fallSide: null,
  lastFrameMs: null,
  lastTelemetryMs: 0,
  lastAnnouncementMs: -Infinity,
  lastAnnouncedZone: "center"
};

let animationId = null;
let acknowledgementTimer = null;
const elements = {
  stage: document.getElementById("stage"),
  ball: document.getElementById("ball"),
  platform: document.getElementById("platform"),
  positionText: document.getElementById("position-text"),
  tiltText: document.getElementById("tilt-text"),
  momentumReadout: document.getElementById("momentum-readout"),
  momentumText: document.getElementById("momentum-text"),
  momentumArrow: document.getElementById("momentum-arrow"),
  status: document.getElementById("attempt-status"),
  acknowledgement: document.getElementById("acknowledgement"),
  liveMessage: document.getElementById("live-message"),
  outcome: document.getElementById("outcome"),
  outcomeTitle: document.getElementById("outcome-title"),
  left: document.getElementById("tilt-left"),
  level: document.getElementById("level"),
  right: document.getElementById("tilt-right"),
  reset: document.getElementById("reset")
};

// 3. INPUT — Yerel HTML düğmeleri klavye, fare ve dokunmayla çalışır.
function acknowledge(button, label) {
  window.clearTimeout(acknowledgementTimer);
  [elements.left, elements.level, elements.right].forEach((item) => item.classList.remove("received"));
  button.classList.add("received");
  elements.acknowledgement.textContent = `Input received: ${label}.`;
  acknowledgementTimer = window.setTimeout(() => button.classList.remove("received"), DESIGN.timings.acknowledgementMs);
}

function applyTilt(direction, button, label) {
  if (state.ended) return;
  const proposed = state.tilt + direction * DESIGN.rules.tiltStepDegrees;
  state.tilt = Math.max(-DESIGN.rules.maxTiltDegrees, Math.min(DESIGN.rules.maxTiltDegrees, proposed));
  acknowledge(button, label);
  renderStage();
  renderTilt();
  announce(`Input received: ${label}. Platform tilt: ${describeTilt()}.`);
  ensureAnimation();
}

function levelPlatform() {
  if (state.ended) return;
  state.tilt = 0;
  acknowledge(elements.level, "Level");
  renderStage();
  renderTilt();
  announce("Input received: Level. Platform is level.");
  ensureAnimation();
}

function resetAttempt(message = "Attempt reset. New attempt started.") {
  stopAnimation();
  window.clearTimeout(acknowledgementTimer);
  [elements.left, elements.level, elements.right].forEach((button) => {
    button.classList.remove("received");
    button.disabled = false;
  });
  state.x = DESIGN.rules.initialPositionPx;
  state.velocity = DESIGN.rules.initialVelocityPxPerSec;
  state.tilt = 0;
  state.ended = false;
  state.fallSide = null;
  state.lastTelemetryMs = 0;
  state.lastAnnouncedZone = getPositionZone();
  state.lastAnnouncementMs = -Infinity;
  elements.outcome.hidden = true;
  elements.status.textContent = "In progress";
  elements.status.classList.remove("ended");
  elements.acknowledgement.textContent = "Ready for input.";
  renderAll(true);
  announce(message);
  ensureAnimation();
}

function changeFeedbackMode(nextMode) {
  if (nextMode !== "full" && nextMode !== "limited") return;
  state.mode = nextMode;
  resetAttempt(`${nextMode === "full" ? "Full feedback" : "Limited feedback"} selected. New attempt started.`);
}

// 4. RULE — Eğim ivme yaratır, sürtünme hızı azaltır, sınır geçilince deneme biter.
function travelLimit() {
  return DESIGN.sizes.platformLengthPx / 2 - DESIGN.sizes.ballDiameterPx / 2 - DESIGN.thresholds.edgePaddingPx;
}

function updatePhysics(elapsedSeconds) {
  const maxStep = DESIGN.timings.physicsStepMs / 1000;
  let remaining = elapsedSeconds;
  while (remaining > 0 && !state.ended) {
    const dt = Math.min(remaining, maxStep);
    const radians = state.tilt * Math.PI / 180;
    const acceleration = DESIGN.rules.accelerationAtOneSinPxPerSec2 * Math.sin(radians);
    state.velocity += acceleration * dt;
    state.velocity *= Math.exp(-DESIGN.rules.dragPerSecond * dt);
    state.x += state.velocity * dt;
    remaining -= dt;
    if (Math.abs(state.x) >= travelLimit()) {
      state.x = Math.sign(state.x) * travelLimit();
      state.fallSide = state.x > 0 ? "right" : "left";
      state.ended = true;
    }
  }
}

function tick(timestamp) {
  animationId = null;
  if (document.hidden || state.ended) return;
  if (state.lastFrameMs !== null) {
    const elapsedSeconds = Math.max(0, (timestamp - state.lastFrameMs) / 1000);
    updatePhysics(elapsedSeconds);
  }
  state.lastFrameMs = timestamp;
  renderStage();
  renderPosition();
  if (timestamp - state.lastTelemetryMs >= DESIGN.timings.telemetryMs) {
    renderMomentum();
    state.lastTelemetryMs = timestamp;
  }
  maybeAnnouncePosition(timestamp);
  if (state.ended) {
    endAttempt();
  } else {
    ensureAnimation();
  }
}

function ensureAnimation() {
  if (animationId !== null || state.ended || document.hidden) return;
  // Her yeniden başlatmada başlangıç zamanı sıfırlanır; gizli sekme süresi hesaba katılmaz.
  if (state.lastFrameMs === null) state.lastFrameMs = performance.now();
  animationId = window.requestAnimationFrame(tick);
}

function stopAnimation() {
  if (animationId !== null) window.cancelAnimationFrame(animationId);
  animationId = null;
  state.lastFrameMs = null;
}

function endAttempt() {
  stopAnimation();
  [elements.left, elements.level, elements.right].forEach((button) => { button.disabled = true; });
  elements.status.textContent = "Ball fell";
  elements.status.classList.add("ended");
  elements.outcomeTitle.textContent = `The ball fell off the ${state.fallSide} edge.`;
  elements.outcome.hidden = false;
  renderStage();
  renderMomentum();
  announce(`The ball fell off the ${state.fallSide} edge. Press Reset attempt to try again.`);
}

// 5. OUTPUT — Görsel hareket ile erişilebilir açıklamalar iki modda tutarlı kalır.
function applyDesign() {
  const variables = {
    "--accent": DESIGN.colors.accent,
    "--accent-soft": DESIGN.colors.accentSoft,
    "--ink": DESIGN.colors.ink,
    "--muted": DESIGN.colors.muted,
    "--background": DESIGN.colors.background,
    "--surface": DESIGN.colors.surface,
    "--platform-color": DESIGN.colors.platform,
    "--ball-color": DESIGN.colors.ball,
    "--ball-highlight": DESIGN.colors.ballHighlight,
    "--stage-height": `${DESIGN.sizes.stageHeightPx}px`
  };
  for (const [name, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(name, value);
  }
}

function describeTilt() {
  if (state.tilt === 0) return "Level · 0°";
  return `${state.tilt > 0 ? "Right" : "Left"} · ${Math.abs(state.tilt)}°`;
}

function getPositionZone() {
  const ratio = state.x / travelLimit();
  if (ratio <= -DESIGN.thresholds.edgeRatio) return "left-edge";
  if (ratio >= DESIGN.thresholds.edgeRatio) return "right-edge";
  if (ratio < -DESIGN.thresholds.centerRatio) return "left";
  if (ratio > DESIGN.thresholds.centerRatio) return "right";
  return "center";
}

function positionDescription(zone) {
  return {
    "left-edge": "Near left edge",
    "left": "Left side",
    "center": "Near center",
    "right": "Right side",
    "right-edge": "Near right edge"
  }[zone];
}

function renderPosition() {
  elements.positionText.textContent = positionDescription(getPositionZone());
}

function renderTilt() {
  elements.tiltText.textContent = describeTilt();
}

function renderMomentum() {
  // Gizli modda yalnız CSS değil, ekran okuyucudan da ek hız bilgisi kaldırılır.
  const full = state.mode === "full";
  elements.momentumReadout.hidden = !full;
  if (!full) {
    elements.momentumText.textContent = "";
    return;
  }
  const speed = Math.abs(state.velocity);
  const stopped = speed < DESIGN.thresholds.stoppedSpeedPxPerSec;
  const direction = stopped ? "Still" : state.velocity > 0 ? "Right" : "Left";
  elements.momentumText.textContent = stopped ? "Still · 0 units/s" : `${direction} · ${speed.toFixed(1)} units/s`;
  elements.momentumArrow.textContent = stopped ? "•" : state.velocity > 0 ? "→" : "←";
}

function renderStage() {
  const s = DESIGN.sizes;
  const availableWidth = Math.max(180, elements.stage.clientWidth - 2 * s.stageSidePaddingPx);
  const scale = Math.min(1, availableWidth / s.platformLengthPx);
  const radians = state.tilt * Math.PI / 180;
  const normalDistance = s.ballDiameterPx / 2 + s.platformThicknessPx / 2 + s.ballGapPx;
  const along = state.x;
  const x = (along * Math.cos(radians) + normalDistance * Math.sin(radians)) * scale;
  const y = (along * Math.sin(radians) - normalDistance * Math.cos(radians)
    + (state.ended ? s.fallDropPx : 0)) * scale;
  const style = elements.stage.style;
  style.setProperty("--platform-width", `${s.platformLengthPx * scale}px`);
  style.setProperty("--platform-thickness", `${s.platformThicknessPx * scale}px`);
  style.setProperty("--ball-size", `${s.ballDiameterPx * scale}px`);
  style.setProperty("--tilt", `${state.tilt}deg`);
  style.setProperty("--ball-x", `${x}px`);
  style.setProperty("--ball-y", `${y}px`);
}

function renderAll(forceTelemetry = false) {
  renderStage();
  renderPosition();
  renderTilt();
  if (forceTelemetry) renderMomentum();
}

function announce(message) {
  elements.liveMessage.textContent = message;
}

function maybeAnnouncePosition(timestamp) {
  const zone = getPositionZone();
  if (zone === state.lastAnnouncedZone) return;
  if (timestamp - state.lastAnnouncementMs < DESIGN.timings.announcementCooldownMs) return;
  state.lastAnnouncedZone = zone;
  state.lastAnnouncementMs = timestamp;
  if (state.ended) return;
  // Limited modda yön ve hız açıkça söylenmez; yalnız iki modun ortak konumu duyurulur.
  const direction = state.mode === "full"
    ? (Math.abs(state.velocity) < DESIGN.thresholds.stoppedSpeedPxPerSec
      ? " The ball is nearly still."
      : ` The ball is moving ${state.velocity > 0 ? "right" : "left"}.`)
    : "";
  announce(`Ball position: ${positionDescription(zone)}.${direction}`);
}

// 6. BAŞLANGIÇ — Dinleyiciler, sabit başlangıç ve sekme görünürlüğü.
function setup() {
  applyDesign();
  elements.left.addEventListener("click", () => applyTilt(-1, elements.left, "Tilt Left"));
  elements.right.addEventListener("click", () => applyTilt(1, elements.right, "Tilt Right"));
  elements.level.addEventListener("click", levelPlatform);
  elements.reset.addEventListener("click", () => resetAttempt());
  document.querySelectorAll('input[name="feedback-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) changeFeedbackMode(radio.value);
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAnimation();
    } else if (!state.ended) {
      announce("Attempt resumed after the tab was hidden.");
      ensureAnimation();
    }
  });
  window.addEventListener("resize", renderStage);
  resetAttempt("Attempt started. The ball is near center.");
}

setup();
