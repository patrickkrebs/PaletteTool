// Object names are derived per image by an in-browser object detector
// (see object-detection.js section below), not from any hard-coded table.

const els = {
  imageInput: document.querySelector("#imageInput"),
  previewCanvas: document.querySelector("#previewCanvas"),
  previewWrap: document.querySelector(".preview-wrap"),
  overlayLayer: document.querySelector("#overlayLayer"),
  emptyPreview: document.querySelector("#emptyPreview"),
  paletteName: document.querySelector("#paletteName"),
  ignoreTransparency: document.querySelector("#ignoreTransparency"),
  sortByCoverage: document.querySelector("#sortByCoverage"),
  showCallouts: document.querySelector("#showCallouts"),
  pickMode: document.querySelector("#pickMode"),
  showCmyk: document.querySelector("#showCmyk"),
  showLab: document.querySelector("#showLab"),
  clearSwatchesBtn: document.querySelector("#clearSwatchesBtn"),
  colorDetail: document.querySelector("#colorDetail"),
  colorDetailValue: document.querySelector("#colorDetailValue"),
  maxColors: document.querySelector("#maxColors"),
  aiToggle: document.querySelector("#aiToggle"),
  aiFields: document.querySelector("#aiFields"),
  aiProvider: document.querySelector("#aiProvider"),
  aiKeyLabel: document.querySelector("#aiKeyLabel"),
  aiKey: document.querySelector("#aiKey"),
  aiModel: document.querySelector("#aiModel"),
  aiNote: document.querySelector("#aiNote"),
  aiLabelBtn: document.querySelector("#aiLabelBtn"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  addSwatchBtn: document.querySelector("#addSwatchBtn"),
  downloadTxtBtn: document.querySelector("#downloadTxtBtn"),
  downloadPltBtn: document.querySelector("#downloadPltBtn"),
  downloadAcoBtn: document.querySelector("#downloadAcoBtn"),
  downloadAseBtn: document.querySelector("#downloadAseBtn"),
  saveProjectBtn: document.querySelector("#saveProjectBtn"),
  loadProjectBtn: document.querySelector("#loadProjectBtn"),
  projectInput: document.querySelector("#projectInput"),
  statusLine: document.querySelector("#statusLine"),
  exportStatusLine: document.querySelector("#exportStatusLine"),
  exportPreview: document.querySelector("#exportPreview"),
  previewTxtBtn: document.querySelector("#previewTxtBtn"),
  previewPltBtn: document.querySelector("#previewPltBtn"),
  previewAcoBtn: document.querySelector("#previewAcoBtn"),
  previewAseBtn: document.querySelector("#previewAseBtn"),
  swatchTable: document.querySelector("#swatchTable"),
  rowTemplate: document.querySelector("#swatchRowTemplate"),
  aiProgress: document.querySelector("#aiProgress"),
  aiProgressLabel: document.querySelector("#aiProgressLabel"),
  logPanel: document.querySelector("#logPanel"),
  logHead: document.querySelector("#logHead"),
  logOutput: document.querySelector("#logOutput"),
  logClearBtn: document.querySelector("#logClearBtn")
};

const state = {
  image: null,
  imageFileName: "",
  swatches: [],
  exportPreviewMode: "txt",
  generatedAt: null,
  lastPixels: null,
  lastEdge: null,
  analyzeToken: 0,
  previewRect: null,
  view: null,
  sampleCanvas: null,
  showCallouts: true,
  pickMode: false,
  showCmyk: false,
  showLab: false,
  aiEnabled: false,
  aiProvider: "anthropic",
  aiKeys: { anthropic: "", openai: "" },
  aiModels: { anthropic: "", openai: "" }
};

const ANTHROPIC_VERSION = "2023-06-01";
const AI_PROVIDERS = {
  anthropic: {
    keyLabel: "Anthropic API key",
    keyPlaceholder: "sk-ant-…",
    defaultModel: "claude-sonnet-4-6",
    models: [
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fast, low cost)" }
    ],
    url: "https://api.anthropic.com/v1/messages",
    note: "Labels the extracted colors by reading markers placed on the image. Sends the image to Anthropic using your key, stored only in this browser."
  },
  openai: {
    keyLabel: "OpenAI API key",
    keyPlaceholder: "sk-…",
    defaultModel: "gpt-4o",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini (fast, low cost)" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" }
    ],
    url: "https://api.openai.com/v1/chat/completions",
    note: "Labels the extracted colors by reading markers placed on the image. Sends the image to OpenAI using your key, stored only in this browser."
  }
};

function aiProvider() {
  return AI_PROVIDERS[state.aiProvider] || AI_PROVIDERS.anthropic;
}

window.__paletteBuilderErrors = [];
window.addEventListener("error", (event) => {
  window.__paletteBuilderErrors.push(event.message);
  logLine(`Error: ${event.message}`, "error");
});
window.addEventListener("unhandledrejection", (event) => {
  logLine(`Unhandled: ${event.reason?.message || event.reason}`, "error");
});

// ---------------------------------------------------------------------------
// Activity log — a bottom console that shows what the app is doing, so failures
// (e.g. "no image loaded") are visible instead of silent.
// ---------------------------------------------------------------------------

const LOG_MAX_LINES = 400;

function logLine(message, level = "info") {
  if (typeof console !== "undefined" && console.log) console.log(`[PaletteBuilder] ${message}`);
  if (!els.logOutput) return;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  const line = document.createElement("div");
  line.className = `log-line${level && level !== "info" ? ` is-${level}` : ""}`;
  const stamp = document.createElement("span");
  stamp.className = "log-time";
  stamp.textContent = time;
  line.appendChild(stamp);
  line.appendChild(document.createTextNode(message));
  els.logOutput.appendChild(line);
  while (els.logOutput.childElementCount > LOG_MAX_LINES) {
    els.logOutput.removeChild(els.logOutput.firstChild);
  }
  els.logOutput.scrollTop = els.logOutput.scrollHeight;
}

if (els.logHead) {
  els.logHead.addEventListener("click", (event) => {
    if (event.target === els.logClearBtn) return;
    els.logPanel.classList.toggle("is-collapsed");
  });
}
if (els.logClearBtn) {
  els.logClearBtn.addEventListener("click", () => {
    els.logOutput.innerHTML = "";
    logLine("Log cleared.");
  });
}

function showAiProgress(label) {
  if (!els.aiProgress) return;
  els.aiProgress.hidden = false;
  if (els.aiProgressLabel) els.aiProgressLabel.textContent = label;
}

function setAiProgress(label) {
  if (els.aiProgressLabel) els.aiProgressLabel.textContent = label;
}

function hideAiProgress() {
  if (els.aiProgress) els.aiProgress.hidden = true;
}

logLine("PaletteBuilder ready. Load an image to begin.");

els.imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadImageFile(file);
});

// Click the empty-preview prompt to browse for a file.
els.emptyPreview.addEventListener("click", () => els.imageInput.click());

// Drag an image straight onto the preview area (works empty or to replace).
["dragenter", "dragover"].forEach((eventName) => {
  els.previewWrap.addEventListener(eventName, (event) => {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
    event.preventDefault();
    els.previewWrap.classList.add("is-dragging");
  });
});

["dragleave", "dragend", "drop"].forEach((eventName) => {
  els.previewWrap.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.previewWrap.classList.remove("is-dragging");
  });
});

els.previewWrap.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file && file.type.startsWith("image/")) loadImageFile(file);
  else if (file) logLine(`Ignored dropped file "${file.name}" — not an image.`, "warn");
});

els.analyzeBtn.addEventListener("click", analyzeCurrentImage);
els.addSwatchBtn.addEventListener("click", addManualSwatch);
els.downloadTxtBtn.addEventListener("click", downloadTxt);
els.downloadPltBtn.addEventListener("click", downloadPlt);
els.downloadAcoBtn.addEventListener("click", downloadAco);
els.downloadAseBtn.addEventListener("click", downloadAse);
els.previewTxtBtn.addEventListener("click", () => setExportPreviewMode("txt"));
els.previewPltBtn.addEventListener("click", () => setExportPreviewMode("plt"));
els.previewAcoBtn.addEventListener("click", () => setExportPreviewMode("aco"));
els.previewAseBtn.addEventListener("click", () => setExportPreviewMode("ase"));
els.saveProjectBtn.addEventListener("click", downloadProject);
els.loadProjectBtn.addEventListener("click", () => els.projectInput.click());
els.projectInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadProjectFile(file);
  event.target.value = ""; // allow re-loading the same file
});

if (els.showCallouts) {
  els.showCallouts.addEventListener("change", () => {
    state.showCallouts = els.showCallouts.checked;
    renderOverlay();
  });
}

if (els.pickMode) {
  els.pickMode.addEventListener("change", () => {
    state.pickMode = els.pickMode.checked;
    // Picked colors drop a callout, so make sure callouts are visible.
    if (state.pickMode && !state.showCallouts) {
      state.showCallouts = true;
      if (els.showCallouts) els.showCallouts.checked = true;
    }
    if (els.previewWrap) els.previewWrap.classList.toggle("is-picking", state.pickMode);
    renderOverlay();
    if (state.pickMode) {
      els.statusLine.textContent = state.image
        ? "Pick mode: click the image to add colors."
        : "Load an image, then click it to add colors.";
    }
  });
}

if (els.clearSwatchesBtn) {
  els.clearSwatchesBtn.addEventListener("click", clearSwatches);
}

if (els.showCmyk) {
  els.showCmyk.addEventListener("change", () => {
    state.showCmyk = els.showCmyk.checked;
    renderSwatches();
  });
}
if (els.showLab) {
  els.showLab.addEventListener("change", () => {
    state.showLab = els.showLab.checked;
    renderSwatches();
  });
}

// Pan with the middle mouse button, or Shift + left drag. A capture-phase
// listener on the preview wrapper preempts the pick / dot / grip handlers for
// these gestures.
function canvasDisplayScale() {
  const canvas = els.previewCanvas;
  return Math.min(canvas.clientWidth / canvas.width, canvas.clientHeight / canvas.height) || 1;
}

els.previewWrap.addEventListener(
  "pointerdown",
  (event) => {
    const isPan = event.button === 1 || (event.button === 0 && event.shiftKey);
    if (!isPan || !state.image || !state.view) return;
    event.preventDefault();
    event.stopPropagation(); // beat the pick / dot-drag / grip handlers

    const startX = event.clientX;
    const startY = event.clientY;
    const startOffsetX = state.view.offsetX;
    const startOffsetY = state.view.offsetY;
    const displayScale = canvasDisplayScale();
    const drawW = state.previewRect.width;
    const drawH = state.previewRect.height;
    const canvas = els.previewCanvas;
    els.previewWrap.classList.add("is-panning");
    els.previewWrap.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / displayScale;
      const dy = (moveEvent.clientY - startY) / displayScale;
      // Keep at least 60px of the image on the canvas so it can't be lost.
      state.view.offsetX = Math.min(canvas.width - 60, Math.max(60 - drawW, startOffsetX + dx));
      state.view.offsetY = Math.min(canvas.height - 60, Math.max(60 - drawH, startOffsetY + dy));
      redrawPreview();
    };
    const onUp = () => {
      els.previewWrap.releasePointerCapture(event.pointerId);
      els.previewWrap.classList.remove("is-panning");
      els.previewWrap.removeEventListener("pointermove", onMove);
      els.previewWrap.removeEventListener("pointerup", onUp);
    };
    els.previewWrap.addEventListener("pointermove", onMove);
    els.previewWrap.addEventListener("pointerup", onUp);
  },
  true
);

// In pick mode, press on the image to open a magnifier loupe (same zoom as the
// dot drag), aim while holding, and release to drop a labelled swatch there.
els.previewCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.shiftKey) return; // left-only; Shift+left pans
  if (!state.pickMode || !state.image || !state.previewRect) return;
  event.preventDefault();
  const layerRect = els.overlayLayer.getBoundingClientRect();
  const loupe = createLoupe();
  els.overlayLayer.appendChild(loupe.el);
  els.previewCanvas.setPointerCapture(event.pointerId);

  let pending = null;
  const aim = (clientX, clientY) => {
    const mapped = displayToImage(clientX - layerRect.left, clientY - layerRect.top);
    if (!mapped) return;
    const color = sampleBitmapColor(mapped.bx, mapped.by);
    pending = { color: color || { r: 128, g: 128, b: 128 }, anchorX: mapped.anchorX, anchorY: mapped.anchorY };
    loupe.update(mapped, color, layerRect);
  };

  aim(event.clientX, event.clientY);
  const onMove = (moveEvent) => aim(moveEvent.clientX, moveEvent.clientY);
  const onUp = () => {
    els.previewCanvas.releasePointerCapture(event.pointerId);
    els.previewCanvas.removeEventListener("pointermove", onMove);
    els.previewCanvas.removeEventListener("pointerup", onUp);
    loupe.el.remove();
    if (pending) addPickedSwatch(pending.color, pending.anchorX, pending.anchorY);
  };
  els.previewCanvas.addEventListener("pointermove", onMove);
  els.previewCanvas.addEventListener("pointerup", onUp);
});

// Zoom with the mouse wheel (middle-button scroll), anchored under the cursor.
els.previewWrap.addEventListener(
  "wheel",
  (event) => {
    if (!state.image) return;
    event.preventDefault();
    const focal = clientToCanvas(event.clientX, event.clientY);
    zoomPreview(event.deltaY < 0 ? 1.12 : 1 / 1.12, focal.fx, focal.fy);
  },
  { passive: false }
);

// Zoom with Shift +/- (and reset with Shift+0), unless typing in a field.
window.addEventListener("keydown", (event) => {
  const tag = (event.target && event.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (!state.image) return;
  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    zoomPreview(1.18);
  } else if (event.key === "-" || event.key === "_") {
    event.preventDefault();
    zoomPreview(1 / 1.18);
  } else if (event.key === "0" && (event.shiftKey || event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    resetZoom();
  }
});

let reExtractTimer = null;
function scheduleReExtract() {
  if (!state.lastPixels) return;
  clearTimeout(reExtractTimer);
  reExtractTimer = setTimeout(reExtractColors, 220);
}

if (els.colorDetail) {
  els.colorDetail.addEventListener("input", () => {
    updateColorDetailLabel();
    scheduleReExtract();
  });
  updateColorDetailLabel();
}

if (els.maxColors) {
  els.maxColors.addEventListener("input", scheduleReExtract);
}

function updateColorDetailLabel() {
  if (!els.colorDetailValue) return;
  const detail = getColorDetail();
  els.colorDetailValue.textContent = detail < 0.34 ? "Fewer" : detail > 0.66 ? "More" : "Balanced";
}

initAiLabeling();

function persistAi(storageKey, value) {
  try {
    localStorage.setItem(storageKey, value);
  } catch (error) {
    /* localStorage may be unavailable — ignore */
  }
}

function initAiLabeling() {
  if (!els.aiToggle) return;

  // Restore persisted settings (best-effort; localStorage may be unavailable).
  try {
    state.aiEnabled = localStorage.getItem("pb_ai_enabled") === "1";
    state.aiProvider = localStorage.getItem("pb_ai_provider") === "openai" ? "openai" : "anthropic";
    state.aiKeys.anthropic = localStorage.getItem("pb_ai_key_anthropic") || "";
    state.aiKeys.openai = localStorage.getItem("pb_ai_key_openai") || "";
    state.aiModels.anthropic = localStorage.getItem("pb_ai_model_anthropic") || "";
    state.aiModels.openai = localStorage.getItem("pb_ai_model_openai") || "";
  } catch (error) {
    /* ignore */
  }

  els.aiToggle.checked = state.aiEnabled;
  els.aiProvider.value = state.aiProvider;
  els.aiFields.hidden = !state.aiEnabled;
  syncAiProviderUI();

  els.aiToggle.addEventListener("change", () => {
    state.aiEnabled = els.aiToggle.checked;
    els.aiFields.hidden = !state.aiEnabled;
    persistAi("pb_ai_enabled", state.aiEnabled ? "1" : "0");
    refreshAiLabelButton();
    // Turning AI on (with a key + image ready): re-extract the colors and label
    // them with the AI right away.
    if (state.aiEnabled && aiReady() && state.image) {
      if (state.swatches.length) labelViaMarkers(++state.analyzeToken);
      else analyzeCurrentImage();
    }
  });
  els.aiProvider.addEventListener("change", () => {
    state.aiProvider = els.aiProvider.value === "openai" ? "openai" : "anthropic";
    persistAi("pb_ai_provider", state.aiProvider);
    syncAiProviderUI();
  });
  els.aiKey.addEventListener("input", () => {
    state.aiKeys[state.aiProvider] = els.aiKey.value.trim();
    persistAi(`pb_ai_key_${state.aiProvider}`, state.aiKeys[state.aiProvider]);
    refreshAiLabelButton();
  });
  els.aiModel.addEventListener("change", () => {
    state.aiModels[state.aiProvider] = els.aiModel.value;
    persistAi(`pb_ai_model_${state.aiProvider}`, state.aiModels[state.aiProvider]);
  });
  els.aiLabelBtn.addEventListener("click", () => {
    logLine("“Label with AI” clicked.");
    if (!state.image) {
      logLine("Nothing to do: no image loaded. Drop an image (or open a project) first.", "warn");
      els.statusLine.textContent = "Load an image first.";
      return;
    }
    if (state.swatches.length) labelViaMarkers(++state.analyzeToken);
    else analyzeCurrentImage();
  });
}

// Reflect the selected provider in the key label/placeholder, model list, and
// note, and swap the key/model fields to that provider's stored values.
function syncAiProviderUI() {
  const provider = aiProvider();
  els.aiKeyLabel.textContent = provider.keyLabel;
  els.aiKey.placeholder = provider.keyPlaceholder;
  els.aiKey.value = state.aiKeys[state.aiProvider] || "";
  els.aiNote.textContent = provider.note;

  // Populate the model dropdown for this provider and select the stored model
  // (falling back to the provider default if the stored one isn't in the list).
  els.aiModel.innerHTML = "";
  for (const model of provider.models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.label;
    els.aiModel.appendChild(option);
  }
  const stored = state.aiModels[state.aiProvider];
  const selected = provider.models.some((model) => model.id === stored) ? stored : provider.defaultModel;
  els.aiModel.value = selected;
  state.aiModels[state.aiProvider] = selected;

  refreshAiLabelButton();
}

function aiReady() {
  return state.aiEnabled && Boolean((state.aiKeys[state.aiProvider] || "").trim());
}

function refreshAiLabelButton() {
  if (!els.aiLabelBtn) return;
  els.aiLabelBtn.disabled = !(aiReady() && state.swatches.length);
}

// (?demo bootstrap runs at the end of the file, after all module constants are
// initialized — see bottom.)

async function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    state.image = image;
    state.imageFileName = file.name;
    els.paletteName.value = sanitizeName(file.name.replace(/\.[^.]+$/, "")) || "Generated_Palette";
    drawPreview(image);
    els.emptyPreview.hidden = true;
    setReady(true);
    logLine(`Loaded "${file.name}" (${image.naturalWidth || image.width}×${image.naturalHeight || image.height}).`);
    analyzeCurrentImage();
  } catch (error) {
    logLine(`Failed to load image "${file.name}": ${error.message || error}`, "error");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

const PREVIEW_BG = "#2e2e2e"; // solid 18% (lightness) gray backdrop
const PREVIEW_MARGIN = 40; // buffer (canvas px) around the image at the fitted zoom

// The fitted view: image scaled to sit inside the canvas minus the margin, centered.
function fitView(image) {
  const canvas = els.previewCanvas;
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const baseScale = Math.min((canvas.width - 2 * PREVIEW_MARGIN) / iw, (canvas.height - 2 * PREVIEW_MARGIN) / ih);
  const drawW = iw * baseScale;
  const drawH = ih * baseScale;
  return {
    forImage: image,
    baseScale,
    scale: baseScale,
    offsetX: (canvas.width - drawW) / 2,
    offsetY: (canvas.height - drawH) / 2
  };
}

function drawPreview(image) {
  const canvas = els.previewCanvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!state.view || state.view.forImage !== image) state.view = fitView(image);
  const view = state.view;
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const width = iw * view.scale;
  const height = ih * view.scale;

  // Solid gray fills the whole canvas; the image sits within it with a buffer.
  ctx.fillStyle = PREVIEW_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, view.offsetX, view.offsetY, width, height);

  // Remember where the image content sits inside the canvas bitmap so callouts
  // map from image-normalized coordinates to screen pixels (zoom/margin aware).
  state.previewRect = { x: view.offsetX, y: view.offsetY, width, height };
  renderOverlay();
}

function redrawPreview() {
  if (state.image) drawPreview(state.image);
}

// Map a client (mouse) point to canvas-internal coordinates, accounting for the
// canvas being CSS-scaled with object-fit: contain.
function clientToCanvas(clientX, clientY) {
  const canvas = els.previewCanvas;
  const layerRect = els.overlayLayer.getBoundingClientRect();
  const scale = Math.min(canvas.clientWidth / canvas.width, canvas.clientHeight / canvas.height);
  const offsetX = canvas.offsetLeft + (canvas.clientWidth - canvas.width * scale) / 2;
  const offsetY = canvas.offsetTop + (canvas.clientHeight - canvas.height * scale) / 2;
  return { fx: (clientX - layerRect.left - offsetX) / scale, fy: (clientY - layerRect.top - offsetY) / scale };
}

// Zoom by `factor` keeping the canvas point (fx, fy) fixed under the cursor.
function zoomPreview(factor, fx, fy) {
  if (!state.image || !state.view) return;
  const canvas = els.previewCanvas;
  if (fx === undefined) fx = canvas.width / 2;
  if (fy === undefined) fy = canvas.height / 2;
  const view = state.view;
  const imageX = (fx - view.offsetX) / view.scale;
  const imageY = (fy - view.offsetY) / view.scale;
  const newScale = Math.min(view.baseScale * 8, Math.max(view.baseScale * 0.5, view.scale * factor));
  view.scale = newScale;
  view.offsetX = fx - imageX * newScale;
  view.offsetY = fy - imageY * newScale;
  redrawPreview();
}

function resetZoom() {
  if (state.image) {
    state.view = fitView(state.image);
    redrawPreview();
  }
}

function loadDemoImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 220;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff8dc";
  ctx.fillRect(0, 0, 320, 220);
  ctx.fillStyle = "#f4d013";
  ctx.beginPath();
  ctx.arc(160, 95, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a2e38";
  roundRect(ctx, 108, 148, 104, 48, 8);
  ctx.fill();
  ctx.strokeStyle = "#7583e7";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(100, 78);
  ctx.bezierCurveTo(128, 38, 188, 38, 220, 78);
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(140, 92, 8, 0, Math.PI * 2);
  ctx.arc(181, 92, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e75818";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(135, 126);
  ctx.bezierCurveTo(154, 142, 177, 142, 193, 126);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(118, 160, 84, 12);

  state.image = canvas;
  state.imageFileName = "palettebuilder-demo.png";
  els.paletteName.value = "palettebuilder-demo";
  drawPreview(canvas);
  els.emptyPreview.hidden = true;
  setReady(true);
  analyzeCurrentImage();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function setReady(isReady) {
  els.analyzeBtn.disabled = !isReady;
  els.addSwatchBtn.disabled = !isReady;
  els.downloadTxtBtn.disabled = !isReady || state.swatches.length === 0;
  els.downloadPltBtn.disabled = !isReady || state.swatches.length === 0;
  els.downloadAcoBtn.disabled = !isReady || state.swatches.length === 0;
  els.downloadAseBtn.disabled = !isReady || state.swatches.length === 0;
  els.saveProjectBtn.disabled = state.swatches.length === 0;
  els.clearSwatchesBtn.disabled = state.swatches.length === 0;
}

function analyzeCurrentImage() {
  if (!state.image) return;

  els.statusLine.textContent = "Analyzing image...";
  logLine("Analyzing image…");
  window.requestAnimationFrame(() => {
    const bundle = sampleImage(state.image, els.ignoreTransparency.checked);
    state.generatedAt = new Date();
    state.lastPixels = bundle;
    const analyzeToken = ++state.analyzeToken;

    // Local extraction finds the exact flat colors. A deterministic namer assigns
    // material/role + highlight/midtone/shadow tiers immediately; if an AI key is
    // set, the marker-based vision pass then refines the object names.
    buildSwatchesFromPixels(bundle);
    nameSwatchesHeuristically();

    renderSwatches();
    els.statusLine.textContent = `${state.swatches.length} colors captured from ${bundle.count.toLocaleString()} sampled pixels.`;
    logLine(`Captured ${state.swatches.length} colors from ${bundle.count.toLocaleString()} sampled pixels.`);
    setReady(true);
    refreshExportPreview();

    if (aiReady()) labelViaMarkers(analyzeToken);
  });
}

// Extract the palette into swatches (color label only; object/material names
// are filled in afterwards by nameSwatchesHeuristically or the AI). Reused by
// the Color-detail control to re-extract instantly without re-sampling.
function buildSwatchesFromPixels(bundle) {
  const palette = extractPalette(bundle.data, bundle.width, bundle.height, {
    detail: getColorDetail(),
    maxColors: getMaxColors(),
    skipTransparent: bundle.skipTransparent
  });
  const ordered = els.sortByCoverage.checked
    ? palette.slice().sort((a, b) => b.count - a.count)
    : palette;

  const usedNames = new Set();
  state.swatches = ordered.map((color, index) => {
    const colorName = makeReadableColorLabel(color.r, color.g, color.b);
    const baseName = sanitizeName(colorName || `Color_${index + 1}`);
    return {
      id: makeHarmonyId(),
      swatchName: uniqueSwatchName(baseName, index, usedNames),
      colorName,
      objectName: "",
      r: color.r,
      g: color.g,
      b: color.b,
      a: 255,
      coverage: 0,
      anchorX: color.cx,
      anchorY: color.cy
    };
  });

  // One labeling pass yields coverage, the densest-region callout anchor, AND
  // each color's edgeCoverage (cached for naming).
  state.lastEdge = computeSwatchSpatial(bundle, state.swatches);
}

// A single nearest-swatch pass over the typed buffer that sets each swatch's
// coverage and its densest-region callout anchor (a color repeated across
// several regions has its centroid in the empty space between them — the densest
// 36x24 cell instead lands the dot on a real instance), and returns each color's
// edgeCoverage (fraction of its pixels bordering a DIFFERENT color — high for
// line art). Replaces the former separate coverage/anchor and edge passes.
function computeSwatchSpatial(bundle, swatches) {
  if (!swatches.length || !bundle || !bundle.width) return swatches.map(() => 0);
  const { data, width, height, skipTransparent } = bundle;
  const GX = 36;
  const GY = 24;
  const npx = width * height;
  const labels = new Int32Array(npx).fill(-1);
  const grids = swatches.map(() => new Int32Array(GX * GY));
  const counts = new Array(swatches.length).fill(0);
  let total = 0;

  for (let p = 0; p < npx; p += 1) {
    const i = p * 4;
    if (skipTransparent && data[i + 3] < 24) continue;
    const swatchIndex = nearestSwatchIndex({ r: data[i], g: data[i + 1], b: data[i + 2] }, swatches);
    labels[p] = swatchIndex;
    if (swatchIndex < 0) continue;
    counts[swatchIndex] += 1;
    total += 1;
    const x = p % width;
    const y = (p / width) | 0;
    const cx = Math.min(GX - 1, Math.max(0, Math.floor((x / width) * GX)));
    const cy = Math.min(GY - 1, Math.max(0, Math.floor((y / height) * GY)));
    grids[swatchIndex][cy * GX + cx] += 1;
  }

  // edgeCoverage from the label map.
  const edgeCount = new Float64Array(swatches.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      const lab = labels[p];
      if (lab < 0) continue;
      let bordered = false;
      if (x > 0 && labels[p - 1] >= 0 && labels[p - 1] !== lab) bordered = true;
      else if (x < width - 1 && labels[p + 1] >= 0 && labels[p + 1] !== lab) bordered = true;
      else if (y > 0 && labels[p - width] >= 0 && labels[p - width] !== lab) bordered = true;
      else if (y < height - 1 && labels[p + width] >= 0 && labels[p + width] !== lab) bordered = true;
      if (bordered) edgeCount[lab] += 1;
    }

  swatches.forEach((swatch, index) => {
    swatch.coverage = total ? counts[index] / total : 0;
    const grid = grids[index];
    let bestCell = -1;
    let bestCount = 0;
    for (let cell = 0; cell < grid.length; cell += 1) {
      if (grid[cell] > bestCount) {
        bestCount = grid[cell];
        bestCell = cell;
      }
    }
    if (bestCell < 0) return; // keep centroid fallback
    const cx = bestCell % GX;
    const cy = Math.floor(bestCell / GX);
    swatch.anchorX = (cx + 0.5) / GX;
    swatch.anchorY = (cy + 0.5) / GY;
  });

  return swatches.map((s, i) => (counts[i] ? edgeCount[i] / counts[i] : 0));
}

// Re-assign every sampled pixel to its nearest swatch color and recompute each
// swatch's coverage. Called whenever the palette changes (a color is added,
// re-targeted by dragging its dot, recolored, or removed) so the percentages
// reflect the colors the user has identified.
function recomputeCoverage() {
  const bundle = state.lastPixels;
  if (!bundle || !bundle.width || !state.swatches.length) return;
  const { data, width, height, skipTransparent } = bundle;
  const counts = new Array(state.swatches.length).fill(0);
  let total = 0;
  const npx = width * height;
  for (let p = 0; p < npx; p += 1) {
    const i = p * 4;
    if (skipTransparent && data[i + 3] < 24) continue;
    const swatchIndex = nearestSwatchIndex({ r: data[i], g: data[i + 1], b: data[i + 2] }, state.swatches);
    if (swatchIndex >= 0) counts[swatchIndex] += 1;
    total += 1;
  }
  state.swatches.forEach((swatch, index) => {
    swatch.coverage = total ? counts[index] / total : 0;
  });
}

// Re-cluster with the current Color-detail setting and re-apply cached object
// names — no re-sampling, no model call. Used by the Color-detail slider.
function reExtractColors() {
  if (!state.lastPixels) return;
  buildSwatchesFromPixels(state.lastPixels);
  nameSwatchesHeuristically();
  renderSwatches();
  els.statusLine.textContent = `${state.swatches.length} colors captured from ${state.lastPixels.count.toLocaleString()} sampled pixels.`;
  refreshExportPreview();
}

function sampleImage(image, skipTransparent) {
  // Native-resolution sample (downscaled only if enormous, to bound memory), no
  // smoothing so colors stay exact. Returns a lightweight ImageData bundle, not a
  // 2.5M-object array — the extractor and coverage passes read the typed buffer.
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxSide = 2048;
  const maxPixels = 2500000;
  const ratio = Math.min(
    1,
    maxSide / Math.max(sourceWidth, sourceHeight),
    Math.sqrt(maxPixels / Math.max(1, sourceWidth * sourceHeight))
  );
  const width = Math.max(1, Math.round(sourceWidth * ratio));
  const height = Math.max(1, Math.round(sourceHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;

  let count = width * height;
  if (skipTransparent) {
    count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] >= 24) count += 1;
  }
  return { data, width, height, skipTransparent: Boolean(skipTransparent), count };
}

// ---------------------------------------------------------------------------
// Flat-cel-art palette extraction (validated against a Node ground-truth suite).
//
// 1. Exact-color histogram — the true painted bytes, never an average.
// 2. ±2 (±4 if noisy) NMS peak-snap: each mode is the local-argmax exact value
//    with its dither/JPEG cloud's count folded in, so the reported byte is the
//    real painted color even on noisy sources.
// 3. Per-pixel labels → count, centroid, and SOLIDITY (fraction of a color's
//    pixels whose 4-neighbors share its label). Flat fills are solid (~0.8+);
//    anti-aliased edge bands are thin (~0.5). Solidity is the primary real-vs-AA
//    signal and, unlike collinearity alone, never deletes a real midtone.
// 4. Perceptual merge (CIEDE2000 < dEmerge, keeps the MODE) folds re-encodings
//    while keeping distinct-but-close tiers (roof tile vs shadow) separate.
// 5. Collinear-blend rejection in raw sRGB bytes, gated by endpoint DOMINANCE
//    (a band's two parents each outnumber it >=4x) plus virtual BLACK/WHITE
//    endpoints (line-art & bloom) and the solidity gate.
// 6. A nearest-color coverage pass folds AA pixels into their parent fill.
// ---------------------------------------------------------------------------

const _labCache = new Map();
function srgbToLab(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  let v = _labCache.get(key);
  if (v) return v;
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rl = lin(r), gl = lin(g), bl = lin(b);
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  v = { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  _labCache.set(key, v);
  return v;
}

function deltaE2000(l1, l2) {
  const C1 = Math.hypot(l1.a, l1.b), C2 = Math.hypot(l2.a, l2.b);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1 = (1 + G) * l1.a, a2 = (1 + G) * l2.a;
  const Cp1 = Math.hypot(a1, l1.b), Cp2 = Math.hypot(a2, l2.b);
  const at1 = Math.atan2(l1.b, a1), at2 = Math.atan2(l2.b, a2);
  const h1 = at1 * 180 / Math.PI + (at1 < 0 ? 360 : 0);
  const h2 = at2 * 180 / Math.PI + (at2 < 0 ? 360 : 0);
  const dL = l2.L - l1.L;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh * Math.PI / 180) / 2);
  const Lb = (l1.L + l2.L) / 2, Cbp = (Cp1 + Cp2) / 2;
  let hb;
  if (Cp1 * Cp2 === 0) hb = h1 + h2;
  else { hb = h1 + h2; if (Math.abs(h1 - h2) > 180) hb += hb < 360 ? 360 : -360; hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * Math.PI / 180) + 0.24 * Math.cos((2 * hb) * Math.PI / 180)
    + 0.32 * Math.cos((3 * hb + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * hb - 63) * Math.PI / 180);
  const dTheta = 30 * Math.exp(-(((hb - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * Math.PI / 180) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

const deltaE76sq = (a, b) => (a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;

// Extract the flat palette from raw RGBA ImageData. Returns colors with exact
// {r,g,b}, coverage (0..1), solidity, and centroid {cx,cy} in image fractions.
function extractPalette(data, width, height, options = {}) {
  const detail = Math.max(0, Math.min(1, options.detail ?? 0.55));
  const maxColors = options.maxColors || null;
  const skipTransparent = options.skipTransparent !== false;
  const npx = width * height;

  const hist = new Map();
  let total = 0;
  for (let p = 0; p < npx; p += 1) {
    const i = p * 4;
    if (skipTransparent && data[i + 3] < 24) continue;
    const ek = ((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) >>> 0;
    hist.set(ek, (hist.get(ek) || 0) + 1);
    total += 1;
  }
  if (!total) return [];

  // A clean cel has few exact colors; many means JPEG/dither noise → widen the
  // NMS cube so each fill's cloud collapses to one solid mode.
  const noisy = hist.size > Math.max(1000, total * 0.01);
  const nmsR = noisy ? 4 : 2;

  const seedFloor = Math.max(1, Math.floor(total * 0.00008));
  const entries = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  const claimed = new Set();
  const peaks = [];
  for (const [ek, c] of entries) {
    if (c < seedFloor && peaks.length) break;
    if (claimed.has(ek)) continue;
    const r = (ek >> 16) & 255, g = (ek >> 8) & 255, b = ek & 255;
    let sum = 0;
    for (let dr = -nmsR; dr <= nmsR; dr += 1)
      for (let dg = -nmsR; dg <= nmsR; dg += 1)
        for (let db = -nmsR; db <= nmsR; db += 1) {
          const nr = r + dr, ng = g + dg, nb = b + db;
          if (nr < 0 || nr > 255 || ng < 0 || ng > 255 || nb < 0 || nb > 255) continue;
          const nk = ((nr << 16) | (ng << 8) | nb) >>> 0;
          const nc = hist.get(nk);
          if (nc && !claimed.has(nk)) { claimed.add(nk); sum += nc; }
        }
    peaks.push({ r, g, b, count: sum, idx: peaks.length });
    if (peaks.length >= 256) break; // bound the nearest-peak loop on noisy photos
  }

  const peakLab = peaks.map((p) => srgbToLab(p.r, p.g, p.b));
  const labelOf = new Map();
  for (const ek of hist.keys()) {
    const lab = srgbToLab((ek >> 16) & 255, (ek >> 8) & 255, ek & 255);
    let best = 0, bd = Infinity;
    for (let k = 0; k < peaks.length; k += 1) { const d = deltaE76sq(lab, peakLab[k]); if (d < bd) { bd = d; best = k; } }
    labelOf.set(ek, best);
  }
  const labels = new Int32Array(npx).fill(-1);
  const count = new Float64Array(peaks.length);
  const sumX = new Float64Array(peaks.length);
  const sumY = new Float64Array(peaks.length);
  for (let p = 0; p < npx; p += 1) {
    const i = p * 4;
    if (skipTransparent && data[i + 3] < 24) continue;
    const ek = ((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) >>> 0;
    const lab = labelOf.get(ek);
    labels[p] = lab;
    count[lab] += 1;
    sumX[lab] += p % width;
    sumY[lab] += (p / width) | 0;
  }
  const solidSum = new Float64Array(peaks.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      const lab = labels[p];
      if (lab < 0) continue;
      let same = 0;
      if (x > 0 && labels[p - 1] === lab) same += 1;
      if (x < width - 1 && labels[p + 1] === lab) same += 1;
      if (y > 0 && labels[p - width] === lab) same += 1;
      if (y < height - 1 && labels[p + width] === lab) same += 1;
      solidSum[lab] += same;
    }

  let list = peaks.map((s, k) => ({
    r: s.r, g: s.g, b: s.b, lab: peakLab[k],
    count: count[k],
    solidity: count[k] ? solidSum[k] / (4 * count[k]) : 0,
    cx: count[k] ? sumX[k] / count[k] / width : 0.5,
    cy: count[k] ? sumY[k] / count[k] / height : 0.5,
  }));

  const minCov = lerp(0.0045, 0.00025, detail);
  const minSolid = lerp(0.62, 0.5, detail);
  const bypassCov = 0.02;
  const dEmerge = lerp(4.0, 1.2, detail);
  // Thin black line art is genuinely low-solidity but is a wanted color, so
  // near-black ink bypasses the solidity gate (AA near black is caught below).
  const isInk = (c) => Math.max(c.r, c.g, c.b) <= 40;

  list = list
    .filter((c) => c.count / total >= minCov && (c.solidity >= minSolid || c.count / total >= bypassCov || isInk(c)))
    .sort((a, b) => b.count - a.count);

  const merged = [];
  for (const c of list) {
    const host = merged.find((h) => deltaE2000(h.lab, c.lab) < dEmerge);
    if (host) { host.count += c.count; continue; }
    merged.push({ ...c });
  }

  const DOM = 4;
  const BLACK = { r: 0, g: 0, b: 0, count: Infinity };
  const WHITE = { r: 255, g: 255, b: 255, count: Infinity };
  merged.sort((a, b) => b.count - a.count);
  const survivors = [];
  for (const c of merged) {
    const endpoints = survivors.concat([BLACK, WHITE]);
    if (c.solidity < 0.72 && c.count / total < 0.01 && isAntiAliasBlend(c, endpoints, DOM)) continue;
    survivors.push(c);
  }

  survivors.sort((a, b) => b.count - a.count);
  const capped = maxColors ? survivors.slice(0, maxColors) : survivors;
  return capped.map((c) => ({ r: c.r, g: c.g, b: c.b, solidity: c.solidity, cx: c.cx, cy: c.cy, count: c.count }));
}

// X is an anti-alias band iff some ordered pair of endpoints (each outnumbering
// X by DOM x) is collinear with X in raw sRGB bytes (interior t, small residual).
function isAntiAliasBlend(c, endpoints, DOM) {
  for (let i = 0; i < endpoints.length; i += 1) {
    const a = endpoints[i];
    if (a.count < c.count * DOM) continue;
    for (let j = 0; j < endpoints.length; j += 1) {
      if (j === i) continue;
      const b = endpoints[j];
      if (b.count < c.count * DOM) continue;
      const abx = b.r - a.r, aby = b.g - a.g, abz = b.b - a.b;
      const len2 = abx * abx + aby * aby + abz * abz;
      if (len2 < 144) continue;
      const t = ((c.r - a.r) * abx + (c.g - a.g) * aby + (c.b - a.b) * abz) / len2;
      if (t <= 0.12 || t >= 0.88) continue;
      const resid = Math.sqrt((c.r - (a.r + t * abx)) ** 2 + (c.g - (a.g + t * aby)) ** 2 + (c.b - (a.b + t * abz)) ** 2);
      if (resid <= Math.max(2.5, 0.06 * Math.sqrt(len2))) return true;
    }
  }
  return false;
}

function getColorDetail() {
  const value = els.colorDetail ? Number(els.colorDetail.value) : 55;
  return Math.min(1, Math.max(0, (Number.isFinite(value) ? value : 55) / 100));
}

// User-chosen palette size cap, or null when left blank (automatic).
function getMaxColors() {
  if (!els.maxColors) return null;
  const value = parseInt(els.maxColors.value, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Plain Euclidean RGB distance, used for nearest-swatch assignment (coverage,
// anchors, edge analysis). Uniform weighting — the old luminance weights crushed
// blue to 0.11 and over-merged distinct blues.
function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Circular distance between two hue angles (0..360), so reds at 358° and 2° read
// as 4° apart, not 356°.
function hueDistance(h1, h2) {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

// ---------------------------------------------------------------------------
// Deterministic, no-AI object/material naming for cel art.
//
// True scene understanding ("that's a roof") needs vision — that's the optional
// AI path below. Without a key we still give useful names by ROLE + MATERIAL
// FAMILY + LIGHTNESS TIER, computed from each color's CIELab values, coverage,
// and how much of it borders other colors (edgeCoverage):
//   • thin, near-black, high-edge  -> "Line art"
//   • largest low-chroma region    -> "Background" (or "Sky" if blue + up high)
//   • warm mid-tone skin range     -> "Skin"
//   • green                        -> "Foliage"
//   • otherwise                    -> a plain "<Hue> <tier>" descriptor
// Colors of the same family are then sorted by L* and labelled highlight /
// midtone / shadow — ground-truth ordering, never a model's guess at a tier.
// ---------------------------------------------------------------------------

// Per-swatch edgeCoverage: fraction of a color's pixels that sit next to a
// DIFFERENT palette color. Line art borders everything (high); a big flat fill
// barely borders anything (low). Computed once over the sampled bundle.
function computeEdgeCoverage(bundle, swatches) {
  const result = new Array(swatches.length).fill(0);
  if (!bundle || !bundle.width || !swatches.length) return result;
  const { data, width, height, skipTransparent } = bundle;
  const labels = new Int32Array(width * height).fill(-1);
  for (let p = 0; p < width * height; p += 1) {
    const i = p * 4;
    if (skipTransparent && data[i + 3] < 24) continue;
    labels[p] = nearestSwatchIndex({ r: data[i], g: data[i + 1], b: data[i + 2] }, swatches);
  }
  const own = new Float64Array(swatches.length);
  const edge = new Float64Array(swatches.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      const lab = labels[p];
      if (lab < 0) continue;
      own[lab] += 1;
      let bordered = false;
      if (x > 0 && labels[p - 1] !== lab && labels[p - 1] >= 0) bordered = true;
      else if (x < width - 1 && labels[p + 1] !== lab && labels[p + 1] >= 0) bordered = true;
      else if (y > 0 && labels[p - width] !== lab && labels[p - width] >= 0) bordered = true;
      else if (y < height - 1 && labels[p + width] !== lab && labels[p + width] >= 0) bordered = true;
      if (bordered) edge[lab] += 1;
    }
  for (let k = 0; k < swatches.length; k += 1) result[k] = own[k] ? edge[k] / own[k] : 0;
  return result;
}

// Per-swatch stats used by naming. Hue/saturation are HSV (so simpleHueName +
// the family ranges read naturally as color names); lightness L* and chroma are
// CIELab (so tiering is perceptually ordered).
function computeNameStats(swatches) {
  // Reuse the edgeCoverage computed during extraction; recompute only if stale
  // (e.g. the palette was hand-edited before an AI labeling pass).
  const edgeCov = state.lastEdge && state.lastEdge.length === swatches.length
    ? state.lastEdge
    : computeEdgeCoverage(state.lastPixels, swatches);
  return swatches.map((s, i) => {
    const lab = srgbToLab(s.r, s.g, s.b);
    return {
      i,
      L: lab.L,
      chroma: Math.hypot(lab.a, lab.b),
      hue: getHue(s.r, s.g, s.b),
      sat: getSaturation(s.r, s.g, s.b),
      coverage: s.coverage || 0,
      edge: edgeCov[i],
      anchorY: s.anchorY ?? 0.5
    };
  });
}

// Base FAMILY (role/material) per swatch from color + geometry, no tier yet.
function computeFamilies(swatches, stats) {
  let bgIndex = -1, bgCov = 0.25;
  for (const st of stats) if (st.sat < 0.28 && st.coverage > bgCov) { bgCov = st.coverage; bgIndex = st.i; }
  return swatches.map((s, i) => {
    const st = stats[i];
    if (st.L < 26 && st.sat < 0.45 && st.edge > 0.4) return "Line art";
    if (i === bgIndex) return st.sat > 0.08 && st.hue >= 185 && st.hue <= 255 && st.anchorY < 0.5 ? "Sky" : "Background";
    if (st.hue >= 18 && st.hue <= 48 && st.sat >= 0.12 && st.sat <= 0.7 && st.L >= 45 && st.L <= 92) return "Skin";
    if (st.hue >= 75 && st.hue <= 165 && st.sat > 0.15) return "Foliage";
    if (st.sat < 0.1) return "Neutral";
    return titleCase(simpleHueName(st.hue));
  });
}

function nameSwatchesHeuristically() {
  const swatches = state.swatches;
  if (!swatches.length) return;
  const stats = computeNameStats(swatches);
  assignTiers(swatches, stats, computeFamilies(swatches, stats));
}

// Group swatches by family, sort each group by L*, and label highlight /
// midtone / shadow (or numbered tiers for >4). Same-family swatches whose a*/b*
// differ markedly are treated as distinct PARTS, not tiers, so "roof tile" and
// "roof trim" don't get collapsed into a single ramp.
function assignTiers(swatches, stats, family) {
  const groups = new Map();
  family.forEach((name, i) => {
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(i);
  });

  const usedNames = new Set();
  const finalName = new Array(swatches.length).fill("");

  for (const [name, members] of groups) {
    // Singletons and structural roles get no tier.
    if (name === "Line art" || name === "Background" || name === "Sky" || members.length === 1) {
      for (const i of members) finalName[i] = name;
      continue;
    }
    // Split a family into chroma/hue "parts" so different materials of the same
    // hue family tier independently.
    const parts = [];
    for (const i of members) {
      const st = stats[i];
      let part = parts.find((p) => hueDistance(p.hue, st.hue) < 18 && Math.abs(p.chroma - st.chroma) < 22);
      if (!part) { part = { hue: st.hue, chroma: st.chroma, items: [] }; parts.push(part); }
      part.items.push(i);
    }
    for (const part of parts) {
      const items = part.items.slice().sort((a, b) => stats[b].L - stats[a].L); // light → dark
      const tiers = tierLabelsFor(items.length);
      items.forEach((i, rank) => {
        finalName[i] = tiers[rank] ? `${name} ${tiers[rank]}` : name;
      });
    }
  }

  swatches.forEach((swatch, i) => {
    const name = finalName[i];
    if (!name) return;
    swatch.objectName = name;
    swatch.swatchName = uniqueSwatchName(sanitizeName(name), i, usedNames);
  });
}

function tierLabelsFor(n) {
  if (n <= 1) return [""];
  if (n === 2) return ["highlight", "shadow"];
  if (n === 3) return ["highlight", "midtone", "shadow"];
  if (n === 4) return ["highlight", "light midtone", "midtone", "shadow"];
  const labels = new Array(n);
  labels[0] = "highlight";
  labels[n - 1] = "shadow";
  for (let k = 1; k < n - 1; k += 1) labels[k] = `midtone ${k}`;
  return labels;
}

// ---------------------------------------------------------------------------
// Optional remote AI labeling (opt-in via the switch + the user's own API key).
//
// Colors come from local extraction (exact, sampled from real pixels). To label
// them ACCURATELY we draw numbered markers on the image at each swatch's location
// and ask the model "what is at marker N?". Vision models are reliable at reading
// marked positions but NOT at emitting precise coordinates — so this keeps the
// label tied to the right color (no more "sky labeled hair").
// ---------------------------------------------------------------------------

async function labelViaMarkers(token) {
  if (!state.image) {
    logLine("AI labeling skipped: no image loaded.", "warn");
    els.statusLine.textContent = "Load an image before labeling with AI.";
    return;
  }
  if (!state.swatches.length) {
    logLine("AI labeling skipped: no colors yet — run Analyze first.", "warn");
    els.statusLine.textContent = "Analyze (or pick) some colors before labeling with AI.";
    return;
  }
  const providerId = state.aiProvider;
  const provider = aiProvider();
  const key = (state.aiKeys[providerId] || "").trim();
  if (!key) {
    logLine(`AI labeling skipped: no ${provider.keyLabel} entered.`, "warn");
    els.statusLine.textContent = `Add your ${provider.keyLabel} to label with AI.`;
    return;
  }

  els.statusLine.textContent = "Labeling with AI…";
  if (els.aiLabelBtn) els.aiLabelBtn.disabled = true;

  const model = (state.aiModels[providerId] || "").trim() || provider.defaultModel;
  // Only colors with an on-image location can be marked. Number the MARKED
  // colors contiguously (1..M) so the drawn markers exactly match the prompt's
  // color table — anchorless colors (e.g. from a loaded project) are skipped on
  // both sides, and labels map back to the original swatch via `marked`.
  const marked = state.swatches
    .map((swatch, index) => ({ swatch, index }))
    .filter((m) => Number.isFinite(m.swatch.anchorX) && Number.isFinite(m.swatch.anchorY));
  if (!marked.length) {
    logLine("AI labeling skipped: no colors have an on-image location to mark.", "warn");
    els.statusLine.textContent = "These colors have no on-image location to label.";
    hideAiProgress();
    if (els.aiLabelBtn) els.aiLabelBtn.disabled = false;
    return;
  }
  showAiProgress(`Preparing ${marked.length} markers…`);
  logLine(`AI labeling: ${providerId} / ${model}, ${marked.length} markers.`, "ai");
  const annotated = buildAnnotatedImageDataUrl(marked);
  const prompt = buildMarkerLabelingPrompt(marked);

  try {
    setAiProgress(`Contacting ${providerId}…`);
    let labels = await requestAiLabels(providerId, provider, key, model, prompt, annotated);
    if (token !== state.analyzeToken) {
      logLine("AI labeling superseded by a newer request — discarded.", "warn");
      return;
    }
    logLine(`AI returned ${labels.length} label${labels.length === 1 ? "" : "s"}.`, "ai");
    // A response can occasionally come back unparseable — retry once.
    if (!labels.length) {
      setAiProgress("Empty response — retrying…");
      logLine("Unparseable/empty response — retrying once.", "warn");
      labels = await requestAiLabels(providerId, provider, key, model, prompt, annotated);
      if (token !== state.analyzeToken) return;
      logLine(`Retry returned ${labels.length} label${labels.length === 1 ? "" : "s"}.`, "ai");
    }

    setAiProgress("Applying labels…");
    const named = applyAiLabels(labels, marked);
    renderSwatches();
    refreshExportPreview();
    logLine(`AI labeled ${named} of ${state.swatches.length} colors.`, "ai");
    els.statusLine.textContent = named
      ? `AI labeled ${named} color${named === 1 ? "" : "s"}.`
      : "AI returned no usable labels — click Label with AI to try again.";
  } catch (error) {
    if (token !== state.analyzeToken) return;
    logLine(`AI labeling failed: ${error.message}`, "error");
    els.statusLine.textContent = `AI labeling failed: ${error.message}. Color labels kept.`;
  } finally {
    hideAiProgress();
    refreshAiLabelButton();
  }
}

// One request → parsed [{i, object}] labels. Throws on HTTP error.
async function requestAiLabels(providerId, provider, key, model, prompt, dataUrl) {
  const request = buildAiRequest(providerId, key, model, prompt, dataUrl);
  logLine(`POST ${provider.url}`, "ai");
  const response = await fetch(provider.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body)
  });
  logLine(`Response: HTTP ${response.status} ${response.statusText || ""}`.trim(), response.ok ? "ai" : "error");
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      detail = errorJson.error?.message || detail;
    } catch (error) {
      /* keep status code */
    }
    throw new Error(detail);
  }
  const json = await response.json();
  return parseAiLabels(extractAiText(providerId, json));
}

// Draw the image with a numbered marker on each swatch's location, so the model
// can identify what's at each marker rather than guessing coordinates.
// `marked` is [{swatch, index}] of swatches that have an on-image anchor, in
// marker order (numbered 1..marked.length).
function buildAnnotatedImageDataUrl(marked) {
  const source = state.image;
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;
  const ratio = Math.min(1, 1100 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * ratio));
  const height = Math.max(1, Math.round(sourceHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, width, height);

  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  // Color-bound markers: each disc is painted in the swatch's OWN color and
  // ringed white + black, with a 1-based, auto-contrast number. Drawing the disc
  // in the swatch color lets the model cross-check the index against the color
  // list in the prompt, so labels bind to the right color.
  marked.forEach(({ swatch }, markerIndex) => {
    const x = swatch.anchorX * width;
    const y = swatch.anchorY * height;
    const radius = 13;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${swatch.r}, ${swatch.g}, ${swatch.b})`;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000000";
    ctx.stroke();
    ctx.fillStyle = getBrightness(swatch.r, swatch.g, swatch.b) < 140 ? "#ffffff" : "#000000";
    ctx.fillText(String(markerIndex + 1), x, y);
  });

  return canvas.toDataURL("image/png");
}

// Build the provider-specific request. Anthropic and OpenAI differ in auth
// headers, how the image is attached, and the response shape.
function buildAiRequest(providerId, key, model, prompt, dataUrl) {
  if (providerId === "openai") {
    return {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`
      },
      body: {
        model,
        max_tokens: 1024,
        temperature: 0, // deterministic — consistent labeling run to run
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ]
      }
    };
  }

  // Anthropic: image as a base64 source block + the browser-access header.
  const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl) || [];
  return {
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: {
      model,
      max_tokens: 1024,
      temperature: 0, // deterministic — consistent labeling run to run
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: match[1] || "image/png", data: match[2] || "" } },
            { type: "text", text: prompt }
          ]
        }
      ]
    }
  };
}

function extractAiText(providerId, json) {
  if (providerId === "openai") {
    return json.choices?.[0]?.message?.content || "";
  }
  return (json.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function buildMarkerLabelingPrompt(marked) {
  const count = marked.length;
  const table = marked
    .map(({ swatch }, i) => `  ${i + 1} = ${rgbToHex(swatch.r, swatch.g, swatch.b)} (${Math.round((swatch.coverage || 0) * 100)}% of image)`)
    .join("\n");
  return [
    "This is a hand-painted, cel-shaded 2D animation still. It uses a SMALL set of FLAT colors;",
    "the black line art is anti-aliased, so edges look blended — ignore those edge blends.",
    `The image has ${count} numbered markers (1..${count}); each marker's disc is painted in the`,
    "exact flat color it sits on. Here is each marker's color and how much of the image it covers:",
    table,
    "",
    "For EACH marker number, name the MATERIAL or scene part it sits on, using concrete art/material",
    "nouns: skin, hair, eyes, teeth, lips, shirt, sweater, denim, metal, glass, foliage, tree-trunk,",
    "grass, roof-tiles, roof-trim, brick, stone, water, sky, cloud, ground, wood, fabric, plastic, line-art.",
    "Do NOT say highlight, midtone, or shadow — lightness tiers are added automatically afterward.",
    "Decide from the MARKED LOCATION; use the listed color only to confirm which region a marker is on.",
    'If a marker sits on the black outline, answer "line-art". If you truly cannot tell, answer "unknown".',
    "Ignore any baked-in text, UI, watermark, or logo.",
    "",
    "Return ONLY a JSON array, one entry per marker, no prose or code fences:",
    '[{"i":1,"material":"skin"},{"i":2,"material":"roof-tiles"}]'
  ].join("\n");
}

function parseAiLabels(text) {
  if (!text) return [];
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && Number.isInteger(entry.i) && (entry.material || entry.object))
      .map((entry) => ({ i: entry.i, material: String(entry.material || entry.object).trim() }));
  } catch (error) {
    return [];
  }
}

// Apply AI materials as base families, fall back to the heuristic family for any
// unlabeled/unknown marker, then assign highlight/midtone/shadow tiers locally by
// L* — the model never has to judge lightness. `marked` maps each 1-based marker
// number back to its original swatch index.
function applyAiLabels(labels, marked) {
  const swatches = state.swatches;
  if (!labels.length || !swatches.length || !marked || !marked.length) return 0;
  const stats = computeNameStats(swatches);
  const family = computeFamilies(swatches, stats);
  let named = 0;
  for (const { i, material } of labels) {
    const entry = marked[i - 1]; // markers are 1-based and contiguous over `marked`
    if (!entry || !material || material.toLowerCase() === "unknown") continue;
    family[entry.index] = titleCase(material.replace(/[-_]+/g, " "));
    named += 1;
  }
  assignTiers(swatches, stats, family);
  return named;
}

// Friendly primary-ish color name (Red/Green/Blue/...), unlike getHueFamily
// which returns art terms like "maroon" for dark reds.
function simpleHueName(hue) {
  if (hue < 15 || hue >= 345) return "red";
  if (hue < 45) return "orange";
  if (hue < 70) return "yellow";
  if (hue < 160) return "green";
  if (hue < 200) return "cyan";
  if (hue < 255) return "blue";
  if (hue < 300) return "purple";
  return "pink";
}

function nearestSwatchIndex(pixel, swatches) {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < swatches.length; i += 1) {
    const distance = colorDistance(pixel, swatches[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

function imageToDataUrl(image) {
  if (typeof image.toDataURL === "function") return image.toDataURL("image/png");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function makeReadableColorLabel(r, g, b) {
  const brightness = getBrightness(r, g, b);
  const saturation = getSaturation(r, g, b);
  const hue = getHue(r, g, b);
  const base = getHueFamily(hue, saturation, brightness);

  if (brightness < 28) return "Black";
  if (brightness > 244 && saturation < 0.1) return "White";
  if (saturation < 0.12) {
    if (brightness < 80) return "Dark gray";
    if (brightness > 190) return "Light gray";
    return "Gray";
  }

  if (brightness < 70) return `Dark ${base}`;
  if (brightness > 210 && saturation < 0.45) return `Pale ${base}`;
  if (brightness > 185) return `Light ${base}`;
  if (saturation > 0.62 && brightness > 110) return `Bright ${base}`;
  if (saturation < 0.34) return `Muted ${base}`;
  return titleCase(base);
}

function getHueFamily(hue, saturation, brightness) {
  if (hue < 12 || hue >= 345) return brightness < 95 ? "maroon" : "red";
  if (hue < 28) return "salmon";
  if (hue < 45) return "orange";
  if (hue < 62) return saturation > 0.5 ? "yellow" : "ochre";
  if (hue < 88) return "yellow green";
  if (hue < 150) return "green";
  if (hue < 178) return "teal";
  if (hue < 205) return "cyan";
  if (hue < 238) return "blue";
  if (hue < 268) return "periwinkle";
  if (hue < 302) return "purple";
  if (hue < 330) return "lavender";
  return "pink";
}

function getSaturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function getBrightness(r, g, b) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getHue(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
}

function titleCase(value) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function renderSwatches() {
  els.swatchTable.innerHTML = "";

  if (!state.swatches.length) {
    els.swatchTable.innerHTML = '<tr class="empty-row"><td colspan="6">Generated colors will appear here.</td></tr>';
    setReady(Boolean(state.image));
    refreshExportPreview();
    renderOverlay(); // clear any callouts left on the image
    refreshAiLabelButton();
    return;
  }

  state.swatches.forEach((swatch, index) => {
    const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
    const colorPicker = row.querySelector(".color-picker");
    const swatchName = row.querySelector(".swatch-name");
    const rgbValue = row.querySelector(".rgb-value");
    const colorName = row.querySelector(".color-name");
    const objectName = row.querySelector(".object-name");
    const coverage = row.querySelector(".coverage");
    const removeButton = row.querySelector(".remove-button");

    colorPicker.value = rgbToHex(swatch.r, swatch.g, swatch.b);
    swatchName.value = swatch.swatchName;
    swatchName.classList.add("js-swatch-name");
    swatchName.dataset.swatchId = swatch.id;
    colorName.value = swatch.colorName;
    objectName.value = swatch.objectName;
    rgbValue.textContent = formatColorValues(swatch);
    coverage.textContent = `${(swatch.coverage * 100).toFixed(1)}%`;

    colorPicker.addEventListener("input", () => {
      const rgb = hexToRgb(colorPicker.value);
      Object.assign(swatch, rgb);
      // Re-derive the color label from the new RGB; keep the object name the
      // user/detector assigned, since object identity doesn't change with a hue tweak.
      swatch.colorName = makeReadableColorLabel(rgb.r, rgb.g, rgb.b);
      colorName.value = swatch.colorName;
      rgbValue.textContent = formatColorValues(swatch);
      refreshExportPreview();
    });
    // Rescan percentages once the new color is committed (not on every drag frame).
    colorPicker.addEventListener("change", () => {
      recomputeCoverage();
      renderSwatches();
    });
    swatchName.addEventListener("input", () => {
      applySwatchName(swatch.id, swatchName.value, swatchName);
    });
    colorName.addEventListener("input", () => {
      swatch.colorName = colorName.value.trim();
      refreshExportPreview();
    });
    objectName.addEventListener("input", () => {
      swatch.objectName = objectName.value.trim();
      refreshExportPreview();
    });
    removeButton.addEventListener("click", () => {
      state.swatches.splice(index, 1);
      recomputeCoverage(); // remaining colors absorb the removed color's pixels
      renderSwatches();
    });

    els.swatchTable.appendChild(row);
  });

  setReady(Boolean(state.image));
  refreshExportPreview();
  renderOverlay();
  refreshAiLabelButton();
}

// Two-way binding for the swatch name: a change here updates state and every
// bound input (the list row AND the on-image callout) except the one being
// typed in. Both inputs carry class "js-swatch-name" and data-swatch-id.
function applySwatchName(id, rawValue, originEl) {
  const swatch = state.swatches.find((item) => item.id === id);
  if (!swatch) return;
  const clean = sanitizeName(rawValue);
  swatch.swatchName = clean;
  document.querySelectorAll(`.js-swatch-name[data-swatch-id="${id}"]`).forEach((el) => {
    if (el.value !== clean) el.value = clean;
  });
  refreshExportPreview();
}

// Maps an image-normalized point (0..1 over the image content) to pixel
// coordinates inside .preview-wrap, accounting for BOTH letterboxes: the image
// inside the canvas bitmap, and the bitmap inside the CSS-scaled canvas box
// (object-fit: contain).
function overlayPoint(anchorX, anchorY) {
  const rect = state.previewRect;
  const canvas = els.previewCanvas;
  if (!rect || !canvas) return null;

  const bitmapX = rect.x + anchorX * rect.width;
  const bitmapY = rect.y + anchorY * rect.height;

  const boxWidth = canvas.clientWidth;
  const boxHeight = canvas.clientHeight;
  if (!boxWidth || !boxHeight) return null;

  const scale = Math.min(boxWidth / canvas.width, boxHeight / canvas.height);
  const shownWidth = canvas.width * scale;
  const shownHeight = canvas.height * scale;
  const offsetX = canvas.offsetLeft + (boxWidth - shownWidth) / 2;
  const offsetY = canvas.offsetTop + (boxHeight - shownHeight) / 2;

  return { left: offsetX + bitmapX * scale, top: offsetY + bitmapY * scale };
}

const OVERLAY_LABEL_WIDTH = 104;
const OVERLAY_LABEL_HEIGHT = 21;
const OVERLAY_LEADER_GAP = 54;

function calloutBounds() {
  const canvas = els.previewCanvas;
  return {
    midX: canvas.offsetLeft + canvas.clientWidth / 2,
    width: canvas.offsetLeft + canvas.clientWidth,
    height: canvas.offsetTop + canvas.clientHeight
  };
}

function renderOverlay() {
  const layer = els.overlayLayer;
  if (!layer) return;
  layer.innerHTML = "";
  layer.style.display = state.showCallouts ? "" : "none";

  if (!state.showCallouts || !state.image || !state.previewRect || !state.swatches.length) return;

  // Build a marker for every swatch that has a real image location (skips
  // manually-added colors, which have no anchor).
  const markers = [];
  for (const swatch of state.swatches) {
    if (!Number.isFinite(swatch.anchorX) || !Number.isFinite(swatch.anchorY)) continue;
    const point = overlayPoint(swatch.anchorX, swatch.anchorY);
    if (!point) continue;
    markers.push({ swatch, point });
  }
  if (!markers.length) return;

  const bounds = calloutBounds();
  const maxLeft = Math.max(0, bounds.width - OVERLAY_LABEL_WIDTH);
  const maxTop = Math.max(0, bounds.height - OVERLAY_LABEL_HEIGHT);

  // Labels the user has dragged keep their stored position (as a fraction of the
  // preview box, so they survive resize); the rest auto-layout into columns.
  const auto = [];
  for (const marker of markers) {
    const swatch = marker.swatch;
    if (Number.isFinite(swatch.labelFx) && Number.isFinite(swatch.labelFy)) {
      marker.labelLeft = Math.min(maxLeft, Math.max(0, swatch.labelFx * bounds.width));
      marker.labelTop = Math.min(maxTop, Math.max(0, swatch.labelFy * bounds.height));
    } else {
      auto.push(marker);
    }
  }
  const left = auto.filter((m) => m.point.left < bounds.midX).sort((a, b) => a.point.top - b.point.top);
  const right = auto.filter((m) => m.point.left >= bounds.midX).sort((a, b) => a.point.top - b.point.top);
  layoutLabelColumn(left, "left", bounds);
  layoutLabelColumn(right, "right", bounds);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "overlay-lines");
  layer.appendChild(svg);

  for (const marker of markers) {
    const { swatch, point, labelLeft, labelTop } = marker;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", point.left);
    line.setAttribute("y1", point.top);
    setLineEnd(line, point, labelLeft, labelTop);
    svg.appendChild(line);

    const dot = document.createElement("div");
    dot.className = "overlay-dot";
    dot.title = "Drag to re-target this color";
    dot.style.left = `${point.left}px`;
    dot.style.top = `${point.top}px`;
    dot.style.background = rgbToHex(swatch.r, swatch.g, swatch.b);
    layer.appendChild(dot);
    attachDotDrag(dot, line, marker);

    const callout = document.createElement("div");
    callout.className = "overlay-callout";
    callout.style.left = `${labelLeft}px`;
    callout.style.top = `${labelTop}px`;

    const grip = document.createElement("span");
    grip.className = "overlay-grip";
    grip.title = "Drag to reposition";
    grip.setAttribute("aria-hidden", "true");
    grip.textContent = "⠿";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "overlay-label js-swatch-name";
    input.dataset.swatchId = swatch.id;
    input.value = swatch.swatchName;
    input.setAttribute("aria-label", "Callout name");
    input.addEventListener("input", () => applySwatchName(swatch.id, input.value, input));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "overlay-del";
    del.title = "Delete this color";
    del.setAttribute("aria-label", "Delete this color");
    del.textContent = "×";
    del.addEventListener("pointerdown", (event) => event.stopPropagation());
    del.addEventListener("click", (event) => {
      event.stopPropagation();
      removeSwatchById(swatch.id);
    });

    callout.appendChild(grip);
    callout.appendChild(input);
    callout.appendChild(del);
    layer.appendChild(callout);

    attachCalloutDrag(grip, callout, line, marker);
  }
}

// Remove a swatch (used by the callout's delete button), keeping coverage and the
// overlay in sync.
function removeSwatchById(id) {
  const index = state.swatches.findIndex((swatch) => swatch.id === id);
  if (index < 0) return;
  const removed = state.swatches[index];
  state.swatches.splice(index, 1);
  recomputeCoverage();
  renderSwatches();
  logLine(`Removed "${removed.objectName || removed.colorName || removed.swatchName}".`);
}

// Point the leader line at the label's edge that faces the dot.
function setLineEnd(line, point, labelLeft, labelTop) {
  const facingRight = labelLeft + OVERLAY_LABEL_WIDTH / 2 >= point.left;
  line.setAttribute("x2", facingRight ? labelLeft : labelLeft + OVERLAY_LABEL_WIDTH);
  line.setAttribute("y2", labelTop + OVERLAY_LABEL_HEIGHT / 2);
}

function attachCalloutDrag(grip, callout, line, marker) {
  grip.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const bounds = calloutBounds();
    const maxLeft = Math.max(0, bounds.width - OVERLAY_LABEL_WIDTH);
    const maxTop = Math.max(0, bounds.height - OVERLAY_LABEL_HEIGHT);
    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = parseFloat(callout.style.left) || 0;
    const originTop = parseFloat(callout.style.top) || 0;
    grip.setPointerCapture(event.pointerId);
    callout.classList.add("is-dragging");

    const onMove = (moveEvent) => {
      const nextLeft = Math.min(maxLeft, Math.max(0, originLeft + (moveEvent.clientX - startX)));
      const nextTop = Math.min(maxTop, Math.max(0, originTop + (moveEvent.clientY - startY)));
      callout.style.left = `${nextLeft}px`;
      callout.style.top = `${nextTop}px`;
      setLineEnd(line, marker.point, nextLeft, nextTop);
    };
    const onUp = () => {
      grip.releasePointerCapture(event.pointerId);
      callout.classList.remove("is-dragging");
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      const finalLeft = parseFloat(callout.style.left) || 0;
      const finalTop = parseFloat(callout.style.top) || 0;
      // Persist as a fraction of the preview box so it survives resizes/re-renders.
      marker.swatch.labelFx = bounds.width ? finalLeft / bounds.width : 0;
      marker.swatch.labelFy = bounds.height ? finalTop / bounds.height : 0;
    };
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
  });
}

// Drag the end dot to re-target a color: a magnifier loupe follows the cursor
// showing zoomed pixels + a crosshair + the color under it, and on release the
// swatch adopts that pixel's color and anchor.
function attachDotDrag(dot, line, marker) {
  dot.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const layer = els.overlayLayer;
    const layerRect = layer.getBoundingClientRect();
    dot.setPointerCapture(event.pointerId);
    dot.classList.add("is-dragging");

    const loupe = createLoupe();
    layer.appendChild(loupe.el);

    let pendingColor = null;
    let pendingAnchor = null;

    const apply = (clientX, clientY) => {
      const mapped = displayToImage(clientX - layerRect.left, clientY - layerRect.top);
      if (!mapped) return;
      dot.style.left = `${mapped.dispX}px`;
      dot.style.top = `${mapped.dispY}px`;
      line.setAttribute("x1", mapped.dispX);
      line.setAttribute("y1", mapped.dispY);
      const color = sampleBitmapColor(mapped.bx, mapped.by);
      if (color) {
        dot.style.background = rgbToHex(color.r, color.g, color.b);
        pendingColor = color;
      }
      pendingAnchor = { x: mapped.anchorX, y: mapped.anchorY };
      loupe.update(mapped, color, layerRect);
    };

    apply(event.clientX, event.clientY);
    const onMove = (moveEvent) => apply(moveEvent.clientX, moveEvent.clientY);
    const onUp = () => {
      dot.releasePointerCapture(event.pointerId);
      dot.classList.remove("is-dragging");
      dot.removeEventListener("pointermove", onMove);
      dot.removeEventListener("pointerup", onUp);
      loupe.el.remove();
      if (pendingAnchor) {
        marker.swatch.anchorX = pendingAnchor.x;
        marker.swatch.anchorY = pendingAnchor.y;
      }
      if (pendingColor) {
        marker.swatch.r = pendingColor.r;
        marker.swatch.g = pendingColor.g;
        marker.swatch.b = pendingColor.b;
        marker.swatch.colorName = makeReadableColorLabel(pendingColor.r, pendingColor.g, pendingColor.b);
      }
      recomputeCoverage(); // the user identified a color — rescan percentages
      renderSwatches(); // refresh list (new RGB) and overlay (new anchor/color)
    };
    dot.addEventListener("pointermove", onMove);
    dot.addEventListener("pointerup", onUp);
  });
}

// Inverse of overlayPoint: preview-box pixel -> image bitmap coords (clamped to
// the image content), plus the resulting normalized anchor.
function displayToImage(dispX, dispY) {
  const rect = state.previewRect;
  const canvas = els.previewCanvas;
  if (!rect || !canvas.clientWidth) return null;
  const scale = Math.min(canvas.clientWidth / canvas.width, canvas.clientHeight / canvas.height);
  const offsetX = canvas.offsetLeft + (canvas.clientWidth - canvas.width * scale) / 2;
  const offsetY = canvas.offsetTop + (canvas.clientHeight - canvas.height * scale) / 2;
  const bx = Math.min(rect.x + rect.width - 1, Math.max(rect.x, (dispX - offsetX) / scale));
  const by = Math.min(rect.y + rect.height - 1, Math.max(rect.y, (dispY - offsetY) / scale));
  return {
    bx,
    by,
    dispX: offsetX + bx * scale,
    dispY: offsetY + by * scale,
    anchorX: (bx - rect.x) / rect.width,
    anchorY: (by - rect.y) / rect.height
  };
}

function sampleBitmapColor(bx, by) {
  try {
    const ctx = els.previewCanvas.getContext("2d", { willReadFrequently: true });
    const data = ctx.getImageData(Math.round(bx), Math.round(by), 1, 1).data;
    return { r: data[0], g: data[1], b: data[2] };
  } catch (error) {
    return null; // tainted canvas, etc. — keep existing color
  }
}

function createLoupe() {
  const el = document.createElement("div");
  el.className = "overlay-loupe";
  const canvas = document.createElement("canvas");
  canvas.width = 120;
  canvas.height = 120;
  const readout = document.createElement("div");
  readout.className = "loupe-readout";
  const chip = document.createElement("span");
  chip.className = "loupe-chip";
  const text = document.createElement("span");
  readout.appendChild(chip);
  readout.appendChild(text);
  el.appendChild(canvas);
  el.appendChild(readout);
  const lctx = canvas.getContext("2d");

  return {
    el,
    update(mapped, color, layerRect) {
      const zoom = 6;
      const srcSize = 120 / zoom;
      lctx.imageSmoothingEnabled = false;
      lctx.clearRect(0, 0, 120, 120);
      lctx.drawImage(els.previewCanvas, mapped.bx - srcSize / 2, mapped.by - srcSize / 2, srcSize, srcSize, 0, 0, 120, 120);
      lctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      lctx.lineWidth = 1;
      lctx.beginPath();
      lctx.moveTo(60, 47);
      lctx.lineTo(60, 73);
      lctx.moveTo(47, 60);
      lctx.lineTo(73, 60);
      lctx.stroke();
      lctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      lctx.strokeRect(54, 54, 12, 12);

      if (color) {
        const hex = rgbToHex(color.r, color.g, color.b);
        chip.style.background = hex;
        text.textContent = `${hex} · ${color.r},${color.g},${color.b}`;
      }

      let loupeLeft = mapped.dispX + 18;
      let loupeTop = mapped.dispY - 150;
      if (loupeTop < 0) loupeTop = mapped.dispY + 18;
      if (loupeLeft + 128 > layerRect.width) loupeLeft = mapped.dispX - 18 - 128;
      el.style.left = `${Math.max(0, loupeLeft)}px`;
      el.style.top = `${loupeTop}px`;
    }
  };
}

function layoutLabelColumn(group, side, bounds) {
  let previousBottom = -Infinity;
  const maxLeft = Math.max(0, bounds.width - OVERLAY_LABEL_WIDTH);
  const maxTop = Math.max(0, bounds.height - OVERLAY_LABEL_HEIGHT);
  for (const marker of group) {
    marker.side = side;
    const rawLeft =
      side === "right"
        ? marker.point.left + OVERLAY_LEADER_GAP
        : marker.point.left - OVERLAY_LEADER_GAP - OVERLAY_LABEL_WIDTH;
    marker.labelLeft = Math.min(maxLeft, Math.max(0, rawLeft));

    let top = marker.point.top - OVERLAY_LABEL_HEIGHT / 2;
    if (top < previousBottom + 6) top = previousBottom + 6;
    if (top > maxTop) top = maxTop;
    marker.labelTop = Math.max(0, top);
    previousBottom = top + OVERLAY_LABEL_HEIGHT;
  }
}

window.addEventListener("resize", () => {
  if (state.image && state.swatches.length) renderOverlay();
});

function addManualSwatch() {
  state.generatedAt ||= new Date();
  const n = state.swatches.length;
  state.swatches.push({
    id: makeHarmonyId(),
    swatchName: uniqueSwatchName("new_color", n),
    colorName: "Gray",
    objectName: "",
    r: 128,
    g: 128,
    b: 128,
    a: 255,
    coverage: 0,
    // A real anchor (staggered so repeated adds don't stack) gives the new color
    // a callout on the image; drag its dot to sample the actual color you want.
    anchorX: Math.min(0.92, Math.max(0.08, 0.5 + ((n % 5) - 2) * 0.05)),
    anchorY: Math.min(0.92, Math.max(0.08, 0.5 + ((n % 3) - 1) * 0.06))
  });
  recomputeCoverage();
  renderSwatches();
  els.statusLine.textContent = state.image
    ? "New color added — drag its dot on the image to pick the color."
    : `${state.swatches.length} swatches ready.`;
  refreshExportPreview();
}

// Add a swatch from a clicked image point (pick mode): its color is the sampled
// pixel and its callout anchor is the click location.
function addPickedSwatch(color, anchorX, anchorY) {
  ensureSampledPixels();
  const index = state.swatches.length;
  const usedNames = new Set(state.swatches.map((swatch) => swatch.swatchName));
  const colorName = makeReadableColorLabel(color.r, color.g, color.b);
  state.swatches.push({
    id: makeHarmonyId(),
    swatchName: uniqueSwatchName(sanitizeName(colorName) || `color_${index + 1}`, index, usedNames),
    colorName,
    objectName: "",
    r: color.r,
    g: color.g,
    b: color.b,
    a: 255,
    coverage: 0,
    anchorX,
    anchorY
  });
  state.generatedAt ||= new Date();
  recomputeCoverage(); // give every swatch (incl. the new one) an updated %
  renderSwatches();
  refreshExportPreview();
  els.statusLine.textContent = `${state.swatches.length} color${state.swatches.length === 1 ? "" : "s"} picked. Keep clicking to add more.`;
}

function clearSwatches() {
  state.swatches = [];
  state.analyzeToken += 1; // cancel any in-flight analysis / labeling
  renderSwatches();
  refreshExportPreview();
  logLine("Palette cleared.");
  els.statusLine.textContent = state.pickMode
    ? "Cleared. Click the image to start laying down colors."
    : "Palette cleared.";
}

// Lazily sample the current image so coverage can be computed even if the user
// never ran Analyze (e.g. pure pick-mode sessions).
function ensureSampledPixels() {
  if (!state.lastPixels && state.image) {
    state.lastPixels = sampleImage(state.image, els.ignoreTransparency.checked);
  }
}

function downloadTxt() {
  saveTextFile(`${sanitizeName(els.paletteName.value)}_palette.md`, buildMarkdownReport());
}

// ---------------------------------------------------------------------------
// Save / load the whole working session as a self-contained JSON project.
// The embedded image makes the file portable; API keys are deliberately NOT
// included.
// ---------------------------------------------------------------------------

function projectToData() {
  return {
    app: "PaletteBuilder",
    version: 1,
    savedAt: new Date().toISOString(),
    paletteName: els.paletteName.value,
    settings: {
      ignoreTransparency: els.ignoreTransparency.checked,
      sortByCoverage: els.sortByCoverage.checked,
      showCallouts: state.showCallouts,
      showCmyk: state.showCmyk,
      showLab: state.showLab,
      colorDetail: els.colorDetail ? Number(els.colorDetail.value) : 55,
      maxColors: getMaxColors(),
      aiProvider: state.aiProvider,
      aiModels: { anthropic: state.aiModels.anthropic, openai: state.aiModels.openai }
    },
    image: state.image ? imageToDataUrl(state.image) : null,
    swatches: state.swatches.map((swatch) => ({
      swatchName: swatch.swatchName,
      colorName: swatch.colorName,
      objectName: swatch.objectName,
      r: swatch.r,
      g: swatch.g,
      b: swatch.b,
      a: swatch.a,
      coverage: swatch.coverage,
      anchorX: swatch.anchorX,
      anchorY: swatch.anchorY,
      labelFx: swatch.labelFx,
      labelFy: swatch.labelFy
    }))
  };
}

function downloadProject() {
  const name = sanitizeName(els.paletteName.value) || "palette";
  saveTextFile(`${name}_project.json`, JSON.stringify(projectToData(), null, 2));
  logLine(`Saved project "${name}_project.json" (${state.swatches.length} colors).`);
}

function restoreSwatchesFromData(dataSwatches) {
  const usedNames = new Set();
  return dataSwatches.map((swatch, index) => ({
    id: makeHarmonyId(),
    swatchName: uniqueSwatchName(sanitizeName(swatch.swatchName || swatch.colorName || `color_${index + 1}`), index, usedNames),
    colorName: swatch.colorName || "",
    objectName: swatch.objectName || "",
    r: clampByte(swatch.r),
    g: clampByte(swatch.g),
    b: clampByte(swatch.b),
    a: Number.isFinite(swatch.a) ? swatch.a : 255,
    coverage: Number.isFinite(swatch.coverage) ? swatch.coverage : 0,
    anchorX: Number.isFinite(swatch.anchorX) ? swatch.anchorX : undefined,
    anchorY: Number.isFinite(swatch.anchorY) ? swatch.anchorY : undefined,
    labelFx: Number.isFinite(swatch.labelFx) ? swatch.labelFx : undefined,
    labelFy: Number.isFinite(swatch.labelFy) ? swatch.labelFy : undefined
  }));
}

async function loadProjectFile(file) {
  try {
    logLine(`Loading project "${file.name}"…`);
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || !Array.isArray(data.swatches)) {
      throw new Error("not a PaletteBuilder project file");
    }
    await loadProject(data);
    logLine(`Loaded project: ${data.swatches.length} colors${data.image ? " + image" : ""}.`);
  } catch (error) {
    logLine(`Could not load project: ${error.message}`, "error");
    els.statusLine.textContent = `Could not load project: ${error.message}`;
  }
}

async function loadProject(data) {
  // Restore palette name + settings.
  if (typeof data.paletteName === "string") els.paletteName.value = data.paletteName;
  const settings = data.settings || {};
  if (typeof settings.ignoreTransparency === "boolean") els.ignoreTransparency.checked = settings.ignoreTransparency;
  if (typeof settings.sortByCoverage === "boolean") els.sortByCoverage.checked = settings.sortByCoverage;
  if (typeof settings.showCallouts === "boolean") {
    state.showCallouts = settings.showCallouts;
    if (els.showCallouts) els.showCallouts.checked = settings.showCallouts;
  }
  if (typeof settings.showCmyk === "boolean") {
    state.showCmyk = settings.showCmyk;
    if (els.showCmyk) els.showCmyk.checked = settings.showCmyk;
  }
  if (typeof settings.showLab === "boolean") {
    state.showLab = settings.showLab;
    if (els.showLab) els.showLab.checked = settings.showLab;
  }
  if (Number.isFinite(settings.colorDetail) && els.colorDetail) {
    els.colorDetail.value = settings.colorDetail;
    updateColorDetailLabel();
  }
  if (els.maxColors) {
    els.maxColors.value = Number.isFinite(settings.maxColors) && settings.maxColors > 0 ? settings.maxColors : "";
  }
  if (settings.aiProvider && els.aiProvider) {
    state.aiProvider = settings.aiProvider === "openai" ? "openai" : "anthropic";
    els.aiProvider.value = state.aiProvider;
  }
  if (settings.aiModels) {
    state.aiModels.anthropic = settings.aiModels.anthropic || state.aiModels.anthropic;
    state.aiModels.openai = settings.aiModels.openai || state.aiModels.openai;
  }
  syncAiProviderUI();

  // Restore the image (so the preview + callouts + coverage rescans work).
  if (data.image) {
    const image = await loadImage(data.image);
    state.image = image;
    state.imageFileName = sanitizeName(data.paletteName || "project");
    drawPreview(image);
    els.emptyPreview.hidden = true;
    state.lastPixels = sampleImage(image, els.ignoreTransparency.checked);
  } else {
    state.image = null;
    state.lastPixels = null;
  }
  state.generatedAt = new Date();
  state.analyzeToken += 1; // cancel any in-flight analysis from a prior image

  // Restore swatches (fresh ids for the two-way binding).
  state.swatches = restoreSwatchesFromData(data.swatches);

  setReady(Boolean(state.image));
  renderSwatches();
  refreshExportPreview();
  els.statusLine.textContent = `Loaded ${state.swatches.length} color${state.swatches.length === 1 ? "" : "s"} from project.`;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

function buildMarkdownReport() {
  const headers = ["RGB"];
  if (state.showCmyk) headers.push("CMYK");
  if (state.showLab) headers.push("Lab");
  headers.push("Color label", "Associated object", "Harmony swatch");

  const rows = state.swatches.map((swatch) => {
    const row = [formatRgb(swatch)];
    if (state.showCmyk) row.push(formatCmyk(swatch));
    if (state.showLab) row.push(formatLab(swatch));
    row.push(swatch.colorName, swatch.objectName, sanitizeName(swatch.swatchName));
    return row;
  });

  return [
    `# ${els.paletteName.value || "Generated_Palette"} Palette`,
    "",
    `- Source image: ${state.imageFileName || "unknown"}`,
    `- Generated: ${(state.generatedAt || new Date()).toLocaleString()}`,
    `- Swatches: ${state.swatches.length}`,
    "",
    buildAlignedMarkdownTable(headers, rows)
  ].join("\n");
}

function buildTxtReport() {
  return buildMarkdownReport();
}

function setExportPreviewMode(mode) {
  state.exportPreviewMode = mode;
  const tabs = [
    [els.previewTxtBtn, "txt"],
    [els.previewPltBtn, "plt"],
    [els.previewAcoBtn, "aco"],
    [els.previewAseBtn, "ase"]
  ];
  for (const [button, value] of tabs) {
    const isActive = mode === value;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }
  refreshExportPreview();
}

const exportModeLabels = { txt: "Markdown", plt: "Harmony PLT", aco: "Photoshop ACO", ase: "Adobe ASE" };

function refreshExportPreview() {
  if (!state.swatches.length) {
    els.exportStatusLine.textContent = "Markdown output will appear after analysis.";
    els.exportPreview.textContent = "Load an image to preview the exported data.";
    return;
  }

  const mode = state.exportPreviewMode;
  els.exportStatusLine.textContent = `${state.swatches.length} swatches ready for ${exportModeLabels[mode] || "Markdown"} export.`;
  els.exportPreview.textContent =
    mode === "plt" ? buildHarmonyPalette()
    : mode === "aco" ? buildAcoPreview()
    : mode === "ase" ? buildAsePreview()
    : buildMarkdownReport();
}

function downloadPlt() {
  saveTextFile(`${sanitizeName(els.paletteName.value)}.plt`, buildHarmonyPalette());
}

// Disambiguate repeated names for export so two swatches never share a name in
// the file (the editable UI still allows free typing). Appends "<joiner>2", "3"…
function dedupeNames(rawNames, joiner) {
  const used = new Set();
  return rawNames.map((raw) => {
    const base = raw || "color";
    if (!used.has(base)) { used.add(base); return base; }
    let n = 2;
    while (used.has(`${base}${joiner}${n}`)) n += 1;
    const name = `${base}${joiner}${n}`;
    used.add(name);
    return name;
  });
}

// Human-readable, de-duplicated swatch names for the Adobe (.aco/.ase) exports.
function acoExportNames() {
  return dedupeNames(state.swatches.map(acoSwatchName), " ");
}

function buildHarmonyPalette() {
  const names = dedupeNames(
    state.swatches.map((swatch) => sanitizeName(swatch.swatchName || swatch.objectName || swatch.colorName || "color")),
    "_"
  );
  const lines = ["ToonBoomAnimationInc PaletteFile 2"];
  state.swatches.forEach((swatch, index) => {
    lines.push(
      `Solid    ${names[index].padEnd(26, " ")} ${swatch.id} ${padColor(swatch.r)} ${padColor(swatch.g)} ${padColor(swatch.b)} ${padColor(swatch.a)}`
    );
  });
  return `${lines.join("\n")}\n`;
}

function downloadAco() {
  saveBinaryFile(`${sanitizeName(els.paletteName.value)}.aco`, buildAcoBytes(), "application/octet-stream");
}

// Adobe Color Swatches (.aco) — the file Photoshop's Swatches panel loads via
// "Load Swatches". Photoshop writes a version 1 block (raw colors) immediately
// followed by a version 2 block (same colors plus UTF-16 names) so that both
// legacy and named-swatch readers work; we mirror that layout.
function buildAcoBytes() {
  const swatches = state.swatches;
  const bytes = [];
  const push16 = (value) => bytes.push((value >> 8) & 0xff, value & 0xff);
  const push32 = (value) => bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  const channel16 = (value) => Math.max(0, Math.min(255, Math.round(value))) * 257; // 0..255 -> 0..65535

  const writeColor = (swatch) => {
    push16(0); // color space: 0 = RGB
    push16(channel16(swatch.r));
    push16(channel16(swatch.g));
    push16(channel16(swatch.b));
    push16(0); // 4th component unused for RGB
  };

  // Version 1 block.
  push16(1);
  push16(swatches.length);
  for (const swatch of swatches) writeColor(swatch);

  // Version 2 block (adds names; de-duplicated so no two swatches share a name).
  const names = acoExportNames();
  push16(2);
  push16(swatches.length);
  swatches.forEach((swatch, index) => {
    writeColor(swatch);
    const name = names[index];
    push32(name.length + 1); // character count, including the null terminator
    for (let i = 0; i < name.length; i += 1) push16(name.charCodeAt(i)); // UTF-16BE
    push16(0); // null terminator
  });

  return new Uint8Array(bytes);
}

function acoSwatchName(swatch) {
  return (swatch.colorName || swatch.swatchName || swatch.objectName || "Color").trim() || "Color";
}

function buildAcoPreview() {
  const bytes = buildAcoBytes();
  const header = [
    "Adobe Photoshop swatches (.aco)",
    `${state.swatches.length} colors · RGB · v1 + v2 (named) · ${bytes.length.toLocaleString()} bytes`,
    "Load in Photoshop: Swatches panel ▸ menu ▸ Load Swatches",
    ""
  ];
  const names = acoExportNames();
  const nameWidth = Math.max(4, ...names.map((name) => name.length));
  const rows = state.swatches.map((swatch, index) => {
    const num = String(index + 1).padStart(3, " ");
    const name = names[index].padEnd(nameWidth, " ");
    const hex = rgbToHex(swatch.r, swatch.g, swatch.b).toUpperCase();
    return `${num}  ${name}  ${hex}  ${formatRgb(swatch)}`;
  });
  return [...header, ...rows].join("\n");
}

function downloadAse() {
  saveBinaryFile(`${sanitizeName(els.paletteName.value)}.ase`, buildAseBytes(), "application/octet-stream");
}

// Adobe Swatch Exchange (.ase) — the cross-app swatch format loaded by
// Photoshop, Illustrator and InDesign. Layout: "ASEF" signature, version 1.0,
// a 32-bit block count, then one color-entry block per swatch. Each block is
// [type 0x0001][u32 length][u16 name length (incl. null)][UTF-16BE name + null]
// ["RGB " model][3 × float32 BE in 0..1][u16 color type]. All big-endian.
function buildAseBytes() {
  const swatches = state.swatches;
  const out = [];
  const u16 = (arr, value) => arr.push((value >> 8) & 0xff, value & 0xff);
  const u32 = (arr, value) => arr.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  const f32 = (arr, value) => {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, false); // big-endian
    arr.push(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  };
  const unit = (value) => Math.max(0, Math.min(255, Math.round(value))) / 255; // 0..255 -> 0..1

  // Header: signature + version 1.0 + block count (one color entry per swatch).
  out.push(0x41, 0x53, 0x45, 0x46); // "ASEF"
  u16(out, 1);
  u16(out, 0);
  u32(out, swatches.length);

  const names = acoExportNames();
  swatches.forEach((swatch, index) => {
    const name = names[index];
    const data = [];
    u16(data, name.length + 1); // name length in UTF-16 units, including null terminator
    for (let i = 0; i < name.length; i += 1) u16(data, name.charCodeAt(i)); // UTF-16BE
    u16(data, 0); // null terminator
    data.push(0x52, 0x47, 0x42, 0x20); // color model "RGB "
    f32(data, unit(swatch.r));
    f32(data, unit(swatch.g));
    f32(data, unit(swatch.b));
    u16(data, 2); // color type: 0=global, 1=spot, 2=normal/process

    u16(out, 0x0001); // block type: color entry
    u32(out, data.length); // block length
    for (const byte of data) out.push(byte);
  });

  return new Uint8Array(out);
}

function buildAsePreview() {
  const bytes = buildAseBytes();
  const header = [
    "Adobe Swatch Exchange (.ase)",
    `${state.swatches.length} colors · RGB · ${bytes.length.toLocaleString()} bytes`,
    "Works across Photoshop, Illustrator & InDesign: Swatches ▸ menu ▸ Open/Load Swatch Library",
    ""
  ];
  const names = acoExportNames();
  const nameWidth = Math.max(4, ...names.map((name) => name.length));
  const rows = state.swatches.map((swatch, index) => {
    const num = String(index + 1).padStart(3, " ");
    const name = names[index].padEnd(nameWidth, " ");
    const hex = rgbToHex(swatch.r, swatch.g, swatch.b).toUpperCase();
    return `${num}  ${name}  ${hex}  ${formatRgb(swatch)}`;
  });
  return [...header, ...rows].join("\n");
}

function saveTextFile(fileName, text) {
  const type = fileName.endsWith(".md")
    ? "text/markdown;charset=utf-8"
    : fileName.endsWith(".json")
      ? "application/json;charset=utf-8"
      : "text/plain;charset=utf-8";
  saveBlob(fileName || "palette.md", new Blob([text], { type }));
}

function saveBinaryFile(fileName, bytes, type = "application/octet-stream") {
  saveBlob(fileName || "palette.aco", new Blob([bytes], { type }));
}

function saveBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function makeHarmonyId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function uniqueSwatchName(baseName, index, names = new Set(state.swatches.map((swatch) => swatch.swatchName))) {
  const safeBase = sanitizeName(baseName) || `color_${index + 1}`;
  if (!names.has(safeBase)) {
    names.add(safeBase);
    return safeBase;
  }
  let suffix = 2;
  while (names.has(`${safeBase}_${suffix}`)) suffix += 1;
  const uniqueName = `${safeBase}_${suffix}`;
  names.add(uniqueName);
  return uniqueName;
}

function sanitizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_ -]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 26);
}

function padColor(value) {
  return String(Math.max(0, Math.min(255, Math.round(value)))).padStart(3, " ");
}

function formatRgb({ r, g, b }) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// RGB -> CMYK (simple, ink-percentage approximation).
function rgbToCmyk(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
}

// RGB -> CIELAB (sRGB, D65 white point).
function rgbToLab(r, g, b) {
  const toLinear = (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: Math.round(116 * fy - 16), a: Math.round(500 * (fx - fy)), b: Math.round(200 * (fy - fz)) };
}

function formatCmyk({ r, g, b }) {
  const { c, m, y, k } = rgbToCmyk(r, g, b);
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

function formatLab({ r, g, b }) {
  const { L, a, b: bb } = rgbToLab(r, g, b);
  return `lab(${L}, ${a}, ${bb})`;
}

// rgb plus any enabled optional color spaces, one per line.
function formatColorValues(swatch) {
  const lines = [formatRgb(swatch)];
  if (state.showCmyk) lines.push(formatCmyk(swatch));
  if (state.showLab) lines.push(formatLab(swatch));
  return lines.join("\n");
}

function buildAlignedMarkdownTable(headers, rows) {
  const escapedRows = rows.map((row) => row.map(escapeMarkdownCell));
  const escapedHeaders = headers.map(escapeMarkdownCell);
  const widths = escapedHeaders.map((header, index) => {
    const cellWidths = escapedRows.map((row) => row[index].length);
    return Math.max(header.length, ...cellWidths);
  });

  const headerLine = formatMarkdownRow(escapedHeaders, widths);
  const separatorLine = formatMarkdownRow(widths.map((width) => "-".repeat(width)), widths);
  const bodyLines = escapedRows.map((row) => formatMarkdownRow(row, widths));
  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

function formatMarkdownRow(cells, widths) {
  return `| ${cells.map((cell, index) => cell.padEnd(widths[index], " ")).join(" | ")} |`;
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex) {
  const parsed = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

window.PaletteBuilder = {
  buildHarmonyPalette,
  buildMarkdownReport,
  buildTxtReport,
  buildAcoBytes,
  buildAcoPreview,
  buildAseBytes,
  buildAsePreview,
  getSwatches: () => state.swatches.map((swatch) => ({ ...swatch })),
  extractPalette,
  nameSwatchesHeuristically
};

// Optional ?demo bootstrap — runs last so every module constant is initialized.
if (new URLSearchParams(window.location.search).has("demo")) {
  loadDemoImage();
}
