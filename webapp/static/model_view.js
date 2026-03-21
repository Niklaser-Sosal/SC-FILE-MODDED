const $ = (selector) => document.querySelector(selector);

const I18N = {
  ru: {
    title: "Осмотр модели",
    subtitle: "Файл",
    download: "Скачать",
    reset: "Сброс камеры",
    auto_on: "Авто: ВКЛ",
    auto_off: "Авто: ВЫКЛ",
    grid_on: "Сетка модели: ВКЛ",
    grid_off: "Сетка модели: ВЫКЛ",
    speed: "Скорость",
    exposure: "Свет",
    shadow: "Тень",
    metal: "Metal",
    rough: "Rough",
    tint: "Tint",
    material_reset: "Материал: Сброс",
    view_front: "Front",
    view_side: "Side",
    view_top: "Top",
    unsupported:
      "Полноценный 3D-осмотр сейчас поддерживает GLB/GLTF.\nЭтот файл можно скачать и открыть внешним 3D-редактором.",
    loading: "Загрузка модели…",
    open_failed: "Не удалось открыть модель",
  },
  en: {
    title: "Model Inspector",
    subtitle: "File",
    download: "Download",
    reset: "Reset camera",
    auto_on: "Auto: ON",
    auto_off: "Auto: OFF",
    grid_on: "Model grid: ON",
    grid_off: "Model grid: OFF",
    speed: "Speed",
    exposure: "Exposure",
    shadow: "Shadow",
    metal: "Metal",
    rough: "Rough",
    tint: "Tint",
    material_reset: "Material: Reset",
    view_front: "Front",
    view_side: "Side",
    view_top: "Top",
    unsupported:
      "Full 3D inspection currently supports GLB/GLTF.\nDownload this file and open it in an external 3D editor.",
    loading: "Loading model…",
    open_failed: "Failed to open model",
  },
};

const DEFAULTS = {
  rotationSpeed: 30,
  exposure: 1.0,
  shadowIntensity: 1.0,
  metalness: 0.22,
  roughness: 0.68,
  tintColor: "#ffffff",
};

const state = {
  lang: "ru",
  taskId: "",
  relPath: "",
  autoRotate: true,
  gridEnabled: true,
  rotationSpeed: DEFAULTS.rotationSpeed,
  exposure: DEFAULTS.exposure,
  shadowIntensity: DEFAULTS.shadowIntensity,
  metalness: DEFAULTS.metalness,
  roughness: DEFAULTS.roughness,
  tintColor: DEFAULTS.tintColor,
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

function decodeWatermarkText() {
  return "SC-FILE:MODDED • MODEL VIEW";
}

function applyFontName(fontName) {
  const name = String(fontName || "europe").toLowerCase();
  const root = document.documentElement;

  if (name === "arial") {
    root.style.setProperty(
      "--font",
      '"Arial Local", Arial, "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, "Noto Sans", "Liberation Sans", sans-serif'
    );
    root.style.setProperty(
      "--mono",
      '"JetBrains Mono", ui-monospace, "Cascadia Mono", "Cascadia Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    );
    return;
  }

  if (name === "jetbrains") {
    root.style.setProperty(
      "--font",
      '"JetBrains Mono", ui-monospace, "Cascadia Mono", "Cascadia Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    );
    root.style.setProperty(
      "--mono",
      '"JetBrains Mono", ui-monospace, "Cascadia Mono", "Cascadia Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    );
    return;
  }

  root.style.setProperty(
    "--font",
    '"Europe-Book-Edited", "Arial Local", Arial, "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, "Noto Sans", "Liberation Sans", sans-serif'
  );
  root.style.setProperty(
    "--mono",
    '"JetBrains Mono", ui-monospace, "Cascadia Mono", "Cascadia Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  );
}

function buildWatermarkPattern() {
  const lineMain = decodeWatermarkText();
  const lineSub = "Niklaser | onejeuu";
  const canvas = document.createElement("canvas");
  canvas.width = 860;
  canvas.height = 460;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const computed = getComputedStyle(document.documentElement);
  const mainFamily =
    computed.getPropertyValue("--font").trim() ||
    '"Europe-Book-Edited", "Arial Local", Arial, "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, "Noto Sans", "Liberation Sans", sans-serif';
  const subFamily =
    computed.getPropertyValue("--mono").trim() ||
    '"JetBrains Mono", ui-monospace, "Cascadia Mono", "Cascadia Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const fitFont = (text, maxWidth, startSize, minSize, weight) => {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${mainFamily}`;
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
  ctx.strokeStyle = "rgba(255,212,0,0.50)";
  ctx.fillStyle = "rgba(255,212,0,0.26)";

  const maxWidth = canvas.width - 140;
  const mainSize = fitFont(lineMain, maxWidth, 42, 24, 800);
  const subSize = fitFont(lineSub, maxWidth, 32, 18, 700);

  const drawBlock = (y) => {
    ctx.font = `800 ${mainSize}px ${mainFamily}`;
    ctx.lineWidth = Math.max(1.4, mainSize / 18);
    ctx.strokeText(lineMain, 0, y);
    ctx.fillText(lineMain, 0, y);

    const subY = y + Math.round(mainSize * 1.02);
    ctx.font = `700 ${subSize}px ${subFamily}`;
    ctx.lineWidth = Math.max(1.2, subSize / 20);
    ctx.strokeText(lineSub, 0, subY);
    ctx.fillText(lineSub, 0, subY);
  };

  drawBlock(0);
  drawBlock(188);
  return `url(${canvas.toDataURL("image/png")})`;
}

function applyTheme(theme) {
  if (!theme || typeof theme !== "object") return;
  const root = document.documentElement;
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.bg) root.style.setProperty("--bg", theme.bg);
  if (theme.panel) root.style.setProperty("--panel", theme.panel);
  if (theme.text) root.style.setProperty("--text", theme.text);
  if (theme.muted_text) root.style.setProperty("--muted", theme.muted_text);
  if (theme.accent) root.style.setProperty("--grid-line", `color-mix(in srgb, ${theme.accent} 55%, transparent)`);
}

async function apiGet(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function parseQuery() {
  const query = new URLSearchParams(window.location.search);
  state.taskId = String(query.get("task") || "");
  state.relPath = String(query.get("rel") || "");
  state.lang = normalizeLang(query.get("lang") || "ru");
}

function isSupportedModel(path) {
  const p = String(path || "").toLowerCase();
  return p.endsWith(".glb") || p.endsWith(".gltf");
}

function hexToRgb01(hex) {
  const clean = String(hex || "").trim().replace(/^#/, "");
  if (!/^[\da-fA-F]{6}$/.test(clean)) return [1, 1, 1];
  const value = Number.parseInt(clean, 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return [r, g, b];
}

function setPbrScalar(pbr, methodName, propName, value) {
  if (!pbr) return;
  try {
    if (typeof pbr[methodName] === "function") {
      pbr[methodName](value);
      return;
    }
  } catch (_) {}
  try {
    if (propName in pbr) pbr[propName] = value;
  } catch (_) {}
}

function setPbrColor(pbr, color) {
  if (!pbr) return;
  const rgba = [color[0], color[1], color[2], 1];
  try {
    if (typeof pbr.setBaseColorFactor === "function") {
      pbr.setBaseColorFactor(rgba);
      return;
    }
  } catch (_) {}
  try {
    if ("baseColorFactor" in pbr) pbr.baseColorFactor = rgba;
  } catch (_) {}
}

function applyLighting() {
  const viewer = $("#viewer");
  if (!viewer) return;
  viewer.setAttribute("exposure", state.exposure.toFixed(2));
  viewer.setAttribute("shadow-intensity", state.shadowIntensity.toFixed(2));
  viewer.setAttribute("shadow-softness", "0.9");
}

function applyMaterial() {
  const viewer = $("#viewer");
  if (!viewer || !viewer.model || !Array.isArray(viewer.model.materials)) return;
  const tint = hexToRgb01(state.tintColor);
  for (const material of viewer.model.materials) {
    const pbr = material?.pbrMetallicRoughness;
    if (!pbr) continue;
    setPbrScalar(pbr, "setMetallicFactor", "metallicFactor", state.metalness);
    setPbrScalar(pbr, "setRoughnessFactor", "roughnessFactor", state.roughness);
    setPbrColor(pbr, tint);
  }
}

function applyRotationSpeed() {
  const viewer = $("#viewer");
  if (!viewer) return;
  viewer.setAttribute("rotation-per-second", `${state.rotationSpeed}deg`);
}

function updateLabels() {
  if ($("#rotateSpeedValue")) $("#rotateSpeedValue").textContent = `${state.rotationSpeed}°/s`;
  if ($("#lightExposureValue")) $("#lightExposureValue").textContent = state.exposure.toFixed(2);
  if ($("#lightShadowValue")) $("#lightShadowValue").textContent = state.shadowIntensity.toFixed(2);
  if ($("#matMetalnessValue")) $("#matMetalnessValue").textContent = state.metalness.toFixed(2);
  if ($("#matRoughnessValue")) $("#matRoughnessValue").textContent = state.roughness.toFixed(2);
}

function setGridEnabled(enabled) {
  state.gridEnabled = Boolean(enabled);
  const grid = $("#modelGridFloor");
  const button = $("#btnGrid");
  if (grid) grid.classList.toggle("hidden", !state.gridEnabled);
  if (button) {
    button.textContent = state.gridEnabled ? t("grid_on") : t("grid_off");
    button.classList.toggle("active", state.gridEnabled);
  }
}

function applyI18n() {
  if ($("#title")) $("#title").textContent = t("title");
  if ($("#btnDownload")) $("#btnDownload").textContent = t("download");
  if ($("#btnReset")) $("#btnReset").textContent = t("reset");
  if ($("#btnAuto")) $("#btnAuto").textContent = state.autoRotate ? t("auto_on") : t("auto_off");
  if ($("#btnGrid")) $("#btnGrid").textContent = state.gridEnabled ? t("grid_on") : t("grid_off");
  if ($("#btnMaterialReset")) $("#btnMaterialReset").textContent = t("material_reset");
  if ($("#btnFront")) $("#btnFront").textContent = t("view_front");
  if ($("#btnSide")) $("#btnSide").textContent = t("view_side");
  if ($("#btnTop")) $("#btnTop").textContent = t("view_top");
  if ($("#lblRotateSpeed")) $("#lblRotateSpeed").textContent = t("speed");
  if ($("#lblExposure")) $("#lblExposure").textContent = t("exposure");
  if ($("#lblShadow")) $("#lblShadow").textContent = t("shadow");
  if ($("#lblMetal")) $("#lblMetal").textContent = t("metal");
  if ($("#lblRough")) $("#lblRough").textContent = t("rough");
  if ($("#lblTint")) $("#lblTint").textContent = t("tint");
  updateLabels();
}

function applyViewPreset(preset) {
  const viewer = $("#viewer");
  if (!viewer) return;
  if (preset === "front") viewer.cameraOrbit = "0deg 75deg 120%";
  if (preset === "side") viewer.cameraOrbit = "90deg 75deg 120%";
  if (preset === "top") viewer.cameraOrbit = "0deg 5deg 130%";
  if (typeof viewer.jumpCameraToGoal === "function") viewer.jumpCameraToGoal();
}

function resetMaterialState() {
  state.metalness = DEFAULTS.metalness;
  state.roughness = DEFAULTS.roughness;
  state.tintColor = DEFAULTS.tintColor;
  if ($("#matMetalness")) $("#matMetalness").value = String(Math.round(state.metalness * 100));
  if ($("#matRoughness")) $("#matRoughness").value = String(Math.round(state.roughness * 100));
  if ($("#matTint")) $("#matTint").value = state.tintColor;
  updateLabels();
  applyMaterial();
}

function bindControls() {
  const viewer = $("#viewer");

  if ($("#btnReset")) {
    $("#btnReset").onclick = () => {
      if (viewer && typeof viewer.jumpCameraToGoal === "function") {
        viewer.cameraOrbit = "45deg 75deg 120%";
        viewer.jumpCameraToGoal();
      }
    };
  }

  if ($("#btnAuto")) {
    $("#btnAuto").onclick = () => {
      state.autoRotate = !state.autoRotate;
      if (viewer) viewer.autoRotate = state.autoRotate;
      $("#btnAuto").textContent = state.autoRotate ? t("auto_on") : t("auto_off");
      $("#btnAuto").classList.toggle("active", state.autoRotate);
    };
  }

  if ($("#btnGrid")) {
    $("#btnGrid").onclick = () => setGridEnabled(!state.gridEnabled);
  }

  if ($("#btnMaterialReset")) {
    $("#btnMaterialReset").onclick = resetMaterialState;
  }

  if ($("#rotateSpeed")) {
    $("#rotateSpeed").addEventListener("input", () => {
      state.rotationSpeed = Math.max(5, Math.min(120, Number($("#rotateSpeed").value || DEFAULTS.rotationSpeed)));
      updateLabels();
      applyRotationSpeed();
    });
  }

  if ($("#lightExposure")) {
    $("#lightExposure").addEventListener("input", () => {
      state.exposure = Math.max(0.4, Math.min(2.6, Number($("#lightExposure").value || 100) / 100));
      updateLabels();
      applyLighting();
    });
  }

  if ($("#lightShadow")) {
    $("#lightShadow").addEventListener("input", () => {
      state.shadowIntensity = Math.max(0, Math.min(2, Number($("#lightShadow").value || 100) / 100));
      updateLabels();
      applyLighting();
    });
  }

  if ($("#matMetalness")) {
    $("#matMetalness").addEventListener("input", () => {
      state.metalness = Math.max(0, Math.min(1, Number($("#matMetalness").value || 0) / 100));
      updateLabels();
      applyMaterial();
    });
  }

  if ($("#matRoughness")) {
    $("#matRoughness").addEventListener("input", () => {
      state.roughness = Math.max(0, Math.min(1, Number($("#matRoughness").value || 0) / 100));
      updateLabels();
      applyMaterial();
    });
  }

  if ($("#matTint")) {
    $("#matTint").addEventListener("input", () => {
      state.tintColor = String($("#matTint").value || "#ffffff");
      applyMaterial();
    });
  }

  if ($("#btnFront")) $("#btnFront").onclick = () => applyViewPreset("front");
  if ($("#btnSide")) $("#btnSide").onclick = () => applyViewPreset("side");
  if ($("#btnTop")) $("#btnTop").onclick = () => applyViewPreset("top");
}

function applyControlStateToUi() {
  if ($("#rotateSpeed")) $("#rotateSpeed").value = String(state.rotationSpeed);
  if ($("#lightExposure")) $("#lightExposure").value = String(Math.round(state.exposure * 100));
  if ($("#lightShadow")) $("#lightShadow").value = String(Math.round(state.shadowIntensity * 100));
  if ($("#matMetalness")) $("#matMetalness").value = String(Math.round(state.metalness * 100));
  if ($("#matRoughness")) $("#matRoughness").value = String(Math.round(state.roughness * 100));
  if ($("#matTint")) $("#matTint").value = state.tintColor;
  updateLabels();
}

async function init() {
  parseQuery();
  applyI18n();
  setStatus(t("loading"));
  applyFontName("europe");

  if (!state.taskId || !state.relPath) {
    setStatus(t("open_failed"));
    return;
  }

  const settingsPromise = apiGet("/api/settings")
    .then((cfg) => {
      if (cfg?.theme) applyTheme(cfg.theme);
      if (cfg?.font_name) applyFontName(cfg.font_name);
      if (cfg?.language && !new URLSearchParams(window.location.search).get("lang")) {
        state.lang = normalizeLang(cfg.language);
        applyI18n();
      }
    })
    .catch(() => {});

  const rel = state.relPath;
  const relEncoded = encodeRelPath(rel);
  const fileUrl = `/api/tasks/${encodeURIComponent(state.taskId)}/files/${relEncoded}`;
  const fileName = rel.split("/").pop() || rel;

  if ($("#subtitle")) $("#subtitle").textContent = `${t("subtitle")}: ${fileName}`;
  if ($("#btnDownload")) $("#btnDownload").href = fileUrl;
  const applyWm = () => {
    const wm = $("#watermark");
    if (wm) wm.style.backgroundImage = buildWatermarkPattern();
  };

  const viewer = $("#viewer");
  const unsupported = $("#unsupported");
  if (!viewer) {
    setStatus(t("open_failed"));
    return;
  }

  bindControls();
  applyControlStateToUi();
  setGridEnabled(true);

  const supported = isSupportedModel(rel);
  if (!supported) {
    viewer.style.display = "none";
    if (unsupported) {
      unsupported.classList.add("active");
      unsupported.textContent = t("unsupported");
    }
    setStatus("");
    return;
  }

  viewer.addEventListener("load", () => {
    applyLighting();
    applyRotationSpeed();
    applyMaterial();
    setStatus("");
  });
  viewer.addEventListener("error", () => setStatus(t("open_failed")));
  viewer.src = fileUrl;
  viewer.autoRotate = state.autoRotate;
  viewer.cameraOrbit = "45deg 75deg 120%";
  applyLighting();
  applyRotationSpeed();

  await settingsPromise;

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(applyWm)).catch(() => requestAnimationFrame(applyWm));
  } else {
    requestAnimationFrame(applyWm);
  }
}

init();
