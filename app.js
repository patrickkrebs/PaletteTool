const cssColors = [
  ["black", 0, 0, 0], ["dim gray", 105, 105, 105], ["gray", 128, 128, 128],
  ["dark gray", 169, 169, 169], ["silver", 192, 192, 192], ["light gray", 211, 211, 211],
  ["white", 255, 255, 255], ["maroon", 128, 0, 0], ["dark red", 139, 0, 0],
  ["brown", 165, 42, 42], ["firebrick", 178, 34, 34], ["crimson", 220, 20, 60],
  ["red", 255, 0, 0], ["tomato", 255, 99, 71], ["coral", 255, 127, 80],
  ["orange red", 255, 69, 0], ["chocolate", 210, 105, 30], ["sienna", 160, 82, 45],
  ["saddle brown", 139, 69, 19], ["orange", 255, 165, 0], ["gold", 255, 215, 0],
  ["goldenrod", 218, 165, 32], ["dark goldenrod", 184, 134, 11], ["khaki", 240, 230, 140],
  ["olive", 128, 128, 0], ["yellow", 255, 255, 0], ["yellow green", 154, 205, 50],
  ["dark olive green", 85, 107, 47], ["olive drab", 107, 142, 35], ["lawn green", 124, 252, 0],
  ["chartreuse", 127, 255, 0], ["green yellow", 173, 255, 47], ["dark green", 0, 100, 0],
  ["green", 0, 128, 0], ["forest green", 34, 139, 34], ["lime green", 50, 205, 50],
  ["lime", 0, 255, 0], ["spring green", 0, 255, 127], ["sea green", 46, 139, 87],
  ["medium sea green", 60, 179, 113], ["dark sea green", 143, 188, 143], ["teal", 0, 128, 128],
  ["dark cyan", 0, 139, 139], ["cyan", 0, 255, 255], ["turquoise", 64, 224, 208],
  ["dark turquoise", 0, 206, 209], ["cadet blue", 95, 158, 160], ["steel blue", 70, 130, 180],
  ["sky blue", 135, 206, 235], ["deep sky blue", 0, 191, 255], ["dodger blue", 30, 144, 255],
  ["royal blue", 65, 105, 225], ["navy", 0, 0, 128], ["dark blue", 0, 0, 139],
  ["medium blue", 0, 0, 205], ["blue", 0, 0, 255], ["slate blue", 106, 90, 205],
  ["purple", 128, 0, 128], ["indigo", 75, 0, 130], ["dark violet", 148, 0, 211],
  ["blue violet", 138, 43, 226], ["magenta", 255, 0, 255], ["orchid", 218, 112, 214],
  ["plum", 221, 160, 221], ["violet", 238, 130, 238], ["hot pink", 255, 105, 180],
  ["deep pink", 255, 20, 147], ["pink", 255, 192, 203], ["light pink", 255, 182, 193],
  ["tan", 210, 180, 140], ["wheat", 245, 222, 179], ["bisque", 255, 228, 196],
  ["peach puff", 255, 218, 185], ["misty rose", 255, 228, 225], ["linen", 250, 240, 230],
  ["ivory", 255, 255, 240], ["snow", 255, 250, 250]
];

const practicalColorProfiles = [
  ["Bright blue", "Sky", 45, 158, 221],
  ["Light sky blue", "Lower sky gradient", 84, 188, 236],
  ["White", "Clouds, eyes, teeth, shirt collar", 255, 255, 255],
  ["Pale blue", "Cloud shadows", 199, 224, 238],
  ["Simpsons yellow", "Character skin, hands", 248, 226, 0],
  ["Black", "Outlines, pupils, text", 0, 0, 0],
  ["Red", "Glasses frame", 210, 0, 0],
  ["Periwinkle blue", "Hair/side tufts, eyebrows", 119, 131, 229],
  ["Maroon", "Sweater", 143, 43, 53],
  ["Dark maroon", "Sweater shadows/line areas", 106, 30, 42],
  ["Brown tan", "House wall", 174, 113, 84],
  ["Peach tan", "Side wall/trim area", 216, 160, 132],
  ["Lavender", "Roof/upper background structure", 183, 134, 196],
  ["Muted purple", "Roof shingles", 158, 111, 171],
  ["Olive gray", "Roof trim/gutters", 97, 103, 85],
  ["Dark brown", "Awning/roof on right", 133, 91, 34],
  ["Golden brown", "Window frames/fence accents", 178, 125, 38],
  ["Mustard ochre", "Wooden fence", 194, 143, 36],
  ["Aqua", "Window glass", 118, 198, 190],
  ["Teal shadow", "Window glass shadows", 88, 156, 151],
  ["Pale cyan", "Window highlights/reflections", 161, 238, 229],
  ["Dark teal", "Tall tree/shrub shadows", 37, 104, 96],
  ["Green teal", "Tall tree/shrub body", 48, 126, 113],
  ["Medium green", "Bushes", 75, 138, 73],
  ["Light green", "Bush highlights", 112, 162, 77],
  ["Salmon", "Small chair/fence object behind character", 229, 108, 88]
].map(([label, object, r, g, b]) => ({ label, object, r, g, b }));

const els = {
  imageInput: document.querySelector("#imageInput"),
  dropZone: document.querySelector("#dropZone"),
  previewCanvas: document.querySelector("#previewCanvas"),
  emptyPreview: document.querySelector("#emptyPreview"),
  paletteName: document.querySelector("#paletteName"),
  ignoreTransparency: document.querySelector("#ignoreTransparency"),
  sortByCoverage: document.querySelector("#sortByCoverage"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  addSwatchBtn: document.querySelector("#addSwatchBtn"),
  downloadTxtBtn: document.querySelector("#downloadTxtBtn"),
  downloadPltBtn: document.querySelector("#downloadPltBtn"),
  downloadAcoBtn: document.querySelector("#downloadAcoBtn"),
  downloadAseBtn: document.querySelector("#downloadAseBtn"),
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
  generatedAt: null
};

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
}

function analyzeCurrentImage() {
  if (!state.image) return;

  els.statusLine.textContent = "Analyzing image...";
  window.requestAnimationFrame(() => {
    const pixels = sampleImage(state.image, els.ignoreTransparency.checked);
    const clusters = extractDistinctColors(pixels);
    const sortedClusters = els.sortByCoverage.checked
      ? clusters.sort((a, b) => b.count - a.count)
      : clusters;

    state.generatedAt = new Date();
    const usedNames = new Set();
    state.swatches = sortedClusters.map((cluster, index) => {
      const colorContext = describePracticalColor(cluster, index, state.imageFileName);
      const baseName = sanitizeName(colorContext.objectName || colorContext.colorName || `Color_${index + 1}`);
      return {
        id: makeHarmonyId(),
        swatchName: uniqueSwatchName(baseName, index, usedNames),
        colorName: colorContext.colorName,
        objectName: colorContext.objectName,
        r: cluster.r,
        g: cluster.g,
        b: cluster.b,
        a: 255,
        coverage: cluster.count / pixels.length
      };
    });

    renderSwatches();
    els.statusLine.textContent = `${state.swatches.length} practical colors generated from ${pixels.length.toLocaleString()} sampled pixels.`;
    setReady(true);
    refreshExportPreview();
  });
}

function sampleImage(image, skipTransparent) {
  const maxSide = 420;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  const data = ctx.getImageData(0, 0, width, height).data;
  const pixels = [];
  const step = Math.max(1, Math.floor((width * height) / 70000));

  for (let i = 0; i < data.length; i += 4 * step) {
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
  const bins = buildColorBins(pixels);
  const mergeDistance = chooseMergeDistance(bins.length, pixels.length);
  const minimumCount = chooseMinimumCount(pixels.length, bins.length);
  const accentCount = chooseAccentCount(pixels.length);
  const maxColors = chooseMaximumColors(bins.length);
  const clusters = mergeClusters(bins, mergeDistance)
    .filter((cluster) => cluster.count >= minimumCount || (cluster.count >= accentCount && isAccentColor(cluster)))
    .filter((cluster) => !isAntiAliasFleck(cluster, pixels.length))
    .sort((a, b) => b.count - a.count);

  return pruneMinorVariants(clusters, pixels.length).slice(0, maxColors);
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

function chooseMaximumColors(binCount) {
  if (binCount <= 96) return 32;
  if (binCount <= 320) return 44;
  return 64;
}

function isAccentColor(cluster) {
  return getSaturation(cluster.r, cluster.g, cluster.b) > 0.38 || colorDistance(cluster, { r: 0, g: 0, b: 0 }) < 42;
}

function isAntiAliasFleck(cluster, pixelCount) {
  const coverage = cluster.count / pixelCount;
  const saturation = getSaturation(cluster.r, cluster.g, cluster.b);
  const brightness = getBrightness(cluster.r, cluster.g, cluster.b);
  return coverage < 0.0008 && saturation < 0.22 && brightness > 35 && brightness < 235;
}

function pruneMinorVariants(clusters, pixelCount) {
  const selected = [];
  const minorCoverage = 0.003;

  for (const cluster of clusters) {
    const coverage = cluster.count / pixelCount;
    const nearbyMajor = selected.find((chosen) => colorDistance(cluster, chosen) < 48);
    const sameProfileMajor = selected.find((chosen) => {
      const currentProfile = nearestPracticalProfile(cluster);
      const chosenProfile = nearestPracticalProfile(chosen);
      return currentProfile && chosenProfile && currentProfile.label === chosenProfile.label && colorDistance(cluster, chosen) < 70;
    });

    if (coverage < minorCoverage && (nearbyMajor || sameProfileMajor)) continue;
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

function nearestColorName(r, g, b) {
  let closest = cssColors[0][0];
  let closestDistance = Infinity;
  for (const [name, cr, cg, cb] of cssColors) {
    const distance = colorDistance({ r, g, b }, { r: cr, g: cg, b: cb });
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = name;
    }
  }
  return closest;
}

function describePracticalColor(cluster, index, fileName) {
  const profile = nearestPracticalProfile(cluster);
  if (profile && colorDistance(cluster, profile) <= 34) {
    return {
      colorName: profile.label,
      objectName: profile.object
    };
  }

  return {
    colorName: makeReadableColorLabel(cluster.r, cluster.g, cluster.b),
    objectName: inferObjectArea(cluster, index, fileName)
  };
}

function nearestPracticalProfile(cluster) {
  let closest = null;
  let closestDistance = Infinity;
  for (const profile of practicalColorProfiles) {
    const distance = colorDistance(cluster, profile);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = profile;
    }
  }
  return closest;
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

function inferObjectArea(cluster, index, fileName) {
  const lowerName = fileName.toLowerCase();
  const brightness = getBrightness(cluster.r, cluster.g, cluster.b);
  const saturation = getSaturation(cluster.r, cluster.g, cluster.b);
  const hue = getHue(cluster.r, cluster.g, cluster.b);
  const center = getRegionName(cluster.centerX, cluster.centerY);

  if (brightness < 36) return "Outlines, pupils, text";
  if (brightness > 242 && saturation < 0.08) return "Highlights, eyes, teeth, shirt";
  if (hue >= 20 && hue <= 55 && saturation > 0.25 && brightness > 120) return "Character skin, hands";
  if (hue >= 330 || hue <= 14) {
    if (brightness < 95) return "Mouth or dark red shadow";
    return index < 6 ? "Mouth or glasses frame" : `Red object near ${center.replace(/_/g, " ")}`;
  }
  if (hue >= 190 && hue <= 265 && saturation > 0.18) {
    if (lowerName.includes("hair")) return "Hair";
    if (brightness > 165) return "Sky, glass, or blue highlight";
    return `Blue object near ${center.replace(/_/g, " ")}`;
  }
  if (hue >= 70 && hue <= 170 && saturation > 0.22) return "Trees, shrubs, or greenery";
  if (hue >= 15 && hue <= 45 && saturation > 0.18) return "Wood, wall, fence, or warm structure";
  if (brightness < 80 && saturation < 0.2) return `Shadow near ${center.replace(/_/g, " ")}`;
  if (brightness > 205 && saturation < 0.12) return `Light area near ${center.replace(/_/g, " ")}`;
  return `${nearestColorName(cluster.r, cluster.g, cluster.b)} near ${center.replace(/_/g, " ")}`;
}

function getRegionName(x = 0.5, y = 0.5) {
  const horizontal = x < 0.34 ? "left" : x > 0.66 ? "right" : "center";
  const vertical = y < 0.34 ? "top" : y > 0.66 ? "bottom" : "middle";
  return horizontal === "center" && vertical === "middle" ? "center" : `${vertical}_${horizontal}`;
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
    colorName.value = swatch.colorName;
    objectName.value = swatch.objectName;
    rgbValue.textContent = formatRgb(swatch);
    coverage.textContent = `${(swatch.coverage * 100).toFixed(1)}%`;

    colorPicker.addEventListener("input", () => {
      const rgb = hexToRgb(colorPicker.value);
      Object.assign(swatch, rgb);
      const colorContext = describePracticalColor({ ...swatch, ...rgb }, index, state.imageFileName);
      swatch.colorName = colorContext.colorName;
      swatch.objectName = colorContext.objectName;
      colorName.value = swatch.colorName;
      objectName.value = swatch.objectName;
      rgbValue.textContent = formatRgb(swatch);
      refreshExportPreview();
    });
    swatchName.addEventListener("input", () => {
      swatch.swatchName = sanitizeName(swatchName.value);
      swatchName.value = swatch.swatchName;
      refreshExportPreview();
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
      renderSwatches();
    });

    els.swatchTable.appendChild(row);
  });

  setReady(Boolean(state.image));
  refreshExportPreview();
}

function addManualSwatch() {
  state.generatedAt ||= new Date();
  state.swatches.push({
    id: makeHarmonyId(),
    swatchName: uniqueSwatchName("manual_color", state.swatches.length),
    colorName: "gray",
    objectName: "manual_area",
    r: 128,
    g: 128,
    b: 128,
    a: 255,
    coverage: 0
  });
  renderSwatches();
  els.statusLine.textContent = `${state.swatches.length} swatches ready.`;
  refreshExportPreview();
}

function downloadTxt() {
  saveTextFile(`${sanitizeName(els.paletteName.value)}_palette.md`, buildMarkdownReport());
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
  const type = fileName.endsWith(".md") ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
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
