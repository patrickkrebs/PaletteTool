// Object names are derived per image by an in-browser object detector
// (see object-detection.js section below), not from any hard-coded table.

const els = {
  imageInput: document.querySelector("#imageInput"),
  dropZone: document.querySelector("#dropZone"),
  previewCanvas: document.querySelector("#previewCanvas"),
  previewWrap: document.querySelector(".preview-wrap"),
  overlayLayer: document.querySelector("#overlayLayer"),
  emptyPreview: document.querySelector("#emptyPreview"),
  paletteName: document.querySelector("#paletteName"),
  ignoreTransparency: document.querySelector("#ignoreTransparency"),
  sortByCoverage: document.querySelector("#sortByCoverage"),
  showCallouts: document.querySelector("#showCallouts"),
  pickMode: document.querySelector("#pickMode"),
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
  rowTemplate: document.querySelector("#swatchRowTemplate")
};

const state = {
  image: null,
  imageFileName: "",
  swatches: [],
  exportPreviewMode: "txt",
  generatedAt: null,
  lastPixels: null,
  lastDetections: null,
  analyzeToken: 0,
  previewRect: null,
  sampleCanvas: null,
  showCallouts: true,
  pickMode: false,
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
});

els.imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadImageFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-dragging");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file && file.type.startsWith("image/")) loadImageFile(file);
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

// Click the image in pick mode to sample that pixel and drop a labelled swatch.
els.previewCanvas.addEventListener("click", (event) => {
  if (!state.pickMode || !state.image || !state.previewRect) return;
  const rect = els.overlayLayer.getBoundingClientRect();
  const mapped = displayToImage(event.clientX - rect.left, event.clientY - rect.top);
  if (!mapped) return;
  const color = sampleBitmapColor(mapped.bx, mapped.by) || { r: 128, g: 128, b: 128 };
  addPickedSwatch(color, mapped.anchorX, mapped.anchorY);
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

if (new URLSearchParams(window.location.search).has("demo")) {
  loadDemoImage();
}

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
    analyzeCurrentImage();
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

function drawPreview(image) {
  const canvas = els.previewCanvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const ratio = Math.min(canvas.width / image.width, canvas.height / image.height);
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);
  const x = Math.round((canvas.width - width) / 2);
  const y = Math.round((canvas.height - height) / 2);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, width, height);

  // Remember where the image content sits inside the canvas bitmap so callout
  // markers can be mapped from image-normalized coordinates to screen pixels.
  state.previewRect = { x, y, width, height };
  renderOverlay();
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
  window.requestAnimationFrame(() => {
    const pixels = sampleImage(state.image, els.ignoreTransparency.checked);
    state.generatedAt = new Date();
    state.lastPixels = pixels;
    state.lastDetections = null;
    const analyzeToken = ++state.analyzeToken;

    // Local extraction always finds the colors (sampled from real pixels, so they
    // are exact). Then either the AI labels them (via on-image markers) or the
    // local object detector does.
    buildSwatchesFromPixels(pixels);

    renderSwatches();
    els.statusLine.textContent = `${state.swatches.length} colors captured from ${pixels.length.toLocaleString()} sampled pixels.`;
    setReady(true);
    refreshExportPreview();

    if (aiReady()) {
      labelViaMarkers(analyzeToken);
    } else {
      identifyObjects(analyzeToken);
    }
  });
}

// Cluster the sampled pixels into swatches (color label only; object names are
// filled in later by identifyObjects). Reused by the Color-detail control to
// re-cluster instantly without re-sampling or re-running the model.
function buildSwatchesFromPixels(pixels) {
  const clusters = extractDistinctColors(pixels);
  const sortedClusters = els.sortByCoverage.checked
    ? clusters.sort((a, b) => b.count - a.count)
    : clusters;

  const usedNames = new Set();
  state.swatches = sortedClusters.map((cluster, index) => {
    const colorContext = describeColor(cluster);
    const baseName = sanitizeName(colorContext.colorName || `Color_${index + 1}`);
    return {
      id: makeHarmonyId(),
      swatchName: uniqueSwatchName(baseName, index, usedNames),
      colorName: colorContext.colorName,
      objectName: colorContext.objectName,
      r: cluster.r,
      g: cluster.g,
      b: cluster.b,
      a: 255,
      coverage: cluster.count / pixels.length,
      anchorX: cluster.centerX,
      anchorY: cluster.centerY
    };
  });

  setDensestAnchors(pixels, state.swatches);
}

// Place each swatch's callout anchor on the densest patch of that color, not its
// centroid. A color spread across several regions (e.g. a body color repeated on
// four remotes) has a centroid in the empty space between them — the densest cell
// instead lands the dot on a real instance of the color.
function setDensestAnchors(pixels, swatches) {
  if (!swatches.length) return;
  const GX = 36;
  const GY = 24;
  const grids = swatches.map(() => new Int32Array(GX * GY));

  for (const pixel of pixels) {
    const swatchIndex = nearestSwatchIndex(pixel, swatches);
    if (swatchIndex < 0) continue;
    const cx = Math.min(GX - 1, Math.max(0, Math.floor(pixel.x * GX)));
    const cy = Math.min(GY - 1, Math.max(0, Math.floor(pixel.y * GY)));
    grids[swatchIndex][cy * GX + cx] += 1;
  }

  swatches.forEach((swatch, index) => {
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
}

// Re-assign every sampled pixel to its nearest swatch color and recompute each
// swatch's coverage. Called whenever the palette changes (a color is added,
// re-targeted by dragging its dot, recolored, or removed) so the percentages
// reflect the colors the user has identified.
function recomputeCoverage() {
  const pixels = state.lastPixels;
  if (!pixels || !pixels.length || !state.swatches.length) return;
  const counts = new Array(state.swatches.length).fill(0);
  for (const pixel of pixels) {
    const swatchIndex = nearestSwatchIndex(pixel, state.swatches);
    if (swatchIndex >= 0) counts[swatchIndex] += 1;
  }
  state.swatches.forEach((swatch, index) => {
    swatch.coverage = counts[index] / pixels.length;
  });
}

// Re-cluster with the current Color-detail setting and re-apply cached object
// names — no re-sampling, no model call. Used by the Color-detail slider.
function reExtractColors() {
  if (!state.lastPixels) return;
  buildSwatchesFromPixels(state.lastPixels);
  if (state.lastDetections) assignObjectsToSwatches(state.lastDetections);
  renderSwatches();
  els.statusLine.textContent = `${state.swatches.length} colors captured from ${state.lastPixels.length.toLocaleString()} sampled pixels.`;
  refreshExportPreview();
}

function sampleImage(image, skipTransparent) {
  // Use the image at (effectively) native resolution so no small color is lost
  // to downscaling. We only scale down if an image is enormous, to bound memory
  // — and even then we keep a large budget. No smoothing, so colors stay exact.
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
  const pixels = [];

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (skipTransparent && a < 24) continue;
    pixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
      a,
      x: ((i / 4) % width) / width,
      y: Math.floor(i / 4 / width) / height
    });
  }

  return pixels.length ? pixels : [{ r: 255, g: 255, b: 255, a: 255, x: 0.5, y: 0.5 }];
}

function extractDistinctColors(pixels) {
  // 0 = fewer colors (merge aggressively), 1 = capture more distinct colors.
  const detail = getColorDetail();
  const bins = buildColorBins(pixels);

  // Higher detail => smaller merge distance, lower count thresholds, higher cap,
  // and less variant pruning, so genuinely distinct flat colors aren't collapsed.
  const mergeDistance = Math.max(6, Math.round(chooseMergeDistance(bins.length, pixels.length) * lerp(1.6, 0.45, detail)));
  const minimumCount = Math.max(1, Math.round(chooseMinimumCount(pixels.length, bins.length) * lerp(1.6, 0.4, detail)));
  const accentCount = chooseAccentCount(pixels.length);
  const vividAccentCount = chooseVividAccentCount(pixels.length);
  const distinctCount = Math.max(3, Math.ceil(pixels.length * 0.0003));
  // Palette size: an explicit user cap if set, otherwise derived from detail.
  // This is independent of how aggressively similar colors merge (detail).
  const userMax = getMaxColors();
  const autoCap = Math.max(8, Math.round(lerp(14, 120, detail)));
  const maxColors = Math.min(bins.length, userMax || autoCap);
  const minorCoverage = lerp(0.006, 0, detail);

  const merged = mergeClusters(bins, mergeDistance)
    .filter((cluster) => !isAntiAliasFleck(cluster, pixels.length))
    .sort((a, b) => b.count - a.count);

  // Greedy selection (largest first) so the "distinct" test compares each smaller
  // color against the colors already kept. Goal: keep every genuinely different
  // color, while still folding near-duplicate anti-aliasing into its parent.
  const kept = [];
  for (const cluster of merged) {
    const major = cluster.count >= minimumCount;
    const accent = cluster.count >= accentCount && isAccentColor(cluster);
    // Strongly saturated marks (e.g. LED buttons) survive at a very low count.
    const vivid = cluster.count >= vividAccentCount && isVividAccent(cluster);
    // A modestly sized color that is far from every kept color is a real, distinct
    // shade (not a slight variation) — keep it even if muted.
    const distinct =
      cluster.count >= distinctCount && kept.every((k) => colorDistance(cluster, k) > 50);
    if (major || accent || vivid || distinct) kept.push(cluster);
  }

  return pruneMinorVariants(kept, pixels.length, minorCoverage).slice(0, maxColors);
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

function buildColorBins(pixels) {
  const bins = new Map();
  for (const pixel of pixels) {
    const key = `${pixel.r >> 3},${pixel.g >> 3},${pixel.b >> 3}`;
    const bin = bins.get(key) || makeCluster(pixel);
    addPixelToCluster(bin, pixel);
    bins.set(key, bin);
  }

  return [...bins.values()].map(finalizeCluster);
}

function chooseMergeDistance(binCount, pixelCount) {
  const complexity = binCount / Math.max(1, pixelCount);
  if (binCount <= 32) return 8;
  if (binCount <= 96) return 14;
  if (binCount <= 240) return 18;
  if (complexity < 0.08) return 21;
  if (complexity < 0.18) return 24;
  return 28;
}

function chooseMinimumCount(pixelCount, binCount) {
  if (binCount <= 64) return Math.max(2, Math.ceil(pixelCount * 0.00035));
  return Math.max(4, Math.ceil(pixelCount * 0.0012));
}

function chooseAccentCount(pixelCount) {
  return Math.max(8, Math.ceil(pixelCount * 0.00045));
}

function chooseVividAccentCount(pixelCount) {
  // Low floor so tiny-but-distinct saturated marks (e.g. LED lights) survive.
  return Math.max(3, Math.ceil(pixelCount * 0.00003));
}

function chooseMaximumColors(binCount) {
  if (binCount <= 96) return 32;
  if (binCount <= 320) return 44;
  return 64;
}

function isAccentColor(cluster) {
  return getSaturation(cluster.r, cluster.g, cluster.b) > 0.38 || colorDistance(cluster, { r: 0, g: 0, b: 0 }) < 42;
}

function isVividAccent(cluster) {
  // Strong saturation marks an intentional color (LED, accent), as opposed to
  // anti-aliasing blends, which sit between two colors at low saturation.
  return getSaturation(cluster.r, cluster.g, cluster.b) > 0.45;
}

function isAntiAliasFleck(cluster, pixelCount) {
  const coverage = cluster.count / pixelCount;
  const saturation = getSaturation(cluster.r, cluster.g, cluster.b);
  const brightness = getBrightness(cluster.r, cluster.g, cluster.b);
  return coverage < 0.0008 && saturation < 0.22 && brightness > 35 && brightness < 235;
}

function pruneMinorVariants(clusters, pixelCount, minorCoverage = 0.003) {
  const selected = [];

  for (const cluster of clusters) {
    const coverage = cluster.count / pixelCount;
    const nearbyMajor = selected.find((chosen) => colorDistance(cluster, chosen) < 48);

    if (coverage < minorCoverage && nearbyMajor) continue;
    selected.push(cluster);
  }

  return selected;
}

function makeCluster(seed) {
  return {
    r: seed.r,
    g: seed.g,
    b: seed.b,
    sumR: 0,
    sumG: 0,
    sumB: 0,
    sumX: 0,
    sumY: 0,
    minX: 1,
    minY: 1,
    maxX: 0,
    maxY: 0,
    count: 0
  };
}

function addPixelToCluster(cluster, pixel) {
  cluster.sumR += pixel.r;
  cluster.sumG += pixel.g;
  cluster.sumB += pixel.b;
  cluster.sumX += pixel.x;
  cluster.sumY += pixel.y;
  cluster.minX = Math.min(cluster.minX, pixel.x);
  cluster.minY = Math.min(cluster.minY, pixel.y);
  cluster.maxX = Math.max(cluster.maxX, pixel.x);
  cluster.maxY = Math.max(cluster.maxY, pixel.y);
  cluster.count += 1;
}

function finalizeCluster(cluster) {
  return {
    ...cluster,
    r: Math.round(cluster.sumR / cluster.count),
    g: Math.round(cluster.sumG / cluster.count),
    b: Math.round(cluster.sumB / cluster.count),
    centerX: cluster.sumX / cluster.count,
    centerY: cluster.sumY / cluster.count
  };
}

function mergeClusters(clusters, mergeDistance) {
  const sorted = [...clusters].sort((a, b) => b.count - a.count);
  const merged = [];

  for (const cluster of sorted) {
    const target = merged.find((existing) => colorDistance(cluster, existing) <= mergeDistance);
    if (target) {
      const total = target.count + cluster.count;
      target.r = Math.round((target.r * target.count + cluster.r * cluster.count) / total);
      target.g = Math.round((target.g * target.count + cluster.g * cluster.count) / total);
      target.b = Math.round((target.b * target.count + cluster.b * cluster.count) / total);
      target.centerX = (target.centerX * target.count + cluster.centerX * cluster.count) / total;
      target.centerY = (target.centerY * target.count + cluster.centerY * cluster.count) / total;
      target.minX = Math.min(target.minX, cluster.minX);
      target.minY = Math.min(target.minY, cluster.minY);
      target.maxX = Math.max(target.maxX, cluster.maxX);
      target.maxY = Math.max(target.maxY, cluster.maxY);
      target.count = total;
    } else {
      merged.push({ ...cluster });
    }
  }

  return merged;
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
}

function describeColor(cluster) {
  // Color label comes from the pixels. The "associated object" is left empty
  // here and filled in afterwards by the object detector (identifyObjects).
  return {
    colorName: makeReadableColorLabel(cluster.r, cluster.g, cluster.b),
    objectName: ""
  };
}

// ---------------------------------------------------------------------------
// In-browser object detection (Transformers.js, loaded lazily from a CDN).
//
// The image is processed entirely on-device — only the model weights download
// once, then the browser caches them. After detection, each color swatch is
// named after the real-world object most of its pixels belong to (a per-pixel
// majority vote). Colors that don't sit inside any detected object keep their
// color-only label. NOTE: these models are trained on photographs, so on
// stylized/illustrated art they may recognize little or nothing — in which
// case swatches gracefully stay color-named rather than mislabeled.
// ---------------------------------------------------------------------------

const OBJECT_DETECTION = {
  libUrl: "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1",
  model: "Xenova/detr-resnet-50",
  scoreThreshold: 0.35, // minimum confidence to trust a detected box
  assignThreshold: 0.2 // a swatch must have >=20% of its pixels inside an object to adopt its name
};

let detectorPromise = null;

async function getDetector() {
  if (!detectorPromise) {
    const { pipeline, env } = await import(OBJECT_DETECTION.libUrl);
    env.allowLocalModels = false; // weights come from the Hugging Face hub CDN
    detectorPromise = pipeline("object-detection", OBJECT_DETECTION.model);
  }
  return detectorPromise;
}

async function identifyObjects(analyzeToken) {
  if (!state.image || !state.swatches.length) return;

  const baseStatus = els.statusLine.textContent;
  els.statusLine.textContent = `${baseStatus} Identifying objects…`;

  let detections;
  try {
    const detector = await getDetector();
    if (analyzeToken !== state.analyzeToken) return; // a newer analysis superseded this run
    const raw = await detector(imageToDataUrl(state.image), {
      threshold: OBJECT_DETECTION.scoreThreshold,
      percentage: true // box coordinates as 0..1 fractions, matching our sampled pixel coords
    });
    detections = Array.isArray(raw) ? raw : [];
  } catch (error) {
    // Model couldn't load (e.g. offline). Still apply color-based roles
    // (background, line art, indicator lights) — just without object nouns.
    if (analyzeToken !== state.analyzeToken) return;
    state.lastDetections = [];
    const fallbackNamed = assignObjectsToSwatches([]);
    renderSwatches();
    refreshExportPreview();
    els.statusLine.textContent = fallbackNamed
      ? `${baseStatus} Object model unavailable — named ${fallbackNamed} by color role.`
      : `${baseStatus} Object recognition unavailable — color labels only.`;
    return;
  }

  if (analyzeToken !== state.analyzeToken) return;

  state.lastDetections = detections;
  const named = assignObjectsToSwatches(detections);
  if (analyzeToken !== state.analyzeToken) return;

  renderSwatches();
  refreshExportPreview();
  if (named) {
    els.statusLine.textContent = `${baseStatus} Named ${named} swatch${named === 1 ? "" : "es"} (${detections.length} object${detections.length === 1 ? "" : "s"} detected).`;
  } else {
    els.statusLine.textContent = `${baseStatus} No objects recognized — color labels only.`;
  }
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
  if (!state.image || !state.swatches.length) return;
  const providerId = state.aiProvider;
  const provider = aiProvider();
  const key = (state.aiKeys[providerId] || "").trim();
  if (!key) {
    els.statusLine.textContent = `Add your ${provider.keyLabel} to label with AI.`;
    return;
  }

  els.statusLine.textContent = "Labeling with AI…";
  if (els.aiLabelBtn) els.aiLabelBtn.disabled = true;

  const model = (state.aiModels[providerId] || "").trim() || provider.defaultModel;
  const annotated = buildAnnotatedImageDataUrl(state.swatches);
  const prompt = buildMarkerLabelingPrompt(state.swatches.length);

  try {
    let labels = await requestAiLabels(providerId, provider, key, model, prompt, annotated);
    if (token !== state.analyzeToken) return;
    // A response can occasionally come back unparseable — retry once.
    if (!labels.length) {
      els.statusLine.textContent = "Labeling with AI… (retrying)";
      labels = await requestAiLabels(providerId, provider, key, model, prompt, annotated);
      if (token !== state.analyzeToken) return;
    }

    const named = applyAiLabels(labels);
    renderSwatches();
    refreshExportPreview();
    els.statusLine.textContent = named
      ? `AI labeled ${named} color${named === 1 ? "" : "s"}.`
      : "AI returned no usable labels — click Label with AI to try again.";
  } catch (error) {
    if (token !== state.analyzeToken) return;
    els.statusLine.textContent = `AI labeling failed: ${error.message}. Color labels kept.`;
  } finally {
    refreshAiLabelButton();
  }
}

// One request → parsed [{i, object}] labels. Throws on HTTP error.
async function requestAiLabels(providerId, provider, key, model, prompt, dataUrl) {
  const request = buildAiRequest(providerId, key, model, prompt, dataUrl);
  const response = await fetch(provider.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body)
  });
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
function buildAnnotatedImageDataUrl(swatches) {
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

  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  swatches.forEach((swatch, index) => {
    if (!Number.isFinite(swatch.anchorX) || !Number.isFinite(swatch.anchorY)) return;
    const x = swatch.anchorX * width;
    const y = swatch.anchorY * height;
    const radius = 12;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111111";
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.fillText(String(index), x, y);
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

function buildMarkerLabelingPrompt(count) {
  return [
    `The attached image has ${count} numbered markers (white circles, numbered 0 to ${count - 1}).`,
    "Each marker is placed on a distinct color used in the artwork.",
    "For EACH marker number, identify the object or part of the artwork at that exact marked spot",
    '(e.g. "hair", "hair shadow", "glasses frame", "sky", "cloud", "tree shadow", "skin", "shirt", "outline").',
    "Decide from the MARKED LOCATION in the image — not from the color alone. Be specific, and distinguish highlight / midtone / shadow of the same material.",
    "Ignore any text, UI, watermarks, or logos baked into the image.",
    "",
    "Return ONLY a JSON array with one entry per marker, no prose or code fences:",
    '[{"i":0,"object":"hair"},{"i":1,"object":"sky"}]'
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
      .filter((entry) => entry && Number.isInteger(entry.i) && entry.object)
      .map((entry) => ({ i: entry.i, object: String(entry.object).trim() }));
  } catch (error) {
    return [];
  }
}

function applyAiLabels(labels) {
  if (!labels.length) return 0;
  const usedNames = new Set(state.swatches.map((swatch) => swatch.swatchName));
  let named = 0;
  for (const { i, object } of labels) {
    const swatch = state.swatches[i];
    if (!swatch || !object) continue;
    swatch.objectName = titleCase(object);
    swatch.swatchName = uniqueSwatchName(sanitizeName(swatch.objectName), i, usedNames);
    named += 1;
  }
  return named;
}

function assignObjectsToSwatches(detections) {
  const pixels = state.lastPixels;
  const swatches = state.swatches;
  if (!pixels || !pixels.length || !swatches.length) return 0;

  // Which detected object (if any) holds most of each swatch's pixels.
  const votes = voteObjectNouns(detections, pixels, swatches);
  // Resolve a differentiated role name per swatch (background, outlines, body,
  // buttons, indicator light, hand, ...) by combining detection with color role.
  const names = resolveSwatchRoles(swatches, votes);

  const usedNames = new Set(swatches.map((swatch) => swatch.swatchName));
  let named = 0;
  swatches.forEach((swatch, index) => {
    const object = names[index];
    if (!object) return;
    swatch.objectName = object;
    swatch.swatchName = uniqueSwatchName(sanitizeName(object), index, usedNames);
    named += 1;
  });
  return named;
}

// For each swatch, find the detected object whose box contains most of that
// swatch's pixels. Returns [{ noun, frac }] aligned to swatches (noun is null
// when no object covers at least assignThreshold of the swatch's pixels).
function voteObjectNouns(detections, pixels, swatches) {
  const boxes = (detections || [])
    .map((detection) => {
      const box = detection.box || {};
      return {
        label: detection.label,
        xmin: box.xmin,
        ymin: box.ymin,
        xmax: box.xmax,
        ymax: box.ymax,
        area: Math.max(0, box.xmax - box.xmin) * Math.max(0, box.ymax - box.ymin)
      };
    })
    .filter((box) => Number.isFinite(box.area) && box.area > 0)
    .sort((a, b) => a.area - b.area); // smallest first => most specific object wins

  const tally = swatches.map(() => ({ total: 0, counts: new Map() }));
  for (const pixel of pixels) {
    const swatchIndex = nearestSwatchIndex(pixel, swatches);
    if (swatchIndex < 0) continue;
    const record = tally[swatchIndex];
    record.total += 1;
    if (!boxes.length) continue;
    const box = boxes.find(
      (candidate) =>
        pixel.x >= candidate.xmin &&
        pixel.x <= candidate.xmax &&
        pixel.y >= candidate.ymin &&
        pixel.y <= candidate.ymax
    );
    if (!box) continue;
    record.counts.set(box.label, (record.counts.get(box.label) || 0) + 1);
  }

  return tally.map((record) => {
    let noun = null;
    let best = 0;
    for (const [label, count] of record.counts) {
      if (count > best) {
        best = count;
        noun = label;
      }
    }
    const frac = record.total ? best / record.total : 0;
    return { noun: frac >= OBJECT_DETECTION.assignThreshold ? noun : null, frac };
  });
}

// Differentiated naming: detection supplies the object noun ("remote", "person"),
// while color/coverage cues separate background, line art, body vs. buttons, and
// small saturated accents (indicator lights). Returns a name per swatch ("" = keep
// color-only label).
function resolveSwatchRoles(swatches, votes) {
  const stats = swatches.map((swatch) => ({
    brightness: getBrightness(swatch.r, swatch.g, swatch.b),
    saturation: getSaturation(swatch.r, swatch.g, swatch.b),
    hue: getHue(swatch.r, swatch.g, swatch.b),
    coverage: swatch.coverage || 0
  }));

  // Background: the most-covered broad, desaturated color.
  let bgIndex = -1;
  let bgCoverage = 0;
  stats.forEach((stat, i) => {
    if (stat.saturation < 0.18 && stat.coverage > 0.25 && stat.coverage > bgCoverage) {
      bgCoverage = stat.coverage;
      bgIndex = i;
    }
  });

  // Outlines / line art: the darkest color, if it is clearly dark.
  let darkIndex = -1;
  let darkest = Infinity;
  stats.forEach((stat, i) => {
    if (stat.brightness < darkest) {
      darkest = stat.brightness;
      darkIndex = i;
    }
  });
  if (darkest >= 55) darkIndex = -1;

  // Rank swatches sharing a detected noun by coverage, so the biggest area of an
  // object reads as its "body" and the rest as "buttons / detail".
  const nounGroups = {};
  votes.forEach((vote, i) => {
    if (i === bgIndex || i === darkIndex || !vote.noun) return;
    (nounGroups[vote.noun] = nounGroups[vote.noun] || []).push(i);
  });
  Object.values(nounGroups).forEach((group) => group.sort((a, b) => stats[b].coverage - stats[a].coverage));

  return swatches.map((swatch, i) => {
    if (i === bgIndex) return "Background";
    if (i === darkIndex) return "Outlines / line art";

    const vote = votes[i];
    const { hue, saturation, brightness, coverage } = stats[i];

    if (vote.noun === "person" || (hue >= 20 && hue <= 55 && saturation > 0.35 && brightness > 120)) {
      return "Hand / skin";
    }

    // Small, vivid blobs read as indicator lights — checked before the object
    // branch so a red/green/blue light on the remote isn't folded into "buttons".
    if (saturation > 0.5 && coverage < 0.05) {
      return `${titleCase(simpleHueName(hue))} indicator light`;
    }

    if (vote.noun) {
      const noun = titleCase(vote.noun);
      const group = nounGroups[vote.noun];
      return group && group[0] === i ? `${noun} body` : `${noun} buttons / detail`;
    }

    return ""; // nothing confident — keep the plain color label
  });
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
    rgbValue.textContent = formatRgb(swatch);
    coverage.textContent = `${(swatch.coverage * 100).toFixed(1)}%`;

    colorPicker.addEventListener("input", () => {
      const rgb = hexToRgb(colorPicker.value);
      Object.assign(swatch, rgb);
      // Re-derive the color label from the new RGB; keep the object name the
      // user/detector assigned, since object identity doesn't change with a hue tweak.
      swatch.colorName = makeReadableColorLabel(rgb.r, rgb.g, rgb.b);
      colorName.value = swatch.colorName;
      rgbValue.textContent = formatRgb(swatch);
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

    callout.appendChild(grip);
    callout.appendChild(input);
    layer.appendChild(callout);

    attachCalloutDrag(grip, callout, line, marker);
  }
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
  state.lastDetections = null;
  state.analyzeToken += 1; // cancel any in-flight analysis / labeling
  renderSwatches();
  refreshExportPreview();
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
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || !Array.isArray(data.swatches)) {
      throw new Error("not a PaletteBuilder project file");
    }
    await loadProject(data);
  } catch (error) {
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
  state.lastDetections = null;
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
  const rows = state.swatches.map((swatch) => [
    formatRgb(swatch),
    swatch.colorName,
    swatch.objectName,
    sanitizeName(swatch.swatchName)
  ]);

  return [
    `# ${els.paletteName.value || "Generated_Palette"} Palette`,
    "",
    `- Source image: ${state.imageFileName || "unknown"}`,
    `- Generated: ${(state.generatedAt || new Date()).toLocaleString()}`,
    `- Swatches: ${state.swatches.length}`,
    "",
    buildAlignedMarkdownTable(["RGB", "Color label", "Associated object", "Harmony swatch"], rows)
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

function buildHarmonyPalette() {
  const lines = ["ToonBoomAnimationInc PaletteFile 2"];
  for (const swatch of state.swatches) {
    const name = sanitizeName(swatch.swatchName || swatch.objectName || swatch.colorName || "color");
    lines.push(
      `Solid    ${name.padEnd(26, " ")} ${swatch.id} ${padColor(swatch.r)} ${padColor(swatch.g)} ${padColor(swatch.b)} ${padColor(swatch.a)}`
    );
  }
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

  // Version 2 block (adds names).
  push16(2);
  push16(swatches.length);
  for (const swatch of swatches) {
    writeColor(swatch);
    const name = acoSwatchName(swatch);
    push32(name.length + 1); // character count, including the null terminator
    for (let i = 0; i < name.length; i += 1) push16(name.charCodeAt(i)); // UTF-16BE
    push16(0); // null terminator
  }

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
  const nameWidth = Math.max(4, ...state.swatches.map((swatch) => acoSwatchName(swatch).length));
  const rows = state.swatches.map((swatch, index) => {
    const num = String(index + 1).padStart(3, " ");
    const name = acoSwatchName(swatch).padEnd(nameWidth, " ");
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

  for (const swatch of swatches) {
    const name = acoSwatchName(swatch);
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
  }

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
  const nameWidth = Math.max(4, ...state.swatches.map((swatch) => acoSwatchName(swatch).length));
  const rows = state.swatches.map((swatch, index) => {
    const num = String(index + 1).padStart(3, " ");
    const name = acoSwatchName(swatch).padEnd(nameWidth, " ");
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
  getSwatches: () => state.swatches.map((swatch) => ({ ...swatch }))
};
