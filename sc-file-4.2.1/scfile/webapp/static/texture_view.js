const $ = (selector) => document.querySelector(selector);

const I18N = {
  ru: {
    title: "Осмотр текстуры",
    subtitle: "Файл",
    download: "Скачать",
    fit: "Вписать",
    reset: "100%",
    zoom_in: "+",
    zoom_out: "−",
    loading: "Загрузка текстуры…",
    open_failed: "Не удалось открыть текстуру",
    unsupported: "Этот формат нельзя отобразить в браузере. Скачай файл и открой внешним редактором.",
    unsupported_dds: "DDS не удалось декодировать для предпросмотра. Скачай файл и открой в внешнем редакторе.",
  },
  en: {
    title: "Texture Inspector",
    subtitle: "File",
    download: "Download",
    fit: "Fit",
    reset: "100%",
    zoom_in: "+",
    zoom_out: "−",
    loading: "Loading texture…",
    open_failed: "Failed to open texture",
    unsupported: "This format is not previewable in browser. Download and open it in an external editor.",
    unsupported_dds: "DDS decoding failed for preview. Download and open it in an external editor.",
  },
};

const state = {
  lang: "ru",
  taskId: "",
  relPath: "",
  scale: 1,
  minScale: 0.05,
  maxScale: 24,
  tx: 0,
  ty: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragBaseX: 0,
  dragBaseY: 0,
  naturalWidth: 0,
  naturalHeight: 0,
  fileSize: 0,
};

function normalizeLang(value) {
  return String(value || "").toLowerCase() === "en" ? "en" : "ru";
}

function t(key) {
  return I18N[state.lang]?.[key] ?? I18N.ru[key] ?? key;
}

function setStatus(message) {
  const el = $("#status");
  if (el) el.textContent = String(message || "");
}

function encodeRelPath(relPath) {
  return String(relPath || "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function parseQuery() {
  const query = new URLSearchParams(window.location.search);
  state.taskId = String(query.get("task") || "");
  state.relPath = String(query.get("rel") || "");
  state.lang = normalizeLang(query.get("lang") || "ru");
}

function isDdsPath(path) {
  return String(path || "").toLowerCase().endsWith(".dds");
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = value;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  return `${v.toFixed(idx === 0 ? 0 : v >= 100 ? 0 : 1)} ${units[idx]}`;
}

function applyTheme(theme) {
  if (!theme || typeof theme !== "object") return;
  const root = document.documentElement;
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.bg) root.style.setProperty("--bg", theme.bg);
  if (theme.panel) root.style.setProperty("--panel", theme.panel);
  if (theme.text) root.style.setProperty("--text", theme.text);
  if (theme.muted_text) root.style.setProperty("--muted", theme.muted_text);
}

function updateTransform() {
  const img = $("#imgTexture");
  if (!img) return;
  img.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  const zoomValue = $("#zoomValue");
  if (zoomValue) zoomValue.textContent = `${Math.round(state.scale * 100)}%`;
}

function centerImage() {
  const canvas = $("#canvas");
  if (!canvas || !state.naturalWidth || !state.naturalHeight) return;
  const cw = Math.max(1, canvas.clientWidth);
  const ch = Math.max(1, canvas.clientHeight);
  state.tx = -((state.naturalWidth * state.scale) / 2) + cw / 2;
  state.ty = -((state.naturalHeight * state.scale) / 2) + ch / 2;
  updateTransform();
}

function fitImage() {
  const canvas = $("#canvas");
  if (!canvas || !state.naturalWidth || !state.naturalHeight) return;
  const cw = Math.max(1, canvas.clientWidth);
  const ch = Math.max(1, canvas.clientHeight);
  const sx = cw / state.naturalWidth;
  const sy = ch / state.naturalHeight;
  state.scale = Math.max(state.minScale, Math.min(state.maxScale, Math.min(sx, sy)));
  centerImage();
}

function clampScale(value) {
  return Math.max(state.minScale, Math.min(state.maxScale, value));
}

function zoomAt(canvasX, canvasY, targetScale) {
  const canvas = $("#canvas");
  if (!canvas) return;
  const nextScale = clampScale(targetScale);
  if (Math.abs(nextScale - state.scale) < 0.0001) return;
  const worldX = (canvasX - state.tx) / state.scale;
  const worldY = (canvasY - state.ty) / state.scale;
  state.scale = nextScale;
  state.tx = canvasX - worldX * state.scale;
  state.ty = canvasY - worldY * state.scale;
  updateTransform();
}

function stepZoom(multiplier) {
  const canvas = $("#canvas");
  if (!canvas) return;
  zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, state.scale * multiplier);
}

function updateMetaLabel() {
  const meta = $("#metaValue");
  if (!meta) return;
  const res = state.naturalWidth && state.naturalHeight ? `${state.naturalWidth}×${state.naturalHeight}` : "";
  const size = formatBytes(state.fileSize);
  meta.textContent = [res, size].filter(Boolean).join(" • ");
}

function decodeWatermarkText() {
  return "SC-FILE:MODDED • TEXTURE VIEW";
}

function buildWatermarkPattern() {
  const lineMain = decodeWatermarkText();
  const lineSub = "Niklaser | onejeuu";
  const canvas = document.createElement("canvas");
  canvas.width = 860;
  canvas.height = 460;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const fitFont = (text, maxWidth, startSize, minSize, weight) => {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px "JetBrains Mono", "Europe-Book-Edited", Arial, sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 1;
    }
    return minSize;
  };

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(52, 230);
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.strokeStyle = "rgba(255,212,0,0.48)";
  ctx.fillStyle = "rgba(255,212,0,0.24)";

  const maxWidth = canvas.width - 140;
  const mainSize = fitFont(lineMain, maxWidth, 42, 24, 800);
  const subSize = fitFont(lineSub, maxWidth, 32, 18, 700);

  const drawBlock = (y) => {
    ctx.font = `800 ${mainSize}px "JetBrains Mono", "Europe-Book-Edited", Arial, sans-serif`;
    ctx.lineWidth = Math.max(1.4, mainSize / 18);
    ctx.strokeText(lineMain, 0, y);
    ctx.fillText(lineMain, 0, y);

    const subY = y + Math.round(mainSize * 1.02);
    ctx.font = `700 ${subSize}px "JetBrains Mono", "Europe-Book-Edited", Arial, sans-serif`;
    ctx.lineWidth = Math.max(1.2, subSize / 20);
    ctx.strokeText(lineSub, 0, subY);
    ctx.fillText(lineSub, 0, subY);
  };

  drawBlock(0);
  drawBlock(188);
  return `url(${canvas.toDataURL("image/png")})`;
}

function applyI18n() {
  if ($("#title")) $("#title").textContent = t("title");
  if ($("#btnDownload")) $("#btnDownload").textContent = t("download");
  if ($("#btnFit")) $("#btnFit").textContent = t("fit");
  if ($("#btnReset")) $("#btnReset").textContent = t("reset");
  if ($("#btnZoomIn")) $("#btnZoomIn").textContent = t("zoom_in");
  if ($("#btnZoomOut")) $("#btnZoomOut").textContent = t("zoom_out");
}

async function apiGet(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function bindControls() {
  const canvas = $("#canvas");
  if (!canvas) return;

  if ($("#btnFit")) $("#btnFit").onclick = () => fitImage();
  if ($("#btnReset")) {
    $("#btnReset").onclick = () => {
      state.scale = 1;
      centerImage();
    };
  }
  if ($("#btnZoomIn")) $("#btnZoomIn").onclick = () => stepZoom(1.2);
  if ($("#btnZoomOut")) $("#btnZoomOut").onclick = () => stepZoom(1 / 1.2);

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const delta = event.deltaY < 0 ? 1.11 : 1 / 1.11;
      zoomAt(x, y, state.scale * delta);
    },
    { passive: false }
  );

  canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragBaseX = state.tx;
    state.dragBaseY = state.ty;
    canvas.classList.add("dragging");
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.tx = state.dragBaseX + (event.clientX - state.dragStartX);
    state.ty = state.dragBaseY + (event.clientY - state.dragStartY);
    updateTransform();
  });

  const stopDrag = (event) => {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.classList.remove("dragging");
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
  };
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);
  window.addEventListener("resize", () => fitImage());
}

async function init() {
  parseQuery();
  applyI18n();
  setStatus(t("loading"));

  if (!state.taskId || !state.relPath) {
    setStatus(t("open_failed"));
    return;
  }

  const settingsPromise = apiGet("/api/settings")
    .then((cfg) => {
      if (cfg?.theme) applyTheme(cfg.theme);
      if (cfg?.language && !new URLSearchParams(window.location.search).get("lang")) {
        state.lang = normalizeLang(cfg.language);
        applyI18n();
      }
    })
    .catch(() => {});

  const fileName = state.relPath.split("/").pop() || state.relPath;
  if ($("#subtitle")) $("#subtitle").textContent = `${t("subtitle")}: ${fileName}`;

  const relEncoded = encodeRelPath(state.relPath);
  const fileUrl = `/api/tasks/${encodeURIComponent(state.taskId)}/files/${relEncoded}`;
  const previewUrl = `/api/tasks/${encodeURIComponent(state.taskId)}/texture-preview/${relEncoded}`;
  if ($("#btnDownload")) $("#btnDownload").href = fileUrl;

  bindControls();

  const image = $("#imgTexture");
  const unsupported = $("#unsupported");
  if (!image) {
    setStatus(t("open_failed"));
    return;
  }

  image.onload = () => {
    state.naturalWidth = image.naturalWidth || 0;
    state.naturalHeight = image.naturalHeight || 0;
    updateMetaLabel();
    fitImage();
    setStatus("");
  };
  image.onerror = () => {
    if (unsupported) {
      unsupported.classList.add("active");
      unsupported.textContent = isDdsPath(state.relPath) ? t("unsupported_dds") : t("unsupported");
    }
    setStatus(t("open_failed"));
  };
  image.src = previewUrl;

  fetch(fileUrl, { method: "HEAD", cache: "no-store" })
    .then((headResponse) => {
      if (!headResponse.ok) return;
      const cl = Number(headResponse.headers.get("content-length") || 0);
      if (Number.isFinite(cl) && cl > 0) state.fileSize = cl;
      updateMetaLabel();
    })
    .catch(() => {});

  requestAnimationFrame(() => {
    const wm = $("#watermark");
    if (wm) wm.style.backgroundImage = buildWatermarkPattern();
  });

  await settingsPromise;
}

init();
