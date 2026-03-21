const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  filesByKey: new Map(),
  taskId: null,
  pollTimer: null,
  cfg: null,
  info: null,
  lang: "ru",
  openFiles: [],
};

const I18N = {
  ru: {
    brand_subtitle: "<b>Niklaser</b> | <b>onejeuu</b>",
    home_badge_fast: "Fast",

    convert_files_title: "Файлы",
    convert_options_title: "Опции",
    btn_add_files: "Добавить файлы",
    btn_add_folder: "Добавить папку",
    btn_clear: "Очистить",
    convert_support_hint: "Поддержка: <span class=\"mono\">.mcsb .mcsa .mcvd .ol .mic .texarr</span> и NBT",
    label_output: "Вывод",
    output_folder: "Папка",
    label_folder: "Папка",
    label_models: "Модели",
    btn_convert: "Конвертировать",
    task_title: "Задача",
    task_none: "Нет активной задачи",
    btn_download_zip: "Скачать ZIP",
    btn_open_zip: "Открыть ZIP",
    btn_open_folder: "Открыть папку",
    btn_hide_progress: "Скрыть прогресс",
    results_title: "Результаты",
    nav_logs: "Логи",
    btn_delete: "Удалить",
    btn_download: "Скачать",

    fast_title: "Fast Module",
    fast_desc: "Открытые файлы уже готовы к конвертации.",
    fast_full: "Полный режим",
    fast_start: "Конвертировать",
    fast_empty: "Нет файлов для быстрого режима.",

    set_flags: "Флаги",
    flag_preserve: "Сохранять структуру",
    flag_unique: "Уникальные имена",
    flag_skeleton: "Скелет",
    flag_anim: "Анимации",

    ph_folder_path: "Например: D:\\\\output\\\\scfile",

    no_files: "Файлы не выбраны.",
    choose_files: "Выберите файлы.",
    need_folder_path: "Для режима «Папка» укажи путь (или выбери ZIP).",
    uploading: "Загрузка",
    converting: "Конвертация",
    error_prefix: "Ошибка",
    ready: "готово",
    loading: "Загрузка…",
    loading_check_server: "Проверка сервера…",
    loading_settings: "Загрузка настроек…",
    loading_info: "Загрузка информации…",
  },
  en: {
    brand_subtitle: "<b>Niklaser</b> | <b>onejeuu</b>",
    home_badge_fast: "Fast",

    convert_files_title: "Files",
    convert_options_title: "Options",
    btn_add_files: "Add files",
    btn_add_folder: "Add folder",
    btn_clear: "Clear",
    convert_support_hint: "Supported: <span class=\"mono\">.mcsb .mcsa .mcvd .ol .mic .texarr</span> and NBT",
    label_output: "Output",
    output_folder: "Folder",
    label_folder: "Folder",
    label_models: "Models",
    btn_convert: "Convert",
    task_title: "Task",
    task_none: "No active task",
    btn_download_zip: "Download ZIP",
    btn_open_zip: "Open ZIP",
    btn_open_folder: "Open folder",
    btn_hide_progress: "Hide progress",
    results_title: "Results",
    nav_logs: "Logs",
    btn_delete: "Delete",
    btn_download: "Download",

    fast_title: "Fast Module",
    fast_desc: "Opened files are ready for conversion.",
    fast_full: "Full mode",
    fast_start: "Convert",
    fast_empty: "No files for fast mode.",

    set_flags: "Flags",
    flag_preserve: "Preserve structure",
    flag_unique: "Unique names",
    flag_skeleton: "Skeleton",
    flag_anim: "Animations",

    ph_folder_path: "e.g. D:\\\\output\\\\scfile",

    no_files: "No files selected.",
    choose_files: "Choose files.",
    need_folder_path: "For folder mode, provide a path (or choose ZIP).",
    uploading: "Uploading",
    converting: "Converting",
    error_prefix: "Error",
    ready: "ready",
    loading: "Loading…",
    loading_check_server: "Checking server…",
    loading_settings: "Loading settings…",
    loading_info: "Loading info…",
  },
};

function t(key) {
  return I18N[state.lang]?.[key] ?? I18N.ru?.[key] ?? key;
}

function applyI18n(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $$("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  $$("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
}

function syncTopLangToggle(lang) {
  const input = $(`input[name="topLang"][value="${lang}"]`);
  if (input) input.checked = true;
}

function hexToRgb(hex) {
  const s = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const a = Math.max(0, Math.min(Number(alpha ?? 1), 1));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.bg) root.style.setProperty("--bg", theme.bg);
  if (theme.panel) root.style.setProperty("--panel", theme.panel);
  if (theme.panel2) root.style.setProperty("--panel2", theme.panel2);
  else if (theme.panel) root.style.setProperty("--panel2", theme.panel);
  if (theme.text) root.style.setProperty("--text", theme.text);
  if (theme.muted_text) root.style.setProperty("--muted", theme.muted_text);
  if (theme.danger) root.style.setProperty("--danger", theme.danger);

  const accentRgb = hexToRgb(theme.accent);
  if (accentRgb) {
    root.style.setProperty("--accent-rgb", `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    [
      ["--accent-06", 0.06],
      ["--accent-07", 0.07],
      ["--accent-08", 0.08],
      ["--accent-10", 0.1],
      ["--accent-12", 0.12],
      ["--accent-13", 0.13],
      ["--accent-14", 0.14],
      ["--accent-18", 0.18],
      ["--accent-25", 0.25],
      ["--accent-35", 0.35],
      ["--accent-40", 0.4],
    ].forEach(([k, a]) => root.style.setProperty(k, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${a})`));
  }

  const bgRgb = hexToRgb(theme.bg);
  if (bgRgb) root.style.setProperty("--bg-rgb", `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`);
  const panelRgb = hexToRgb(theme.panel);
  if (panelRgb) root.style.setProperty("--panel-rgb", `${panelRgb.r}, ${panelRgb.g}, ${panelRgb.b}`);
  const p2 = theme.panel2 || theme.panel;
  const panel2Rgb = hexToRgb(p2);
  if (panel2Rgb) root.style.setProperty("--panel2-rgb", `${panel2Rgb.r}, ${panel2Rgb.g}, ${panel2Rgb.b}`);

  const border = rgbaFromHex(theme.accent, 0.22);
  if (border) root.style.setProperty("--border", border);
  const glow = rgbaFromHex(theme.accent, 0.12);
  if (glow) root.style.setProperty("--accent-glow", glow);
}

function applyBackground(cfg) {
  const root = document.documentElement;
  const enabled = !!cfg?.background_enabled;
  const builtin = cfg?.background_builtin ? `/static/backrounds/${encodeURIComponent(cfg.background_builtin)}` : "";
  const url = cfg?.background_url || (cfg?.background_image ? `/user/${encodeURIComponent(cfg.background_image)}` : builtin);
  root.style.setProperty("--bg-image", enabled && url ? `url("${url}")` : "none");
  root.style.setProperty("--bg-image-opacity", String(cfg?.background_opacity ?? 0.22));
  root.style.setProperty("--bg-image-blur", `${cfg?.background_blur ?? 0}px`);
  root.classList.toggle("has-custom-bg", !!(enabled && url));
}

function applyAnimeArt(cfg) {
  const root = document.documentElement;
  const useAnime = !!cfg?.anime_prikoly_enabled;
  const art = useAnime ? 'url("/static/anime.svg")' : 'url("/static/man_and_vertolotiki.svg")';
  root.style.setProperty("--anime-art", art);
}

function applyMotion(cfg) {
  document.documentElement.classList.toggle("reduce-motion", !!cfg?.reduce_motion);
}

function applyGlow(cfg) {
  document.documentElement.classList.toggle("no-glow", cfg?.highlight_enabled === false);
}

function applyFont(cfg) {
  const root = document.documentElement;
  const name = String(cfg?.font_name || "europe").toLowerCase();
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

let loadingTipTimer = null;
let lastTipIndex = -1;

function showLoadingTip() {
  const tipEl = $("#loadingTip");
  if (!tipEl) return;
  const tips = [
    "Проверка зависимостей…",
    "Готовим конвертер…",
    "Инициализация интерфейса…",
  ];
  let idx = Math.floor(Math.random() * tips.length);
  if (tips.length > 1 && idx === lastTipIndex) idx = (idx + 1) % tips.length;
  lastTipIndex = idx;
  tipEl.textContent = tips[idx];
}

function startLoadingTips() {
  if (loadingTipTimer) return;
  showLoadingTip();
  loadingTipTimer = setInterval(showLoadingTip, 1800);
}

function stopLoadingTips() {
  if (loadingTipTimer) {
    clearInterval(loadingTipTimer);
    loadingTipTimer = null;
  }
  const tipEl = $("#loadingTip");
  if (tipEl) tipEl.textContent = "";
}

function setLoading(visible, text) {
  const overlay = $("#loadingOverlay");
  const label = $("#loadingText");
  if (!overlay) return;
  if (label) label.textContent = typeof text === "string" && text ? text : t("loading");
  overlay.classList.toggle("hidden", !visible);
  if (visible) startLoadingTips();
  else stopLoadingTips();
}

function setButtonLabel(id, label) {
  const btn = $(id);
  if (!btn) return;
  const span = btn.querySelector("span");
  if (span) span.textContent = label;
  else btn.textContent = label;
}

function encodeRelPath(rel) {
  return rel.split("/").map(encodeURIComponent).join("/");
}

async function apiGet(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return await r.json();
}

async function apiPostJson(url, payload) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return await r.json();
}

function postFormWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = e.total > 0 ? Math.round((e.loaded / e.total) * 100) : 0;
      if (typeof onProgress === "function") onProgress(pct);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
        return;
      }
      reject(new Error(`${xhr.status} ${xhr.statusText}`));
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(bytes) || 0;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

function currentConvertOptions() {
  const outputMode = $$('input[name="outputMode"]').find((x) => x.checked)?.value || "zip";
  const modelFormats = $$(".mdlFmt")
    .filter((x) => x.checked)
    .map((x) => x.value);

  return {
    output_mode: outputMode,
    output_dir: outputMode === "folder" ? $("#outputDir")?.value?.trim() || "" : "",
    zip_dir: outputMode === "zip" ? state.cfg?.default_zip_dir || "" : "",
    preserve_structure: $("#optPreserve")?.checked ?? true,
    unique_names: $("#optUnique")?.checked ?? true,
    model_formats: modelFormats,
    parse_skeleton: $("#optSkeleton")?.checked ?? true,
    parse_animation: $("#optAnimation")?.checked ?? false,
  };
}

function renderFileList() {
  const list = $("#fileList");
  if (!list) return;

  const entries = Array.from(state.filesByKey.entries());
  if (entries.length === 0) {
    list.innerHTML = `<div class="hint">${t("no_files")}</div>`;
    return;
  }

  list.innerHTML = "";
  for (const [key, file] of entries) {
    const row = document.createElement("div");
    row.className = "file-item";

    const name = document.createElement("div");
    name.className = "file-name mono";
    name.textContent = key;

    const actions = document.createElement("div");
    actions.className = "row";

    const size = document.createElement("div");
    size.className = "pill subtle mono";
    size.textContent = formatBytes(file.size);

    const btn = document.createElement("button");
    btn.className = "btn ghost";
    btn.innerHTML = `<svg class="icon"><use href="/static/icons.svg#close"></use></svg><span>${t("btn_delete")}</span>`;
    btn.onclick = () => {
      state.filesByKey.delete(key);
      renderFileList();
    };

    row.appendChild(name);
    actions.appendChild(size);
    actions.appendChild(btn);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

function addSelectedFiles(files) {
  for (const file of files) {
    const key = file.webkitRelativePath || file.name;
    if (!key) continue;
    state.filesByKey.set(key, file);
  }
  renderFileList();
}

function setupDropzone(el, onFiles) {
  if (!el) return;

  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("dragover");
  });

  el.addEventListener("dragleave", () => el.classList.remove("dragover"));
  el.addEventListener("dragend", () => el.classList.remove("dragover"));

  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("dragover");
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
  });
}

function setTaskUIVisible(visible) {
  $("#btnStopPoll").style.display = visible ? "" : "none";
}

function renderOutputs(task) {
  const list = $("#outputsList");
  list.innerHTML = "";
  for (const rel of task.outputs || []) {
    const item = document.createElement("div");
    item.className = "out-item";

    const name = document.createElement("div");
    name.className = "file-name mono";
    name.textContent = rel;

    const actions = document.createElement("div");
    actions.className = "out-actions";

    const a = document.createElement("a");
    a.className = "btn ghost";
    a.textContent = t("btn_download");
    a.href = `/api/tasks/${task.id}/files/${encodeRelPath(rel)}`;
    a.target = "_blank";
    actions.appendChild(a);

    item.appendChild(name);
    item.appendChild(actions);
    list.appendChild(item);
  }
}

async function pollTask(taskId) {
  if (state.pollTimer) clearInterval(state.pollTimer);
  setTaskUIVisible(true);

  const tick = async () => {
    let task;
    try {
      task = await apiGet(`/api/tasks/${taskId}`);
    } catch (e) {
      return;
    }

    const total = task.total || 0;
    const done = task.done || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    $("#taskStatus").textContent = `${task.status} • ${done}/${total} • errors: ${task.errors ?? 0}`;
    $("#progressBar").style.width = `${pct}%`;

    $("#taskLogs").textContent = (task.logs || []).join("\n");
    renderOutputs(task);

    const zipBtn = $("#btnDownloadZip");
    zipBtn.style.display = task.zip_available ? "" : "none";
    if (task.zip_available) zipBtn.href = `/api/tasks/${taskId}/zip`;

    const zipOpenBtn = $("#btnOpenZip");
    const zipPath = task.meta?.zip_path;
    zipOpenBtn.style.display = zipPath ? "" : "none";
    zipOpenBtn.onclick = async () => {
      if (!zipPath) return;
      try {
        await apiPostJson("/api/open", { path: zipPath });
      } catch (_) {}
    };

    const outBtn = $("#btnOpenOutput");
    const outDir = task.meta?.output_dir;
    outBtn.style.display = outDir ? "" : "none";
    outBtn.onclick = async () => {
      try {
        await apiPostJson("/api/open", { path: outDir });
      } catch (_) {}
    };

    if (task.status === "done" || task.status === "error") {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  };

  await tick();
  state.pollTimer = setInterval(tick, 900);
}

function renderFastFiles() {
  const list = $("#fastFileList");
  if (!list) return;
  const files = Array.from(state.openFiles || []);
  if (!files.length) {
    list.innerHTML = `<div class="hint">${t("fast_empty")}</div>`;
    return;
  }
  list.innerHTML = files.map((p) => `<div class="fast-item mono">${p}</div>`).join("");
}

function showFastModule(files) {
  state.openFiles = Array.isArray(files) ? files : [];
  const card = $("#fastCard");
  if (card) card.classList.toggle("hidden", state.openFiles.length === 0);
  renderFastFiles();
}

function hideFastModule() {
  state.openFiles = [];
  const card = $("#fastCard");
  if (card) card.classList.add("hidden");
}

async function startFastConvert() {
  if (!state.openFiles || state.openFiles.length === 0) {
    $("#taskStatus").textContent = t("fast_empty");
    return;
  }

  const opts = currentConvertOptions();
  if (opts.output_mode === "folder" && !opts.output_dir) {
    $("#taskStatus").textContent = t("need_folder_path");
    return;
  }

  setButtonLabel("#btnFastStart", `${t("uploading")}…`);
  $("#btnFastStart").disabled = true;
  $("#taskStatus").textContent = `${t("uploading")}…`;
  $("#progressBar").style.width = "0%";

  try {
    const data = await apiPostJson("/api/convert/path", { options: opts, paths: state.openFiles });
    state.taskId = data.task_id;
    $("#taskStatus").textContent = `${t("converting")}…`;
    $("#progressBar").style.width = "0%";
    await pollTask(state.taskId);
  } catch (e) {
    $("#taskStatus").textContent = `${t("error_prefix")}: ${e.message || e}`;
  } finally {
    setButtonLabel("#btnFastStart", t("fast_start"));
    $("#btnFastStart").disabled = false;
  }
}

async function startConvert() {
  const files = Array.from(state.filesByKey.entries());
  if (files.length === 0) {
    $("#taskStatus").textContent = t("choose_files");
    return;
  }

  const opts = currentConvertOptions();
  $("#rowOutputDir").style.display = opts.output_mode === "folder" ? "" : "none";
  if (opts.output_mode === "folder" && !opts.output_dir) {
    $("#taskStatus").textContent = t("need_folder_path");
    return;
  }

  const fd = new FormData();
  fd.append("options", JSON.stringify(opts));
  for (const [key, file] of files) {
    fd.append("files", file, key);
  }

  setButtonLabel("#btnStartConvert", `${t("uploading")}…`);
  $("#btnStartConvert").disabled = true;
  $("#taskStatus").textContent = `${t("uploading")}: 0%`;
  $("#progressBar").style.width = "0%";

  try {
    const data = await postFormWithProgress("/api/convert", fd, (pct) => {
      $("#taskStatus").textContent = `${t("uploading")}: ${pct}%`;
      $("#progressBar").style.width = `${pct}%`;
    });
    state.taskId = data.task_id;
    $("#taskStatus").textContent = `${t("converting")}…`;
    $("#progressBar").style.width = "0%";
    await pollTask(state.taskId);
  } catch (e) {
    $("#taskStatus").textContent = `${t("error_prefix")}: ${e.message || e}`;
  } finally {
    setButtonLabel("#btnStartConvert", t("btn_convert"));
    $("#btnStartConvert").disabled = false;
  }
}

function applyDefaultsToConvertUI(cfg) {
  const modeInputs = $$('input[name="outputMode"]');
  modeInputs.forEach((i) => (i.checked = i.value === (cfg?.default_output_mode || "zip")));
  if ($("#outputDir")) $("#outputDir").value = cfg?.default_output_dir || "";
  if ($("#optPreserve")) $("#optPreserve").checked = !!cfg?.preserve_structure;
  if ($("#optUnique")) $("#optUnique").checked = !!cfg?.unique_names;
  if ($("#optSkeleton")) $("#optSkeleton").checked = !!cfg?.parse_skeleton;
  if ($("#optAnimation")) $("#optAnimation").checked = !!cfg?.parse_animation;

  const formats = new Set((cfg?.model_formats || []).map((x) => String(x).toLowerCase()));
  $$(".mdlFmt").forEach((c) => (c.checked = formats.size ? formats.has(c.value) : c.checked));

  const outputMode = $$('input[name="outputMode"]').find((x) => x.checked)?.value || "zip";
  if ($("#rowOutputDir")) $("#rowOutputDir").style.display = outputMode === "folder" ? "" : "none";
}

function setupTopLangToggle() {
  const inputs = $$('input[name="topLang"]');
  inputs.forEach((i) =>
    i.addEventListener("change", async () => {
      const lang = inputs.find((x) => x.checked)?.value || "ru";
      applyI18n(lang);
      syncTopLangToggle(lang);
      try {
        await apiPostJson("/api/settings", { language: lang });
      } catch (_) {}
    })
  );
}

async function boot() {
  setLoading(true, t("loading_check_server"));
  try {
    await apiGet("/api/health");
  } catch (e) {}

  try {
    setLoading(true, t("loading_settings"));
    state.cfg = await apiGet("/api/settings");
    applyTheme(state.cfg.theme);
    applyBackground(state.cfg);
    applyAnimeArt(state.cfg);
    applyMotion(state.cfg);
    applyGlow(state.cfg);
    applyFont(state.cfg);
    applyI18n(state.cfg.language || "ru");
    applyDefaultsToConvertUI(state.cfg);
  } catch (e) {}

  try {
    setLoading(true, t("loading_info"));
    state.info = await apiGet("/api/info");
    if ($("#appInfo")) $("#appInfo").textContent = `v${state.info.scfile_version} • Niklaser | onejeuu`;
    if (Array.isArray(state.info?.open_files) && state.info.open_files.length) {
      showFastModule(state.info.open_files);
    } else {
      hideFastModule();
    }
  } catch (e) {}

  $("#btnAddFiles").onclick = () => $("#inputFiles").click();
  $("#btnAddFolder").onclick = () => $("#inputFolder").click();
  $("#btnClearFiles").onclick = () => {
    state.filesByKey.clear();
    renderFileList();
  };

  $("#inputFiles").addEventListener("change", (e) => addSelectedFiles(e.target.files));
  $("#inputFolder").addEventListener("change", (e) => addSelectedFiles(e.target.files));

  setupDropzone($("#fileList"), addSelectedFiles);

  $$('input[name="outputMode"]').forEach((i) =>
    i.addEventListener("change", () => {
      const mode = $$('input[name="outputMode"]').find((x) => x.checked)?.value || "zip";
      $("#rowOutputDir").style.display = mode === "folder" ? "" : "none";
    })
  );

  $("#btnStartConvert").onclick = startConvert;
  if ($("#btnFastStart")) $("#btnFastStart").onclick = startFastConvert;
  if ($("#btnFullMode")) $("#btnFullMode").onclick = () => (window.location.href = "/");
  $("#btnStopPoll").onclick = () => {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
    $("#btnStopPoll").style.display = "none";
  };

  setupTopLangToggle();
  syncTopLangToggle(state.cfg?.language || "ru");
  renderFileList();
  setLoading(false);
}

document.addEventListener("DOMContentLoaded", boot);
