"use strict";

/* ============================================================
   DESIGN — AYARLAR
   Tüm deneyim kararları bu nesnede toplanmıştır.
   Sadece buradaki değerleri değiştirerek renk, boyut, süre,
   eşik ve temel kuralları düzenleyebilirsiniz.
   ============================================================ */
const DESIGN = {
  colors: {
    page: "#f8fafb",       // Sayfanın arka planı
    paper: "#ffffff",      // Panel ve kontrol yüzeyleri
    ink: "#203243",        // Ana metin
    muted: "#657585",      // İkincil metin
    soft: "#edf2f5",       // Hafif arka planlar
    line: "#dce5ea",       // Ayırıcı çizgiler
    ice: "#a3e0f1",        // Buzun orta tonu
    iceLight: "#e5faff",   // Buzun aydınlık yüzeyi
    iceDeep: "#4d9cbb",    // Buzun kenarı
    accent: "#366d8a",     // Seçili kontroller ve geçmiş izleri
    accentDark: "#254c62",// Ana düğmeler
    shadow: "rgba(43, 80, 104, .08)" // Panel gölgeleri
  },
  sizes: {
    stageMinHeightPx: 420,  // Masaüstü galeri alanının yüksekliği
    iceSizePx: 90,          // Yeni oluşturulan parçaların başlangıç boyu
    cardRadiusPx: 15,       // Kartların köşe yuvarlaklığı
    controlMinHeightPx: 54  // Düğmelerin en düşük yüksekliği
  },
  timings: {
    meltDurationMs: 15000, // Bir parça 15 saniyede tamamen erir
    displayRefreshMs: 250  // Yazılı göstergeler saniyede en fazla 4 kez yenilenir
  },
  thresholds: {
    freshUntil: 0.20,      // Ömrün ilk %20'si: "Fresh"
    nearlyGoneFrom: 0.80  // Ömrün son %20'si: "Nearly melted"
  },
  rules: {
    slotCount: 5,                 // Beş konum (konum yerleşimleri de beşli tanımlıdır)
    requireEmptyPosition: true, // Önceki buz erimeden aynı konuma yenisi eklenmez
    retainLastTrace: true,      // Erime sonrası konum başına en fazla bir iz tutulur
    allowAddWhilePaused: false, // Pause sırasında parça eklenemez
    autoPauseWhenHidden: true,  // Gizli sekmeye geçince zaman donar
    clearEverythingOnReset: true, // Reset geçmiş izleri de siler
    resetOnModeSwitch: true     // Mod değişince karşılaştırma sıfırdan başlar
  }
};

/* ============================================================
   STATE — DURUM
   Hem aktif buzlar hem de geçmiş izler aynı sistemde saklanır.
   Gizli geçmiş modunda bilgi silinmez; sadece gösterilmez.
   ============================================================ */
const $ = (selector) => document.querySelector(selector);
const artContainer = $("#art-positions");
const controlsContainer = $("#slot-buttons");
const statusContainer = $("#slot-statuses");
const pauseButton = $("#pause-button");
const pauseLabel = $("#pause-label");
const resetButton = $("#reset-button");
const activityMessage = $("#activity-message");
const srAnnouncement = $("#screen-reader-announcement");
const clockOutput = $("#experience-clock");
const runState = $("#run-state");
const memoryLegend = $("#memory-legend");
const introDuration = $("#intro-duration");

const slotViews = [];
let frameHandle = null;
let lastTextUpdateMs = -Infinity;
let state = initialState("visible");

function initialState(mode) {
  return {
    mode,
    running: !document.hidden,
    pausedByHiddenTab: document.hidden,
    elapsedMs: 0,
    lastFrameAt: null,
    pieces: Array(DESIGN.rules.slotCount).fill(null),
    traces: Array(DESIGN.rules.slotCount).fill(null)
  };
}

/* ============================================================
   INPUT — KULLANICI GİRDİLERİ
   Tüm girişler doğal HTML button/radio kontrolleri üzerinden
   gelir. Tek bir tamamlanmış "click" aktivasyonu (fare, dokunma
   veya klavye) bir parça ekler. Sürükleme veya geri alma yoktur.
   ============================================================ */
function addPiece(slotIndex) {
  if ((!state.running && !DESIGN.rules.allowAddWhilePaused) || document.hidden) return;
  // Parçanın başlangıç anını en son çizim karesine değil gerçek giriş anına bağlarız.
  if (state.running) advanceClock(performance.now());
  if (state.pieces[slotIndex] && DESIGN.rules.requireEmptyPosition) return;

  // Burada her parçanın başlangıç zamanı deneyimin kendi saatidir.
  state.pieces[slotIndex] = { createdAtMs: state.elapsedMs };
  const message = `Ice placed at position ${slotIndex + 1}.`;
  say(message);
  showAction(message);
  render();
}

function togglePause() {
  if (state.running) {
    // Duraklatma anındaki milisaniye farkını kaybetmeyelim.
    advanceClock(performance.now());
    stopClock(false);
    say("Paused. Melting and placement have stopped.");
    showAction("Time paused. Select Resume to continue.");
  } else {
    if (document.hidden) return;
    state.running = true;
    state.pausedByHiddenTab = false;
    state.lastFrameAt = performance.now();
    say("Resumed. Ice is melting again.");
    showAction("Time resumed.");
    beginLoop();
  }
  render();
}

function resetExperience(message = "Everything cleared. A new attempt has begun.") {
  // Aynı mod korunur. Yeni deneme sıfır zamanla ve boş sahneyle başlar.
  const keepMode = state.mode;
  const retainedTraces = state.traces.slice();
  stopClock(false);
  state = initialState(keepMode);
  if (!DESIGN.rules.clearEverythingOnReset) state.traces = retainedTraces;
  lastTextUpdateMs = -Infinity;
  say(message);
  showAction(message);
  render();
  beginLoop();
}

function switchMode(newMode) {
  if (newMode === state.mode) return;
  const label = newMode === "visible" ? "Visible Past" : "Hidden Past";
  if (DESIGN.rules.resetOnModeSwitch) {
    stopClock(false);
    state = initialState(newMode);
    lastTextUpdateMs = -Infinity;
    const message = `${label} selected. A new, empty attempt has begun.`;
    say(message);
    showAction(message);
    render();
    beginLoop();
  } else {
    state.mode = newMode;
    const message = `${label} selected. The current attempt continues.`;
    say(message);
    showAction(message);
    render();
  }
}

function onVisibilityChange() {
  if (!DESIGN.rules.autoPauseWhenHidden) {
    // Bu seçenek değiştirilirse gizliyken geçen gerçek süre dönüşte eklenir.
    if (!document.hidden && state.running) {
      advanceClock(performance.now());
      render();
      beginNextFrame();
    }
    return;
  }
  if (!document.hidden || !state.running) return;
  // Görünmezlik anına kadar geçen küçük süreyi de hesaba katarız.
  advanceClock(performance.now());
  stopClock(true);
  showAction("The tab was hidden. Time is paused; select Resume to continue.");
  say("The tab was hidden. Time is now paused.");
  render();
}

/* ============================================================
   RULE — ZAMAN VE HAFIZA KURALLARI
   Animasyon karesi sayısı değil, gerçek geçen milisaniye kullanılır.
   Her aktif parça 15 saniye sonunda iz bırakıp kaybolur.
   Önceki iz, yeni bir parça yerleştirilince silinmez; o konumdaki
   yeni parça da eridiğinde yeni iz eski izin yerine geçer.
   ============================================================ */
function advanceClock(now) {
  if (!state.running) return;
  if (state.lastFrameAt === null) {
    state.lastFrameAt = now;
    return;
  }
  const deltaMs = Math.max(0, now - state.lastFrameAt);
  state.lastFrameAt = now;
  state.elapsedMs += deltaMs;
  evaluateMelting();
}

function evaluateMelting() {
  const meltedPositions = [];
  for (let i = 0; i < DESIGN.rules.slotCount; i += 1) {
    const piece = state.pieces[i];
    if (!piece) continue;

    if (state.elapsedMs - piece.createdAtMs >= DESIGN.timings.meltDurationMs) {
      state.pieces[i] = null;
      // Konum başına yalnızca en yeni iz: önceki nesnenin üzerine yazılır.
      state.traces[i] = DESIGN.rules.retainLastTrace
        ? { meltedAtMs: state.elapsedMs }
        : null;
      meltedPositions.push(i + 1);
    }
  }
  if (meltedPositions.length > 0) {
    const ids = meltedPositions.join(", ");
    const message = state.mode === "visible" && DESIGN.rules.retainLastTrace
      ? `Ice melted at position ${ids}. A trace remains. The position is ready again.`
      : `Ice melted at position ${ids}. The position is ready again.`;
    say(message);
    showAction(message);
  }
}

function pieceProgress(piece) {
  if (!piece) return 0;
  const age = state.elapsedMs - piece.createdAtMs;
  return Math.min(1, Math.max(0, age / DESIGN.timings.meltDurationMs));
}

function stopClock(hiddenTab) {
  if (frameHandle !== null) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
  state.running = false;
  state.lastFrameAt = null;
  state.pausedByHiddenTab = hiddenTab;
}

function beginLoop() {
  // Birden çok kez Resume çağrılması ikinci bir döngü oluşturamaz.
  if (!state.running || document.hidden || frameHandle !== null) return;
  state.lastFrameAt = performance.now();
  frameHandle = requestAnimationFrame(onFrame);
}

function onFrame(now) {
  // İşlemi başta boşalt: bu kare çalışırken yeni döngü istenirse
  // yalnızca tek bir yeni requestAnimationFrame planlanabilir.
  frameHandle = null;
  if (!state.running || document.hidden) return;
  advanceClock(now);
  renderArt();
  if (now - lastTextUpdateMs >= DESIGN.timings.displayRefreshMs) {
    renderText();
    lastTextUpdateMs = now;
  }
  beginNextFrame();
}

function beginNextFrame() {
  if (state.running && !document.hidden && frameHandle === null) {
    frameHandle = requestAnimationFrame(onFrame);
  }
}

/* ============================================================
   OUTPUT — ÇİZİM VE ERİŞİLEBİLİR GERİ BİLDİRİM
   Her karede yalnızca görsel buz ölçeği değişir; metin daha
   seyrek güncellenir. aria-live yalnızca anlamlı olaylarda kullanılır.
   Hidden Past modunda izler hem görsel hem erişilebilir metinden
   saklanır; ancak beş konumun kullanılabilirliği ortak bilgidir.
   ============================================================ */
function installStyles() {
  const cssNames = {
    page: "page", paper: "paper", ink: "ink", muted: "muted",
    soft: "soft", line: "line", ice: "ice", iceLight: "ice-light",
    iceDeep: "ice-deep", accent: "accent", accentDark: "accent-dark",
    shadow: "shadow"
  };
  for (const [name, value] of Object.entries(DESIGN.colors)) {
    document.documentElement.style.setProperty(`--${cssNames[name]}`, value);
  }
  const sizes = {
    "--stage-min-height": DESIGN.sizes.stageMinHeightPx,
    "--ice-size": DESIGN.sizes.iceSizePx,
    "--card-radius": DESIGN.sizes.cardRadiusPx,
    "--control-min-height": DESIGN.sizes.controlMinHeightPx
  };
  for (const [cssVar, px] of Object.entries(sizes)) {
    document.documentElement.style.setProperty(cssVar, `${px}px`);
  }
  introDuration.textContent = `${DESIGN.timings.meltDurationMs / 1000} SECONDS`;
}

function buildSlots() {
  // Konumlar sabittir. Buradaki yüzdeler sadece görsel yerleşimdir.
  const placements = [
    { left: 15, bottom: 26 },
    { left: 32, bottom: 36 },
    { left: 50, bottom: 47 },
    { left: 68, bottom: 36 },
    { left: 85, bottom: 26 }
  ];
  for (let i = 0; i < DESIGN.rules.slotCount; i += 1) {
    const spot = placements[i];
    const art = document.createElement("div");
    art.className = "art-position";
    art.dataset.position = String(i + 1).padStart(2, "0");
    art.style.setProperty("--art-left", `${spot.left}%`);
    art.style.setProperty("--art-bottom", `${spot.bottom}%`);

    const trace = document.createElement("div");
    trace.className = "trace-shape";
    trace.hidden = true;
    const ice = document.createElement("div");
    ice.className = "ice-shape";
    ice.hidden = true;
    art.append(trace, ice);
    artContainer.append(art);

    const button = document.createElement("button");
    button.className = "slot-button";
    button.type = "button";
    button.innerHTML = `<span class="slot-button-icon" aria-hidden="true">+</span><span class="slot-button-number">${String(i + 1).padStart(2, "0")}</span>`;
    button.addEventListener("click", () => addPiece(i));
    controlsContainer.append(button);

    const item = document.createElement("li");
    item.className = "slot-status";
    const top = document.createElement("div");
    top.className = "slot-status-top";
    const number = document.createElement("span");
    number.className = "slot-status-number";
    number.textContent = String(i + 1).padStart(2, "0");
    const mark = document.createElement("span");
    mark.className = "slot-status-mark";
    mark.setAttribute("aria-hidden", "true");
    top.append(number, mark);
    const title = document.createElement("div");
    title.className = "slot-status-name";
    const detail = document.createElement("p");
    detail.className = "slot-status-detail";
    item.append(top, title, detail);
    statusContainer.append(item);

    slotViews.push({ ice, trace, button, title, detail, mark });
  }
}

function renderArt() {
  for (let i = 0; i < DESIGN.rules.slotCount; i += 1) {
    const piece = state.pieces[i];
    const view = slotViews[i];
    const showTrace = state.mode === "visible" && Boolean(state.traces[i]);
    view.trace.hidden = !showTrace;
    view.ice.hidden = !piece;
    if (!piece) continue;
    const remaining = 1 - pieceProgress(piece);
    view.ice.style.transform = `scale(${remaining.toFixed(5)})`;
    view.ice.style.opacity = String(0.25 + 0.75 * remaining);
  }
}

function formatTime(ms) {
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
}

function pieceAgeDescription(piece) {
  const progress = pieceProgress(piece);
  if (progress < DESIGN.thresholds.freshUntil) return "Fresh ice";
  if (progress >= DESIGN.thresholds.nearlyGoneFrom) return "Nearly melted";
  return "Melting";
}

function renderText() {
  clockOutput.textContent = formatTime(state.elapsedMs);
  document.body.dataset.running = String(state.running);
  runState.innerHTML = state.running
    ? `<span class="state-symbol" aria-hidden="true">▶</span> Running`
    : `<span class="state-symbol" aria-hidden="true">Ⅱ</span> Paused`;
  pauseLabel.textContent = state.running ? "Pause" : "Resume";
  pauseButton.querySelector(".button-icon").textContent = state.running ? "Ⅱ" : "▶";
  memoryLegend.textContent = state.mode === "visible" ? "Past traces shown" : "Past traces hidden";

  for (let i = 0; i < DESIGN.rules.slotCount; i += 1) {
    const piece = state.pieces[i];
    const view = slotViews[i];
    const traceVisible = state.mode === "visible" && state.traces[i] !== null;
    const position = i + 1;

    view.button.disabled = (!state.running && !DESIGN.rules.allowAddWhilePaused)
      || (Boolean(piece) && DESIGN.rules.requireEmptyPosition);
    if (!state.running && !DESIGN.rules.allowAddWhilePaused) {
      view.button.setAttribute("aria-label", `Position ${position}: placement unavailable while paused`);
    } else if (piece && DESIGN.rules.requireEmptyPosition) {
      view.button.setAttribute("aria-label", `Position ${position}: occupied, wait until the ice has melted`);
    } else {
      view.button.setAttribute("aria-label", `Place ice at position ${position}`);
    }

    if (piece) {
      const remainingSeconds = Math.max(0, Math.ceil((DESIGN.timings.meltDurationMs * (1 - pieceProgress(piece))) / 1000));
      view.title.textContent = pieceAgeDescription(piece);
      view.detail.textContent = `${remainingSeconds}s until melted`;
      view.mark.textContent = "◒";
    } else if (traceVisible) {
      view.title.textContent = "Trace remains";
      view.detail.textContent = "Position ready";
      view.mark.textContent = "◌";
    } else {
      // Hidden Past modunda geçmiş izi var/yok bilgisi verilmez.
      view.title.textContent = "Empty";
      view.detail.textContent = state.running ? "Ready for ice" : "Waiting to resume";
      view.mark.textContent = "+";
    }
  }
}

function render() {
  renderArt();
  renderText();
}

function say(message) {
  srAnnouncement.textContent = message;
}
function showAction(message) {
  activityMessage.textContent = message;
}

function setup() {
  installStyles();
  buildSlots();
  pauseButton.addEventListener("click", togglePause);
  resetButton.addEventListener("click", () => resetExperience());
  for (const input of document.querySelectorAll('input[name="memory-mode"]')) {
    input.addEventListener("change", () => {
      if (input.checked) switchMode(input.value);
    });
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  render();
  beginLoop();
}

setup();
