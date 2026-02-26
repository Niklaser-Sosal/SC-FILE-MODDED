const $ = (selector) => document.querySelector(selector);

const I18N = {
  ru: {
    title: "Осмотр карты",
    subtitle: "Просмотр результата сборки слоёв в отдельном окне",
    btn_download: "Скачать",
    btn_save_downloads: "Сохранить в Загрузки",
    btn_save_zip: "Сохранить в ZIP",
    file_name: "Название файла",
    pixels: "Кол-во пикселей",
    size: "Размер",
    loading_meta: "Загрузка данных карты…",
    copied: "Файл сохранён в Загрузки",
    copy_failed: "Не удалось сохранить в Загрузки",
    open_failed: "Не удалось открыть карту",
    fit: "Fit",
    system_ready: "Статус системы: готов",
    tiles_loading: "Загрузка карты кусками…",
    tiles_ready: "Карта загружена",
    tiles_progress: "Кэш плиток: {done}/{total} ({percent}%)",
  },
  en: {
    title: "Map Inspector",
    subtitle: "Inspect map-merge output in a separate window",
    btn_download: "Download",
    btn_save_downloads: "Save to Downloads",
    btn_save_zip: "Save as ZIP",
    file_name: "File name",
    pixels: "Pixels",
    size: "Size",
    loading_meta: "Loading map data…",
    copied: "File saved to Downloads",
    copy_failed: "Failed to save to Downloads",
    open_failed: "Failed to open map",
    fit: "Fit",
    system_ready: "System status: ready",
    tiles_loading: "Loading map tiles…",
    tiles_ready: "Map loaded",
    tiles_progress: "Tile cache: {done}/{total} ({percent}%)",
  },
};

const state = {
  lang: "ru",
  taskId: "",
  relPath: "",
  meta: null,
  mapBlurEnabled: true,
  width: 0,
  height: 0,
  scale: 1,
  fitScale: 1,
  minScale: 0.03,
  maxScale: 8,
  tx: 0,
  ty: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  rafPending: false,
  needsMiniMapUpdate: false,
  tileSize: 2048,
  tileCols: 0,
  tileRows: 0,
  tileTemplate: "",
  tileElements: new Map(),
  tileTouch: new Map(),
  tileDomLimit: 32,
  tileRequested: new Set(),
  tileLoaded: new Set(),
  tileFailed: new Set(),
  prefetchQueue: [],
  prefetchActive: 0,
  prefetchCursor: 0,
  prefetchTimer: 0,
  progressRaf: 0,
};

function normalizeLang(value) {
  return String(value || "").toLowerCase() === "en" ? "en" : "ru";
}

function t(key) {
  return I18N[state.lang]?.[key] ?? I18N.ru[key] ?? key;
}

function setStatus(message) {
  const element = $("#status");
  if (element) element.textContent = String(message || "");
}

function setTileProgress() {
  const total = Math.max(0, Number(state.tileCols || 0) * Number(state.tileRows || 0));
  const done = Math.max(0, state.tileLoaded.size + state.tileFailed.size);
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  if ($("#tileProgressBar")) $("#tileProgressBar").style.width = `${percent}%`;
  if ($("#tileProgressText")) {
    $("#tileProgressText").textContent = t("tiles_progress")
      .replace("{done}", String(done))
      .replace("{total}", String(total))
      .replace("{percent}", String(percent));
  }
}

function queueTileProgress() {
  if (state.progressRaf) return;
  state.progressRaf = requestAnimationFrame(() => {
    state.progressRaf = 0;
    setTileProgress();
  });
}

function applyI18n() {
  document.documentElement.lang = state.lang;
  if ($("#title")) $("#title").textContent = t("title");
  if ($("#subtitle")) $("#subtitle").textContent = t("subtitle");
  if ($("#btnDownload")) $("#btnDownload").textContent = t("btn_download");
  if ($("#btnSaveDownloads")) $("#btnSaveDownloads").textContent = t("btn_save_downloads");
  if ($("#btnZip")) $("#btnZip").textContent = t("btn_save_zip");
  if ($("#metaFileLabel")) $("#metaFileLabel").textContent = t("file_name");
  if ($("#metaPixelsLabel")) $("#metaPixelsLabel").textContent = t("pixels");
  if ($("#metaSizeLabel")) $("#metaSizeLabel").textContent = t("size");
  if ($("#btnFit")) $("#btnFit").textContent = t("fit");
  if ($("#footerLeft")) $("#footerLeft").textContent = t("system_ready");
  setTileProgress();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatBytes(bytes) {
  const number = Number(bytes || 0);
  if (!Number.isFinite(number) || number <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = number;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function encodeRelPath(relPath) {
  return String(relPath || "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function applyTheme(theme) {
  if (!theme || typeof theme !== "object") return;
  const root = document.documentElement;
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.bg) root.style.setProperty("--bg", theme.bg);
  if (theme.panel) root.style.setProperty("--panel", theme.panel);
  if (theme.panel2) root.style.setProperty("--panel2", theme.panel2);
  if (theme.text) root.style.setProperty("--text", theme.text);
  if (theme.muted_text) root.style.setProperty("--muted", theme.muted_text);
  if (theme.accent) root.style.setProperty("--border", `${theme.accent}55`);
}

async function apiGet(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function apiPost(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function formatError(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || String(error);
  if (typeof error === "object" && "detail" in error && typeof error.detail === "string") return error.detail;
  try {
    return JSON.stringify(error);
  } catch (_) {
    return String(error);
  }
}

function tileKey(x, y) {
  return `${x}:${y}`;
}

function tileUrl(x, y) {
  if (state.tileTemplate) return state.tileTemplate.replace("{x}", String(x)).replace("{y}", String(y));
  const encoded = encodeRelPath(state.relPath);
  return `/api/tasks/${encodeURIComponent(state.taskId)}/map-view/${encoded}/tile/${x}/${y}.webp`;
}

function markTileDone(key, ok) {
  if (ok) state.tileLoaded.add(key);
  else state.tileFailed.add(key);
  queueTileProgress();
  const total = Math.max(0, state.tileCols * state.tileRows);
  const done = state.tileLoaded.size + state.tileFailed.size;
  if (total > 0 && done >= total) setStatus(t("tiles_ready"));
}

function clearTileLayers() {
  const tileLayer = $("#tileLayer");
  if (tileLayer) tileLayer.innerHTML = "";
  state.tileElements.clear();
  state.tileTouch.clear();
  state.tileRequested.clear();
  state.tileLoaded.clear();
  state.tileFailed.clear();
  state.prefetchQueue = [];
  state.prefetchCursor = 0;
  state.prefetchActive = 0;
  if (state.prefetchTimer) {
    clearTimeout(state.prefetchTimer);
    state.prefetchTimer = 0;
  }
  setTileProgress();
}

function ensureTileElement(x, y) {
  if (x < 0 || y < 0 || x >= state.tileCols || y >= state.tileRows) return;
  const key = tileKey(x, y);
  const layer = $("#tileLayer");
  if (!layer) return;

  if (state.tileElements.has(key)) {
    state.tileTouch.set(key, performance.now());
    return;
  }

  const width = x === state.tileCols - 1 ? state.width - x * state.tileSize : state.tileSize;
  const height = y === state.tileRows - 1 ? state.height - y * state.tileSize : state.tileSize;
  if (width <= 0 || height <= 0) return;

  const image = document.createElement("img");
  image.className = "map-tile";
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "high";
  image.alt = "";
  image.style.left = `${x * state.tileSize}px`;
  image.style.top = `${y * state.tileSize}px`;
  image.style.width = `${width}px`;
  image.style.height = `${height}px`;
  image.onload = () => markTileDone(key, true);
  image.onerror = () => markTileDone(key, false);

  state.tileRequested.add(key);
  state.tileTouch.set(key, performance.now());
  image.src = tileUrl(x, y);
  state.tileElements.set(key, image);
  layer.appendChild(image);
}

function updateVisibleTiles() {
  const viewport = $("#viewport");
  if (!viewport || !state.width || !state.height || !state.tileCols || !state.tileRows) return;

  const worldLeft = clamp(Math.floor((-state.tx) / state.scale), 0, state.width);
  const worldTop = clamp(Math.floor((-state.ty) / state.scale), 0, state.height);
  const worldRight = clamp(Math.ceil((viewport.clientWidth - state.tx) / state.scale), 0, state.width);
  const worldBottom = clamp(Math.ceil((viewport.clientHeight - state.ty) / state.scale), 0, state.height);

  const margin = 2;
  const x0 = clamp(Math.floor(worldLeft / state.tileSize) - margin, 0, state.tileCols - 1);
  const y0 = clamp(Math.floor(worldTop / state.tileSize) - margin, 0, state.tileRows - 1);
  const x1 = clamp(Math.floor(worldRight / state.tileSize) + margin, 0, state.tileCols - 1);
  const y1 = clamp(Math.floor(worldBottom / state.tileSize) + margin, 0, state.tileRows - 1);

  const wanted = new Set();
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const key = tileKey(x, y);
      wanted.add(key);
      ensureTileElement(x, y);
    }
  }

  const touchNow = performance.now();
  for (const key of wanted) state.tileTouch.set(key, touchNow);

  if (state.tileElements.size <= state.tileDomLimit) return;

  const removable = [];
  for (const [key, element] of state.tileElements.entries()) {
    if (wanted.has(key)) continue;
    removable.push([key, element, Number(state.tileTouch.get(key) || 0)]);
  }
  removable.sort((a, b) => a[2] - b[2]);

  let idx = 0;
  while (state.tileElements.size > state.tileDomLimit && idx < removable.length) {
    const [key, element] = removable[idx];
    idx += 1;
    element.remove();
    state.tileElements.delete(key);
    state.tileTouch.delete(key);
  }
}

function pumpPrefetchQueue() {
  const concurrency = 1;
  while (state.prefetchActive < concurrency && state.prefetchCursor < state.prefetchQueue.length) {
    const next = state.prefetchQueue[state.prefetchCursor];
    state.prefetchCursor += 1;
    if (!next) continue;

    const [x, y] = next;
    const key = tileKey(x, y);
    if (state.tileLoaded.has(key) || state.tileFailed.has(key) || state.tileRequested.has(key)) continue;

    state.prefetchActive += 1;
    state.tileRequested.add(key);
    const probe = new Image();
    probe.decoding = "async";
    probe.loading = "lazy";
    probe.fetchPriority = "low";
    probe.onload = () => {
      state.prefetchActive -= 1;
      markTileDone(key, true);
      pumpPrefetchQueue();
    };
    probe.onerror = () => {
      state.prefetchActive -= 1;
      markTileDone(key, false);
      pumpPrefetchQueue();
    };
    probe.src = tileUrl(x, y);
  }
}

function startTilePrefetch(centerX, centerY) {
  if (!state.tileCols || !state.tileRows) return;

  const cx = Number.isFinite(centerX) ? centerX : (state.tileCols - 1) * 0.5;
  const cy = Number.isFinite(centerY) ? centerY : (state.tileRows - 1) * 0.5;
  const queue = [];

  for (let y = 0; y < state.tileRows; y += 1) {
    for (let x = 0; x < state.tileCols; x += 1) {
      queue.push([x, y]);
    }
  }

  queue.sort((a, b) => {
    const da = (a[0] - cx) ** 2 + (a[1] - cy) ** 2;
    const db = (b[0] - cx) ** 2 + (b[1] - cy) ** 2;
    return da - db;
  });

  state.prefetchQueue = queue.slice(0, 180);
  state.prefetchCursor = 0;
  state.prefetchActive = 0;
  pumpPrefetchQueue();
}

function schedulePrefetchAroundViewport() {
  const viewport = $("#viewport");
  if (!viewport || !state.width || !state.height || !state.tileCols || !state.tileRows) return;
  if (state.prefetchTimer) clearTimeout(state.prefetchTimer);
  state.prefetchTimer = setTimeout(() => {
    state.prefetchTimer = 0;
    const worldCenterX = (viewport.clientWidth * 0.5 - state.tx) / state.scale;
    const worldCenterY = (viewport.clientHeight * 0.5 - state.ty) / state.scale;
    const tileCenterX = clamp(Math.floor(worldCenterX / state.tileSize), 0, state.tileCols - 1);
    const tileCenterY = clamp(Math.floor(worldCenterY / state.tileSize), 0, state.tileRows - 1);
    startTilePrefetch(tileCenterX, tileCenterY);
  }, 950);
}

function lodStrength() {
  if (!state.mapBlurEnabled || !state.fitScale || state.fitScale <= 0) return 0;
  const threshold = state.fitScale * 1.06;
  if (state.scale >= threshold) return 0;
  const minScale = Math.max(state.fitScale * 0.45, state.minScale);
  const denom = Math.max(0.00001, threshold - minScale);
  return clamp((threshold - state.scale) / denom, 0, 1);
}

function updateMiniMapRect() {
  const viewport = $("#viewport");
  const miniMap = $("#miniMap");
  const miniMapRect = $("#miniMapRect");
  if (!viewport || !miniMap || !miniMapRect || !state.width || !state.height) return;

  const miniWidth = miniMap.clientWidth;
  const miniHeight = miniMap.clientHeight;
  if (miniWidth <= 0 || miniHeight <= 0) return;

  const imageRatio = state.width / state.height;
  const boxRatio = miniWidth / miniHeight;

  let contentWidth = miniWidth;
  let contentHeight = miniHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > boxRatio) {
    contentHeight = miniWidth / imageRatio;
    offsetY = (miniHeight - contentHeight) * 0.5;
  } else {
    contentWidth = miniHeight * imageRatio;
    offsetX = (miniWidth - contentWidth) * 0.5;
  }

  const fullWidth = state.width * state.scale;
  const fullHeight = state.height * state.scale;
  if (fullWidth <= 0 || fullHeight <= 0) return;

  const viewX = -state.tx / fullWidth;
  const viewY = -state.ty / fullHeight;
  const viewW = viewport.clientWidth / fullWidth;
  const viewH = viewport.clientHeight / fullHeight;

  miniMapRect.style.left = `${clamp(offsetX + contentWidth * viewX, offsetX, offsetX + contentWidth)}px`;
  miniMapRect.style.top = `${clamp(offsetY + contentHeight * viewY, offsetY, offsetY + contentHeight)}px`;
  miniMapRect.style.width = `${clamp(contentWidth * viewW, 10, contentWidth)}px`;
  miniMapRect.style.height = `${clamp(contentHeight * viewH, 10, contentHeight)}px`;
}

function requestRender() {
  if (state.rafPending) return;
  state.rafPending = true;
  requestAnimationFrame(() => {
    state.rafPending = false;
    const canvas = $("#mapCanvas");
    const image = $("#mapImage");
    if (!canvas || !image) return;

    const strength = lodStrength();
    image.classList.toggle("low-detail", strength > 0.02);
    image.style.setProperty("--lod-blur", `${(strength * 1.3).toFixed(2)}px`);
    image.style.setProperty("--lod-sat", `${(1 - strength * 0.05).toFixed(3)}`);
    image.style.setProperty("--lod-contrast", `${(1 - strength * 0.06).toFixed(3)}`);
    canvas.style.transform = `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`;

    if ($("#zoomLabel")) $("#zoomLabel").textContent = `${Math.round(state.scale * 100)}%`;
    if ($("#zoomRange")) $("#zoomRange").value = String(clamp(Math.round(state.scale * 100), 5, 800));

    updateVisibleTiles();
    schedulePrefetchAroundViewport();

    if (state.needsMiniMapUpdate) {
      updateMiniMapRect();
      state.needsMiniMapUpdate = false;
    }
  });
}

function fitToViewport() {
  const viewport = $("#viewport");
  if (!viewport || !state.width || !state.height) return;
  const viewportWidth = Math.max(1, viewport.clientWidth);
  const viewportHeight = Math.max(1, viewport.clientHeight);
  const fitScale = Math.min(viewportWidth / state.width, viewportHeight / state.height);
  state.scale = clamp(fitScale, state.minScale, state.maxScale);
  state.fitScale = state.scale;
  state.tx = (viewportWidth - state.width * state.scale) * 0.5;
  state.ty = (viewportHeight - state.height * state.scale) * 0.5;
  state.needsMiniMapUpdate = true;
  requestRender();
}

function resetToOne() {
  const viewport = $("#viewport");
  if (!viewport || !state.width || !state.height) return;
  state.scale = 1;
  state.tx = (viewport.clientWidth - state.width) * 0.5;
  state.ty = (viewport.clientHeight - state.height) * 0.5;
  state.needsMiniMapUpdate = true;
  requestRender();
}

function zoomAt(factor, x, y) {
  const next = clamp(state.scale * factor, state.minScale, state.maxScale);
  if (Math.abs(next - state.scale) < 0.00001) return;
  const worldX = (x - state.tx) / state.scale;
  const worldY = (y - state.ty) / state.scale;
  state.scale = next;
  state.tx = x - worldX * state.scale;
  state.ty = y - worldY * state.scale;
  state.needsMiniMapUpdate = true;
  requestRender();
}

function updateCursorTag(clientX, clientY) {
  const viewport = $("#viewport");
  const tag = $("#cursorTag");
  if (!viewport || !tag || !state.width || !state.height) return;
  const rect = viewport.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const mapX = Math.round((localX - state.tx) / state.scale);
  const mapY = Math.round((localY - state.ty) / state.scale);
  tag.textContent = `x: ${mapX} | y: ${mapY}`;
}

function attachViewerEvents() {
  const viewport = $("#viewport");
  const miniMap = $("#miniMap");
  if (!viewport) return;

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.12 : 0.89;
      zoomAt(factor, x, y);
      updateCursorTag(event.clientX, event.clientY);
    },
    { passive: false }
  );

  viewport.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.dragStartX = event.clientX - state.tx;
    state.dragStartY = event.clientY - state.ty;
    viewport.classList.add("dragging");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (state.dragging) {
      state.tx = event.clientX - state.dragStartX;
      state.ty = event.clientY - state.dragStartY;
      state.needsMiniMapUpdate = true;
      requestRender();
    }
    updateCursorTag(event.clientX, event.clientY);
  });

  const endDrag = () => {
    state.dragging = false;
    viewport.classList.remove("dragging");
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", endDrag);

  if (miniMap) {
    miniMap.addEventListener("pointerdown", (event) => {
      if (!state.width || !state.height) return;
      const rect = miniMap.getBoundingClientRect();
      const rx = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const ry = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const worldX = state.width * rx;
      const worldY = state.height * ry;
      state.tx = viewport.clientWidth * 0.5 - worldX * state.scale;
      state.ty = viewport.clientHeight * 0.5 - worldY * state.scale;
      state.needsMiniMapUpdate = true;
      requestRender();
    });
  }

  if ($("#btnZoomIn")) {
    $("#btnZoomIn").onclick = () => {
      const rect = viewport.getBoundingClientRect();
      zoomAt(1.2, rect.width * 0.5, rect.height * 0.5);
    };
  }
  if ($("#btnZoomOut")) {
    $("#btnZoomOut").onclick = () => {
      const rect = viewport.getBoundingClientRect();
      zoomAt(0.84, rect.width * 0.5, rect.height * 0.5);
    };
  }
  if ($("#btnFit")) $("#btnFit").onclick = fitToViewport;
  if ($("#btnReset")) $("#btnReset").onclick = resetToOne;

  if ($("#zoomRange")) {
    $("#zoomRange").addEventListener("input", () => {
      const wanted = clamp(Number($("#zoomRange").value || 100) / 100, state.minScale, state.maxScale);
      const rect = viewport.getBoundingClientRect();
      zoomAt(wanted / state.scale, rect.width * 0.5, rect.height * 0.5);
    });
  }

  if ($("#btnFullscreen")) {
    $("#btnFullscreen").onclick = async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch (_) {}
    };
  }

  window.addEventListener("resize", () => fitToViewport());
  window.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomAt(1.2, rect.width * 0.5, rect.height * 0.5);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomAt(0.84, rect.width * 0.5, rect.height * 0.5);
    } else if (event.key === "0") {
      event.preventDefault();
      resetToOne();
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      fitToViewport();
    }
  });
}

async function loadMeta() {
  const encoded = encodeRelPath(state.relPath);
  const meta = await apiGet(`/api/tasks/${encodeURIComponent(state.taskId)}/map-view/${encoded}/meta`);
  state.meta = meta;
  state.width = Number(meta.width || 0);
  state.height = Number(meta.height || 0);
  state.tileSize = Number(meta.tile_size || 2048);
  state.tileCols = Number(meta.tile_cols || 0);
  state.tileRows = Number(meta.tile_rows || 0);
  state.tileTemplate = String(meta.tile_url_template || "");

  if ($("#metaFileName")) $("#metaFileName").textContent = meta.file_name || "—";
  if ($("#metaSize")) $("#metaSize").textContent = formatBytes(meta.bytes);
  if ($("#metaPixels")) {
    if (typeof meta.pixels === "number" && meta.width && meta.height) {
      $("#metaPixels").textContent = `${meta.pixels.toLocaleString()} (${meta.width} × ${meta.height})`;
    } else {
      $("#metaPixels").textContent = "—";
    }
  }

  if ($("#btnDownload")) $("#btnDownload").href = meta.download_url;
  if ($("#btnZip")) $("#btnZip").href = meta.zip_url;
  const thumbUrl = String(meta.thumb_url || "");
  if ($("#miniMapImage")) $("#miniMapImage").src = thumbUrl;

  if (!state.width || !state.height) throw new Error(t("open_failed"));
  if (!state.tileCols || !state.tileRows) throw new Error("Tile metadata missing");

  const image = $("#mapImage");
  const layer = $("#tileLayer");
  if (!image || !layer) throw new Error(t("open_failed"));

  image.style.width = `${state.width}px`;
  image.style.height = `${state.height}px`;
  layer.style.width = `${state.width}px`;
  layer.style.height = `${state.height}px`;
  image.src = thumbUrl;

  clearTileLayers();
  fitToViewport();
  setStatus(t("tiles_loading"));
  schedulePrefetchAroundViewport();
}

function parseQuery() {
  const query = new URLSearchParams(window.location.search);
  state.lang = normalizeLang(query.get("lang") || "ru");
  state.taskId = String(query.get("task") || "");
  state.relPath = String(query.get("rel") || "");
}

async function init() {
  parseQuery();
  applyI18n();
  setStatus(t("loading_meta"));

  if (!state.taskId || !state.relPath) {
    setStatus(t("open_failed"));
    return;
  }

  const settingsPromise = apiGet("/api/settings")
    .then((cfg) => {
      if (cfg?.theme) applyTheme(cfg.theme);
      state.mapBlurEnabled = cfg?.map_view_blur_enabled ?? true;
      if (cfg?.language && !new URLSearchParams(window.location.search).get("lang")) {
        state.lang = normalizeLang(cfg.language);
        applyI18n();
      }
    })
    .catch(() => {});

  attachViewerEvents();

  if ($("#btnSaveDownloads")) {
    $("#btnSaveDownloads").onclick = async () => {
      try {
        const encoded = encodeRelPath(state.relPath);
        const result = await apiPost(`/api/tasks/${encodeURIComponent(state.taskId)}/map-view/${encoded}/copy-downloads`, {});
        setStatus(`${t("copied")}: ${result.filename || ""}`.trim());
      } catch (error) {
        setStatus(`${t("copy_failed")}: ${formatError(error)}`);
      }
    };
  }

  try {
    await loadMeta();
  } catch (error) {
    const details = formatError(error);
    setStatus(details ? `${t("open_failed")}: ${details}` : t("open_failed"));
  }

  await settingsPromise;
}

init();
