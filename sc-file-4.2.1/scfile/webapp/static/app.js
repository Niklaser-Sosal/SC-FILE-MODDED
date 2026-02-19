const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  filesByKey: new Map(), // key -> File
  mmFilesByKey: new Map(), // key -> File
  taskId: null,
  pollTimer: null,
  mmTaskId: null,
  mmPollTimer: null,
  cfg: null,
  info: null,
  lang: "ru",
};

const I18N = {
  ru: {
    nav_home: "Главная",
    nav_convert: "Конвертер",
    nav_mapmerge: "Map Merge",
    nav_settings: "Настройки",
    nav_logs: "Логи",
    nav_about: "О программе",

    convert_files_title: "Файлы",
    convert_options_title: "Опции",
    btn_add_files: "Добавить файлы",
    btn_add_folder: "Добавить папку",
    btn_clear: "Очистить",
    convert_support_hint: "Поддержка: <span class=\"mono\">.mcsb .mcsa .mcvd .ol .mic .texarr</span> и NBT",
    label_output: "Вывод",
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

    mm_files_title: "Файлы карты",
    mm_support_hint:
      "Поддержка: <span class=\"mono\">.ol .mic</span> (файлы регионов, например <span class=\"mono\">r-5_10.ol</span>)",
    mm_options_title: "Опции",
    mm_format: "Формат",
    mm_preset: "Preset",
    mm_name: "Имя",
    mm_limit: "Лимит",
    mm_png_compress: "PNG сжатие",
    mm_quality: "Качество",
    mm_skip_empty: "Пропускать пустые",
    mm_overwrite: "Перезаписывать",
    mm_debug: "Debug",
    mm_merge: "Склеить карту",

    app_logs_title: "Логи приложения",
    btn_refresh: "Обновить",

    about_title: "О программе",
    about_body:
      "Это локальный web-интерфейс для SC-FILE:MODDED: конвертация ассетов STALCRAFT в стандартные форматы с логами, настройками и пакетной обработкой.",
    about_author: "Автор интерфейса: <b>Niklaser</b>.",
    about_theme: "Основная тема: <span class=\"mono\">жёлтый / чёрный / белый</span>. Настраивается в разделе «Настройки».",

    ph_folder_path: "Например: D:\\\\output\\\\scfile",
    ph_mm_name: "Map %Y.%m.%d",

    home_sub: "Конвертация ассетов STALCRAFT в стандартные форматы с логами, пакетной обработкой и кастомизацией.",
    home_open_convert: "Открыть конвертер",
    home_menu_title: "Главное меню",
    home_menu_convert_desc: "Пакетная конвертация ассетов в ZIP или папку.",
    home_menu_mapmerge_desc: "Склейка регионов карты в изображения (PNG/JPG/WebP).",
    home_menu_settings_desc: "Темы, фон, язык, папки вывода и поведение ZIP.",
    home_menu_logs_desc: "Если что-то пошло не так — начинай с логов.",
    home_menu_info:
      "• По умолчанию ZIP кладётся в <b>Загрузки</b>.<br />• Для больших пакетов конвертация может занять время.<br />• Если зависло окно — открой «Логи» и посмотри ошибки.",
    home_quick_title: "Быстрый старт",
    home_quick_body:
      "1) Зайди в <b>Конвертер</b> → 2) Добавь файлы/папку → 3) Выбери формат и опции → 4) Конвертируй → 5) Скачай ZIP или открой папку результата.",
    home_support_body:
      "<b>Конвертер</b>: <span class=\"mono\">.mcsb .mcsa .mcvd .ol .mic .texarr</span> и NBT<br /><b>Map Merge</b>: <span class=\"mono\">.ol .mic</span> (например <span class=\"mono\">r-5_10.ol</span>)",
    home_quick_theme: "Тема по умолчанию: <span class=\"mono\">жёлтый / чёрный / белый</span>. Меняется в настройках.",
    home_warn_title: "Информация и предупреждения",
    home_warn_body:
      "• Делай бэкап исходных файлов перед конвертацией.<br />• Большие пакеты могут конвертироваться долго — это нормально.<br />• В режиме ZIP результат по умолчанию сохраняется в «Загрузки».<br />• Если интерфейс завис — смотри вкладку «Логи».",
    home_whatsnew_title: "Что нового",
    home_whatsnew_body:
      "• Web UI + окно (pywebview)<br />• Логи + настройки<br />• Пакетная конвертация в ZIP или папку<br />• Поддержка тем и фона",

    set_tab_general: "Общее",
    set_tab_appearance: "Внешний вид",
    set_tab_conversion: "Конвертация",
    set_tab_logging: "Логи",

    set_general_title: "Общее",
    set_language: "Язык",
    set_motion: "Анимации",
    set_reduce_motion: "Уменьшить",
    set_saved_hint: "Настройки сохраняются в профиле пользователя.",

    set_info_title: "Информация",
    set_version: "Версия",
    set_downloads: "Загрузки",
    btn_open_appdir: "Папка приложения",
    btn_open_logsdir: "Папка логов",
    btn_open_downloads: "Открыть Загрузки",
    btn_open_log: "Открыть log",

    set_theme_title: "Тема",
    set_theme_preset: "Тема",
    theme_custom: "Custom",
    set_theme_hint: "Можно выбрать готовую тему или настроить вручную.",
    set_accent: "Акцент",
    set_bg: "Фон",
    set_panel: "Панель",
    set_panel2: "Панель 2",
    set_text: "Текст",
    set_muted: "Подписи",
    set_danger: "Danger",

    set_background_title: "Фон",
    set_bg_image: "Фон-изображение",
    set_enabled: "Включить",
    set_bg_file: "Файл",
    btn_choose_image: "Выбрать",
    btn_choose_folder: "Выбрать папку",
    btn_remove: "Удалить",
    set_current: "Текущий",
    set_bg_opacity: "Прозрачность",
    set_bg_blur: "Размытие",
    set_bg_hint: "Картинка сохраняется в профиле пользователя.",

    set_conversion_title: "Конвертация",
    set_default_output_mode: "Вывод",
    output_folder: "Папка",
    set_zip_dir: "ZIP → папка",
    set_folder_dir: "Папка → путь",
    set_flags: "Флаги",
    flag_preserve: "Сохранять структуру",
    flag_unique: "Уникальные имена",
    flag_skeleton: "Скелет",
    flag_anim: "Анимации",
    set_model_formats: "Модели",
    set_zip_auto_hint: "Автоскачивание после конвертации",

    set_logging_title: "Логирование",
    set_log_level: "Уровень",
    set_log_hint: "Если что-то пошло не так — включи DEBUG и повтори.",

    set_help_title: "Подсказки",
    set_help_body:
      "• ZIP по умолчанию сохраняется в «Загрузки».<br />• Если файл не появился — открой «Логи приложения».<br />• Для репорта ошибок приложи лог-файл.",

    set_actions_title: "Действия",
    btn_save: "Сохранить",
    btn_reset_all: "Сброс",
    settings_footer_hint: "Сохранение применяет изменения сразу.",
    btn_delete: "Удалить",
    btn_download: "Скачать",

    no_files: "Файлы не выбраны.",
    choose_files: "Выберите файлы.",
    choose_mm_files: "Выберите файлы .ol/.mic.",
    need_folder_path: "Для режима «Папка» укажи путь (или выбери ZIP).",
    uploading: "Загрузка",
    converting: "Конвертация",
    error_prefix: "Ошибка",
    ready: "готово",
    loading: "Загрузка…",
    loading_check_server: "Проверка сервера…",
    loading_settings: "Загрузка настроек…",
    loading_info: "Загрузка информации…",

    toast_settings_saved: "Настройки сохранены",
    toast_settings_failed: "Не удалось сохранить настройки",
    toast_bg_uploaded: "Фон обновлён",
    toast_bg_removed: "Фон удалён",
    toast_bg_failed: "Не удалось загрузить фон",
    toast_bg_remove_failed: "Не удалось удалить фон",
    toast_folder_picker_unavailable: "Выбор папки доступен только в desktop-окне. Вставь путь вручную.",
    toast_folder_pick_failed: "Не удалось открыть выбор папки",
  },
  en: {
    nav_home: "Home",
    nav_convert: "Converter",
    nav_mapmerge: "Map Merge",
    nav_settings: "Settings",
    nav_logs: "Logs",
    nav_about: "About",

    convert_files_title: "Files",
    convert_options_title: "Options",
    btn_add_files: "Add files",
    btn_add_folder: "Add folder",
    btn_clear: "Clear",
    convert_support_hint: "Supported: <span class=\"mono\">.mcsb .mcsa .mcvd .ol .mic .texarr</span> and NBT",
    label_output: "Output",
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

    mm_files_title: "Map files",
    mm_support_hint:
      "Supported: <span class=\"mono\">.ol .mic</span> (region files, e.g. <span class=\"mono\">r-5_10.ol</span>)",
    mm_options_title: "Options",
    mm_format: "Format",
    mm_preset: "Preset",
    mm_name: "Name",
    mm_limit: "Limit",
    mm_png_compress: "PNG compression",
    mm_quality: "Quality",
    mm_skip_empty: "Skip empty",
    mm_overwrite: "Overwrite",
    mm_debug: "Debug",
    mm_merge: "Merge map",

    app_logs_title: "App logs",
    btn_refresh: "Refresh",

    about_title: "About",
    about_body:
      "Local web interface for SC-FILE:MODDED: convert STALCRAFT assets into standard formats with logs, settings and batch processing.",
    about_author: "UI author: <b>Niklaser</b>.",
    about_theme: "Main theme: <span class=\"mono\">yellow / black / white</span>. Configure it in Settings.",

    ph_folder_path: "e.g. D:\\\\output\\\\scfile",
    ph_mm_name: "Map %Y.%m.%d",

    home_sub: "Convert STALCRAFT assets into standard formats with logs, batch processing and customization.",
    home_open_convert: "Open converter",
    home_menu_title: "Main menu",
    home_menu_convert_desc: "Batch conversion of assets to ZIP or a folder.",
    home_menu_mapmerge_desc: "Merge map regions into images (PNG/JPG/WebP).",
    home_menu_settings_desc: "Themes, background, language, output folders and ZIP behavior.",
    home_menu_logs_desc: "If something goes wrong — start with logs.",
    home_menu_info:
      "• ZIP is saved to <b>Downloads</b> by default.<br />• Large batches can take time.<br />• If the window freezes — open Logs and check errors.",
    home_quick_title: "Quick start",
    home_quick_body:
      "1) Open <b>Converter</b> → 2) Add files/folder → 3) Choose format & options → 4) Convert → 5) Download ZIP or open the output folder.",
    home_support_body:
      "<b>Converter</b>: <span class=\"mono\">.mcsb .mcsa .mcvd .ol .mic .texarr</span> + NBT<br /><b>Map Merge</b>: <span class=\"mono\">.ol .mic</span> (e.g. <span class=\"mono\">r-5_10.ol</span>)",
    home_quick_theme: "Default theme: <span class=\"mono\">yellow / black / white</span>. Change it in Settings.",
    home_warn_title: "Info & warnings",
    home_warn_body:
      "• Back up your source files before converting.<br />• Large batches can take time — that’s normal.<br />• In ZIP mode the result is saved to Downloads by default.<br />• If the UI looks stuck — check the Logs tab.",
    home_whatsnew_title: "What’s new",
    home_whatsnew_body:
      "• Web UI + desktop window (pywebview)<br />• Logs + settings<br />• Batch conversion to ZIP or folder<br />• Themes + background support",

    set_tab_general: "General",
    set_tab_appearance: "Appearance",
    set_tab_conversion: "Conversion",
    set_tab_logging: "Logs",

    set_general_title: "General",
    set_language: "Language",
    set_motion: "Animations",
    set_reduce_motion: "Reduce",
    set_saved_hint: "Settings are stored per-user.",

    set_info_title: "Info",
    set_version: "Version",
    set_downloads: "Downloads",
    btn_open_appdir: "Open app folder",
    btn_open_logsdir: "Open logs folder",
    btn_open_downloads: "Open Downloads",
    btn_open_log: "Open log file",

    set_theme_title: "Theme",
    set_theme_preset: "Theme",
    theme_custom: "Custom",
    set_theme_hint: "Pick a preset or customize manually.",
    set_accent: "Accent",
    set_bg: "Background",
    set_panel: "Panel",
    set_panel2: "Panel 2",
    set_text: "Text",
    set_muted: "Muted",
    set_danger: "Danger",

    set_background_title: "Background",
    set_bg_image: "Background image",
    set_enabled: "Enable",
    set_bg_file: "File",
    btn_choose_image: "Choose",
    btn_choose_folder: "Choose folder",
    btn_remove: "Remove",
    set_current: "Current",
    set_bg_opacity: "Opacity",
    set_bg_blur: "Blur",
    set_bg_hint: "The image is saved in your user profile.",

    set_conversion_title: "Conversion",
    set_default_output_mode: "Output",
    output_folder: "Folder",
    set_zip_dir: "ZIP → folder",
    set_folder_dir: "Folder → path",
    set_flags: "Flags",
    flag_preserve: "Preserve structure",
    flag_unique: "Unique names",
    flag_skeleton: "Skeleton",
    flag_anim: "Animations",
    set_model_formats: "Models",
    set_zip_auto_hint: "Auto-download ZIP when done",

    set_logging_title: "Logging",
    set_log_level: "Level",
    set_log_hint: "If something breaks — enable DEBUG and retry.",

    set_help_title: "Tips",
    set_help_body:
      "• ZIP is saved to Downloads by default.<br />• If the file doesn’t appear — open App logs.<br />• For bug reports attach the log file.",

    set_actions_title: "Actions",
    btn_save: "Save",
    btn_reset_all: "Reset",
    settings_footer_hint: "Saving applies changes immediately.",
    btn_delete: "Delete",
    btn_download: "Download",

    no_files: "No files selected.",
    choose_files: "Select files.",
    choose_mm_files: "Select .ol/.mic files.",
    need_folder_path: "For Folder mode specify a path (or choose ZIP).",
    uploading: "Uploading",
    converting: "Converting",
    error_prefix: "Error",
    ready: "ready",
    loading: "Loading…",
    loading_check_server: "Checking server…",
    loading_settings: "Loading settings…",
    loading_info: "Loading info…",

    toast_settings_saved: "Settings saved",
    toast_settings_failed: "Failed to save settings",
    toast_bg_uploaded: "Background updated",
    toast_bg_removed: "Background removed",
    toast_bg_failed: "Failed to upload background",
    toast_bg_remove_failed: "Failed to remove background",
    toast_folder_picker_unavailable: "Folder picker is available only in the desktop window. Paste the path manually.",
    toast_folder_pick_failed: "Failed to open folder picker",
  },
};

function normalizeLang(lang) {
  const v = String(lang || "").toLowerCase().trim();
  return v === "en" ? "en" : "ru";
}

function currentLang() {
  return normalizeLang(state.lang || state.cfg?.language || "ru");
}

function t(key) {
  const lang = currentLang();
  return I18N[lang]?.[key] ?? I18N.ru[key] ?? String(key);
}

function applyI18n(lang) {
  state.lang = normalizeLang(lang || state.lang || "ru");
  document.documentElement.lang = state.lang;

  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });

  $$("[data-i18n-html]").forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (!key) return;
    el.innerHTML = t(key);
  });

  $$("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) return;
    el.placeholder = t(key);
  });
}

function syncTopLangToggle(lang) {
  const l = normalizeLang(lang);
  $$('input[name="topLang"]').forEach((i) => (i.checked = i.value === l));
}

async function setLanguage(lang, { persist } = {}) {
  const l = normalizeLang(lang);
  if ($("#setLanguage")) $("#setLanguage").value = l;
  syncTopLangToggle(l);

  applyI18n(l);
  const activeView = $$(".nav-item.active")[0]?.dataset?.view || "home";
  goView(activeView);
  renderFileList();
  renderMapmergeFileList();

  if (persist) {
    if (state.cfg) state.cfg.language = l;
    try {
      await apiPostJson("/api/settings", { language: l });
    } catch (_) {}
  }
}

let loadingTipTimer = null;
let lastTipIndex = -1;

const LOADING_TIPS = {
  ru: [
    "Можно перетаскивать файлы прямо в список.",
    "Большие пакеты могут конвертироваться несколько минут — это нормально.",
    "ZIP по умолчанию сохраняется в «Загрузки».",
    "Поменяй тему и фон в «Настройках».",
    "Если что-то сломалось — включи DEBUG и повтори.",
  ],
  en: [
    "You can drag & drop files into the list.",
    "Large batches can take a few minutes — that’s normal.",
    "ZIP is saved to Downloads by default.",
    "Change theme and background in Settings.",
    "If something breaks — enable DEBUG and retry.",
  ],
};

function showLoadingTip() {
  const tipEl = $("#loadingTip");
  if (!tipEl) return;

  const lang = currentLang();
  const tips = LOADING_TIPS[lang] || LOADING_TIPS.ru;
  if (!tips.length) {
    tipEl.textContent = "";
    return;
  }

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

function notify(type, message, timeoutMs = 4200) {
  const host = $("#toasts");
  if (!host) return;

  const toast = document.createElement("div");
  const kind = String(type || "info");
  toast.className = `toast ${kind}`;

  const iconId = kind === "success" ? "check" : kind === "error" ? "error" : kind === "warn" ? "warning" : "info";

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "icon toast-icon");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `/static/icons.svg#${iconId}`);
  icon.appendChild(use);

  const body = document.createElement("div");
  body.className = "toast-body";

  const msg = document.createElement("div");
  msg.className = "toast-msg";
  msg.textContent = String(message || "");

  body.appendChild(msg);

  const actions = document.createElement("div");
  actions.className = "toast-actions";

  const close = document.createElement("button");
  close.className = "toast-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.innerHTML = `<svg class="icon"><use href="/static/icons.svg#close"></use></svg>`;

  const hide = () => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 200);
  };

  close.onclick = hide;
  actions.appendChild(close);

  toast.appendChild(icon);
  toast.appendChild(body);
  toast.appendChild(actions);
  host.appendChild(toast);

  const timer = setTimeout(hide, Math.max(1200, Number(timeoutMs) || 0));
  toast.addEventListener("mouseenter", () => clearTimeout(timer), { once: true });
}

async function pickDirectory(initialDir) {
  const api = window.pywebview?.api;
  if (!api || typeof api.pick_directory !== "function") {
    notify("warn", t("toast_folder_picker_unavailable"));
    return "";
  }

  try {
    const res = await api.pick_directory(String(initialDir || ""));
    return res ? String(res) : "";
  } catch (err) {
    notify("error", `${t("toast_folder_pick_failed")}: ${err?.message || err}`);
    return "";
  }
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

function setHealth(ok) {
  const el = $("#healthBadge");
  if (!el) return;
  el.textContent = ok ? "online" : "offline";
  el.style.borderColor = ok ? "var(--border)" : "rgba(255,255,255,0.12)";
  el.style.color = ok ? "var(--text)" : "var(--muted)";
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
  const url = cfg?.background_url || (cfg?.background_image ? `/user/${encodeURIComponent(cfg.background_image)}` : "");
  root.style.setProperty("--bg-image", enabled && url ? `url("${url}")` : "none");
  root.style.setProperty("--bg-image-opacity", String(cfg?.background_opacity ?? 0.22));
  root.style.setProperty("--bg-image-blur", `${cfg?.background_blur ?? 0}px`);
}

function applyMotion(cfg) {
  document.documentElement.classList.toggle("reduce-motion", !!cfg?.reduce_motion);
}

const THEME_PRESETS = {
  niklaser: {
    accent: "#FFD400",
    bg: "#0B0B0B",
    panel: "#121212",
    panel2: "#0F0F0F",
    text: "#FFFFFF",
    muted_text: "#CFCFCF",
    danger: "#FF4D4D",
  },
  red: {
    accent: "#FF3B3B",
    bg: "#070606",
    panel: "#120808",
    panel2: "#0D0606",
    text: "#FFF5F5",
    muted_text: "#D6B8B8",
    danger: "#FF4D4D",
  },
  neo_blue: {
    accent: "#30D1FF",
    bg: "#070A12",
    panel: "#0B1020",
    panel2: "#070C19",
    text: "#EAF2FF",
    muted_text: "#AAB7CC",
    danger: "#FF5B6B",
  },
  violet: {
    accent: "#B26CFF",
    bg: "#0B0712",
    panel: "#140B24",
    panel2: "#0E081A",
    text: "#F6F1FF",
    muted_text: "#CBB8E8",
    danger: "#FF4D7D",
  },
  terminal: {
    accent: "#35FF9A",
    bg: "#050807",
    panel: "#08110D",
    panel2: "#060C09",
    text: "#EFFFF8",
    muted_text: "#9BD9BD",
    danger: "#FF5B5B",
  },
};

function presetThemeOrNull(name) {
  const key = String(name || "").trim();
  return THEME_PRESETS[key] || null;
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

function dirname(path) {
  const p = String(path || "");
  return p.replace(/[\\/][^\\/]*$/, "");
}

function currentConvertOptions() {
  const outputMode = $$('input[name="outputMode"]').find((x) => x.checked)?.value || "zip";
  const modelFormats = $$(".mdlFmt").filter((x) => x.checked).map((x) => x.value);

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

function renderMapmergeFileList() {
  const list = $("#mmFileList");
  if (!list) return;

  const entries = Array.from(state.mmFilesByKey.entries());
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
      state.mmFilesByKey.delete(key);
      renderMapmergeFileList();
    };

    row.appendChild(name);
    actions.appendChild(size);
    actions.appendChild(btn);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

function addMapmergeFiles(files) {
  for (const file of files) {
    const key = file.webkitRelativePath || file.name;
    if (!key) continue;
    state.mmFilesByKey.set(key, file);
  }
  renderMapmergeFileList();
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

function setMmTaskUIVisible(visible) {
  $("#mmBtnStopPoll").style.display = visible ? "" : "none";
}

function goView(view) {
  const target = $(`#view-${view}`);
  if (!target) return;

  $$(".nav-item").forEach((b) => b.classList.remove("active"));
  const btn = $(`.nav-item[data-view="${view}"]`);
  if (btn) btn.classList.add("active");

  $$(".view").forEach((v) => v.classList.remove("active"));
  target.classList.add("active");

  const key = btn?.dataset?.titleKey;
  const title = key ? t(key) : btn?.dataset?.title || btn?.textContent || "sc-file";
  $("#viewTitle").textContent = String(title || "").trim();
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

function renderMmOutputs(task) {
  const list = $("#mmOutputsList");
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

async function pollMapmergeTask(taskId) {
  if (state.mmPollTimer) clearInterval(state.mmPollTimer);
  setMmTaskUIVisible(true);

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

    $("#mmTaskStatus").textContent = `${task.status} • ${done}/${total} • errors: ${task.errors ?? 0}`;
    $("#mmProgressBar").style.width = `${pct}%`;

    $("#mmTaskLogs").textContent = (task.logs || []).join("\n");
    renderMmOutputs(task);

    const outBtn = $("#mmBtnOpenOutput");
    const outDir = task.meta?.output_dir;
    outBtn.style.display = outDir ? "" : "none";
    outBtn.onclick = async () => {
      try {
        await apiPostJson("/api/open", { path: outDir });
      } catch (_) {}
    };

    if (task.status === "done" || task.status === "error") {
      clearInterval(state.mmPollTimer);
      state.mmPollTimer = null;
    }
  };

  await tick();
  state.mmPollTimer = setInterval(tick, 900);
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

function mapmergeOptions() {
  return {
    suffix: $("#mmSuffix")?.value || "jpg",
    preset: $("#mmPreset")?.value || "",
    filename: $("#mmFilename")?.value?.trim() || "Map %Y.%m.%d",
    limit: parseInt($("#mmLimit")?.value || "1000000000", 10),
    compress: parseInt($("#mmCompress")?.value || "6", 10),
    quality: parseInt($("#mmQuality")?.value || "90", 10),
    debug: $("#mmDebug")?.checked ?? false,
    overwrite: $("#mmOverwrite")?.checked ?? false,
    skip_empty: $("#mmSkipEmpty")?.checked ?? true,
  };
}

async function startMapmerge() {
  const files = Array.from(state.mmFilesByKey.entries());
  if (files.length === 0) {
    $("#mmTaskStatus").textContent = t("choose_mm_files");
    return;
  }

  const opts = mapmergeOptions();

  const fd = new FormData();
  fd.append("options", JSON.stringify(opts));
  for (const [key, file] of files) {
    fd.append("files", file, key);
  }

  setButtonLabel("#mmBtnStart", `${t("uploading")}…`);
  $("#mmBtnStart").disabled = true;
  $("#mmTaskStatus").textContent = `${t("uploading")}: 0%`;
  $("#mmProgressBar").style.width = "0%";

  try {
    const data = await postFormWithProgress("/api/mapmerge", fd, (pct) => {
      $("#mmTaskStatus").textContent = `${t("uploading")}: ${pct}%`;
      $("#mmProgressBar").style.width = `${pct}%`;
    });
    state.mmTaskId = data.task_id;
    $("#mmTaskStatus").textContent = `${t("converting")}…`;
    $("#mmProgressBar").style.width = "0%";
    await pollMapmergeTask(state.mmTaskId);
  } catch (e) {
    $("#mmTaskStatus").textContent = `${t("error_prefix")}: ${e.message || e}`;
  } finally {
    setButtonLabel("#mmBtnStart", t("mm_merge"));
    $("#mmBtnStart").disabled = false;
  }
}

function setupNav() {
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      goView(btn.dataset.view);
    });
  });
}

async function refreshAppLogs() {
  try {
    const data = await apiGet("/api/logs/tail?lines=400");
    $("#appLogs").textContent = (data.lines || []).join("\n");
  } catch (e) {
    $("#appLogs").textContent = "Не удалось прочитать лог.";
  }
}

function fillSettings(cfg) {
  if (!cfg) return;

  const themeName = String(cfg.theme_name || "niklaser").trim();
  const isKnown = ["niklaser", "red", "neo_blue", "violet", "terminal", "custom"].includes(themeName);
  const preset = isKnown ? themeName : "custom";

  if ($("#setLanguage")) $("#setLanguage").value = cfg.language || "ru";
  syncTopLangToggle(cfg.language || "ru");
  if ($("#setReduceMotion")) $("#setReduceMotion").checked = !!cfg.reduce_motion;

  if ($("#setThemePreset")) $("#setThemePreset").value = preset;

  if ($("#thAccent")) $("#thAccent").value = cfg.theme?.accent || "#ffd400";
  if ($("#thBg")) $("#thBg").value = cfg.theme?.bg || "#0b0b0b";
  if ($("#thPanel")) $("#thPanel").value = cfg.theme?.panel || "#121212";
  if ($("#thPanel2")) $("#thPanel2").value = cfg.theme?.panel2 || "#0f0f0f";
  if ($("#thText")) $("#thText").value = cfg.theme?.text || "#ffffff";
  if ($("#thMuted")) $("#thMuted").value = cfg.theme?.muted_text || "#cfcfcf";
  if ($("#thDanger")) $("#thDanger").value = cfg.theme?.danger || "#ff4d4d";

  const themeInputs = ["#thAccent", "#thBg", "#thPanel", "#thPanel2", "#thText", "#thMuted", "#thDanger"]
    .map((s) => $(s))
    .filter(Boolean);
  themeInputs.forEach((el) => (el.disabled = preset !== "custom"));

  if ($("#setBgEnabled")) $("#setBgEnabled").checked = !!cfg.background_enabled;
  if ($("#setBgOpacity")) $("#setBgOpacity").value = String(cfg.background_opacity ?? 0.22);
  if ($("#setBgBlur")) $("#setBgBlur").value = String(cfg.background_blur ?? 0);
  if ($("#setBgCurrent")) $("#setBgCurrent").textContent = cfg.background_image || "—";

  if ($("#setDefaultOutputMode")) $("#setDefaultOutputMode").value = cfg.default_output_mode || "zip";
  if ($("#setDefaultOutputDir")) $("#setDefaultOutputDir").value = cfg.default_output_dir || "";
  if ($("#setDefaultZipDir")) $("#setDefaultZipDir").value = cfg.default_zip_dir || "";

  if ($("#setPreserve")) $("#setPreserve").checked = !!cfg.preserve_structure;
  if ($("#setUnique")) $("#setUnique").checked = !!cfg.unique_names;
  if ($("#setSkeleton")) $("#setSkeleton").checked = !!cfg.parse_skeleton;
  if ($("#setAnimation")) $("#setAnimation").checked = !!cfg.parse_animation;

  if ($("#setAutoDownloadZip")) $("#setAutoDownloadZip").checked = cfg.auto_download_zip ?? true;

  if ($("#setLogLevel")) $("#setLogLevel").value = String(cfg.log_level || "INFO").toUpperCase();

  // Apply defaults to converter UI
  const modeInputs = $$('input[name="outputMode"]');
  modeInputs.forEach((i) => (i.checked = i.value === (cfg.default_output_mode || "zip")));
  if ($("#outputDir")) $("#outputDir").value = cfg.default_output_dir || "";
  if ($("#optPreserve")) $("#optPreserve").checked = !!cfg.preserve_structure;
  if ($("#optUnique")) $("#optUnique").checked = !!cfg.unique_names;
  if ($("#optSkeleton")) $("#optSkeleton").checked = !!cfg.parse_skeleton;
  if ($("#optAnimation")) $("#optAnimation").checked = !!cfg.parse_animation;

  const formats = new Set((cfg.model_formats || []).map((x) => String(x).toLowerCase()));
  $$(".mdlFmt").forEach((c) => (c.checked = formats.size ? formats.has(c.value) : c.checked));

  const outputMode = $$('input[name="outputMode"]').find((x) => x.checked)?.value || "zip";
  if ($("#rowOutputDir")) $("#rowOutputDir").style.display = outputMode === "folder" ? "" : "none";
}

function setActiveSettingsTab(tab) {
  const tname = tab || "general";
  $$(".settings-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === tname));
}

function setupSettingsTabs() {
  const inputs = $$('input[name="settingsTab"]');
  if (!inputs.length) return;
  const sync = () => {
    const tab = inputs.find((x) => x.checked)?.value || "general";
    setActiveSettingsTab(tab);
  };
  inputs.forEach((i) => i.addEventListener("change", sync));
  sync();
}

function themeFromInputs() {
  return {
    accent: $("#thAccent")?.value || "#ffd400",
    bg: $("#thBg")?.value || "#0b0b0b",
    panel: $("#thPanel")?.value || "#121212",
    panel2: $("#thPanel2")?.value || $("#thPanel")?.value || "#0f0f0f",
    text: $("#thText")?.value || "#ffffff",
    muted_text: $("#thMuted")?.value || "#cfcfcf",
    danger: $("#thDanger")?.value || "#ff4d4d",
  };
}

function applyPresetToThemeInputs(preset) {
  const t0 = presetThemeOrNull(preset);
  if (!t0) return false;
  if ($("#thAccent")) $("#thAccent").value = t0.accent;
  if ($("#thBg")) $("#thBg").value = t0.bg;
  if ($("#thPanel")) $("#thPanel").value = t0.panel;
  if ($("#thPanel2")) $("#thPanel2").value = t0.panel2 || t0.panel;
  if ($("#thText")) $("#thText").value = t0.text;
  if ($("#thMuted")) $("#thMuted").value = t0.muted_text || "#cfcfcf";
  if ($("#thDanger")) $("#thDanger").value = t0.danger || "#ff4d4d";
  applyTheme(t0);
  return true;
}

function setThemeInputsEnabled(enabled) {
  ["#thAccent", "#thBg", "#thPanel", "#thPanel2", "#thText", "#thMuted", "#thDanger"].forEach((sel) => {
    const el = $(sel);
    if (el) el.disabled = !enabled;
  });
}

function collectSettingsPayload() {
  return {
    language: $("#setLanguage")?.value || "ru",
    reduce_motion: $("#setReduceMotion")?.checked ?? false,

    theme_name: $("#setThemePreset")?.value || "niklaser",
    theme: themeFromInputs(),

    background_enabled: $("#setBgEnabled")?.checked ?? false,
    background_opacity: parseFloat($("#setBgOpacity")?.value || "0.22"),
    background_blur: parseInt($("#setBgBlur")?.value || "0", 10),

    default_output_mode: $("#setDefaultOutputMode")?.value || "zip",
    default_output_dir: $("#setDefaultOutputDir")?.value?.trim() || "",
    default_zip_dir: $("#setDefaultZipDir")?.value?.trim() || "",
    preserve_structure: $("#setPreserve")?.checked ?? true,
    unique_names: $("#setUnique")?.checked ?? true,
    parse_skeleton: $("#setSkeleton")?.checked ?? true,
    parse_animation: $("#setAnimation")?.checked ?? false,
    model_formats: $$(".mdlFmt").filter((x) => x.checked).map((x) => x.value),

    auto_download_zip: $("#setAutoDownloadZip")?.checked ?? true,

    log_level: $("#setLogLevel")?.value || "INFO",
  };
}

async function saveSettings() {
  const payload = collectSettingsPayload();
  const res = await apiPostJson("/api/settings", payload);

  if (res?.cfg) state.cfg = res.cfg;
  else state.cfg = await apiGet("/api/settings");

  applyTheme(state.cfg.theme);
  applyBackground(state.cfg);
  applyMotion(state.cfg);
  applyI18n(state.cfg.language || "ru");

  fillSettings(state.cfg);

  // Keep the current title in sync after language/theme changes.
  const activeView = $$(".nav-item.active")[0]?.dataset?.view || "home";
  goView(activeView);

  return state.cfg;
}

async function uploadBackground(file) {
  const fd = new FormData();
  fd.append("file", file, file.name);

  const r = await fetch("/api/ui/background", { method: "POST", body: fd });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const data = await r.json();

  state.cfg = state.cfg || {};
  state.cfg.background_image = data.filename;
  state.cfg.background_enabled = true;
  state.cfg.background_url = data.url;

  if ($("#setBgEnabled")) $("#setBgEnabled").checked = true;
  if ($("#setBgCurrent")) $("#setBgCurrent").textContent = data.filename || "—";

  applyBackground(state.cfg);
}

async function deleteBackground() {
  const r = await fetch("/api/ui/background", { method: "DELETE" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);

  state.cfg = state.cfg || {};
  state.cfg.background_image = "";
  state.cfg.background_enabled = false;
  state.cfg.background_url = "";

  if ($("#setBgEnabled")) $("#setBgEnabled").checked = false;
  if ($("#setBgCurrent")) $("#setBgCurrent").textContent = "—";

  applyBackground(state.cfg);
}


async function main() {
  applyI18n(state.lang);

  setupNav();
  setupSettingsTabs();
  goView("home");
  setLoading(true, t("loading_check_server"));

  try {
    const ok = await apiGet("/api/health");
    setHealth(!!ok.ok);
  } catch (e) {
    setHealth(false);
  }

  try {
    setLoading(true, t("loading_settings"));
    state.cfg = await apiGet("/api/settings");
    applyTheme(state.cfg.theme);
    applyBackground(state.cfg);
    applyMotion(state.cfg);
    applyI18n(state.cfg.language || "ru");
    fillSettings(state.cfg);
    $("#appInfo").textContent = t("ready");
  } catch (e) {
    $("#appInfo").textContent = "config error";
  }

  try {
    setLoading(true, t("loading_info"));
    state.info = await apiGet("/api/info");

    if ($("#infoVersion"))
      $("#infoVersion").textContent = `sc-file ${state.info.scfile_version} • web ${state.info.web_version}`;
    if ($("#infoAppDir")) $("#infoAppDir").textContent = state.info.app_dir || "—";
    if ($("#infoLogFile")) $("#infoLogFile").textContent = state.info.log_path || "—";
    if ($("#infoDownloadsDir")) $("#infoDownloadsDir").textContent = state.info.downloads_dir || "—";

    if ($("#appInfo")) $("#appInfo").textContent = `v${state.info.scfile_version} • Niklaser`;

    if ($("#setDefaultZipDir") && !$("#setDefaultZipDir").value) {
      $("#setDefaultZipDir").value = state.info.downloads_dir || "";
    }
  } catch (e) {
    // non-fatal
  }

  $("#btnAddFiles").onclick = () => $("#inputFiles").click();
  $("#btnAddFolder").onclick = () => $("#inputFolder").click();
  $("#btnClearFiles").onclick = () => {
    state.filesByKey.clear();
    renderFileList();
  };

  $("#inputFiles").addEventListener("change", (e) => addSelectedFiles(e.target.files));
  $("#inputFolder").addEventListener("change", (e) => addSelectedFiles(e.target.files));

  $("#mmBtnAddFiles").onclick = () => $("#mmInputFiles").click();
  $("#mmBtnAddFolder").onclick = () => $("#mmInputFolder").click();
  $("#mmBtnClearFiles").onclick = () => {
    state.mmFilesByKey.clear();
    renderMapmergeFileList();
  };

  $("#mmInputFiles").addEventListener("change", (e) => addMapmergeFiles(e.target.files));
  $("#mmInputFolder").addEventListener("change", (e) => addMapmergeFiles(e.target.files));

  setupDropzone($("#fileList"), addSelectedFiles);
  setupDropzone($("#mmFileList"), addMapmergeFiles);

  $("#homeGoConvert").onclick = () => goView("convert");
  $("#homeGoMapmerge").onclick = () => goView("mapmerge");
  if ($("#homeGoLogs")) $("#homeGoLogs").onclick = () => goView("logs");
  $("#homeGoSettings").onclick = () => goView("settings");
  if ($("#menuConvert")) $("#menuConvert").onclick = () => goView("convert");
  if ($("#menuMapmerge")) $("#menuMapmerge").onclick = () => goView("mapmerge");
  if ($("#menuSettings")) $("#menuSettings").onclick = () => goView("settings");
  if ($("#menuLogs")) $("#menuLogs").onclick = () => goView("logs");

  $$('input[name="outputMode"]').forEach((i) =>
    i.addEventListener("change", () => {
      const mode = $$('input[name="outputMode"]').find((x) => x.checked)?.value || "zip";
      $("#rowOutputDir").style.display = mode === "folder" ? "" : "none";
    })
  );

  $("#btnStartConvert").onclick = startConvert;
  $("#btnStopPoll").onclick = () => {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
    $("#btnStopPoll").style.display = "none";
  };

  $("#mmBtnStart").onclick = startMapmerge;
  $("#mmBtnStopPoll").onclick = () => {
    if (state.mmPollTimer) clearInterval(state.mmPollTimer);
    state.mmPollTimer = null;
    $("#mmBtnStopPoll").style.display = "none";
  };

  if ($("#mmFilename") && !$("#mmFilename").value) {
    $("#mmFilename").value = "Map %Y.%m.%d";
  }

  $("#btnRefreshLogs").onclick = refreshAppLogs;
  await refreshAppLogs();

  // Settings: live preview
  if ($("#setLanguage")) {
    $("#setLanguage").addEventListener("change", () => {
      const lang = $("#setLanguage").value || "ru";
      setLanguage(lang);
    });
  }

  $$('input[name="topLang"]').forEach((i) =>
    i.addEventListener("change", () => {
      if (!i.checked) return;
      setLanguage(i.value, { persist: true });
    })
  );

  if ($("#setReduceMotion")) {
    $("#setReduceMotion").addEventListener("change", () => {
      state.cfg = state.cfg || {};
      state.cfg.reduce_motion = $("#setReduceMotion").checked;
      applyMotion(state.cfg);
    });
  }

  if ($("#setThemePreset")) {
    $("#setThemePreset").addEventListener("change", () => {
      const preset = $("#setThemePreset").value || "custom";
      if (preset === "custom") {
        setThemeInputsEnabled(true);
        applyTheme(themeFromInputs());
        return;
      }
      setThemeInputsEnabled(false);
      applyPresetToThemeInputs(preset);
    });
  }

  ["#thAccent", "#thBg", "#thPanel", "#thPanel2", "#thText", "#thMuted", "#thDanger"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("input", () => {
      if ($("#setThemePreset") && $("#setThemePreset").value !== "custom") {
        $("#setThemePreset").value = "custom";
        setThemeInputsEnabled(true);
      }
      applyTheme(themeFromInputs());
    });
  });

  if ($("#setBgEnabled")) {
    $("#setBgEnabled").addEventListener("change", () => {
      state.cfg = state.cfg || {};
      state.cfg.background_enabled = $("#setBgEnabled").checked;
      applyBackground({ ...state.cfg, background_opacity: Number($("#setBgOpacity")?.value || 0.22), background_blur: Number($("#setBgBlur")?.value || 0) });
    });
  }

  if ($("#setBgOpacity")) {
    $("#setBgOpacity").addEventListener("input", () => {
      state.cfg = state.cfg || {};
      state.cfg.background_opacity = parseFloat($("#setBgOpacity").value || "0.22");
      applyBackground(state.cfg);
    });
  }

  if ($("#setBgBlur")) {
    $("#setBgBlur").addEventListener("input", () => {
      state.cfg = state.cfg || {};
      state.cfg.background_blur = parseInt($("#setBgBlur").value || "0", 10);
      applyBackground(state.cfg);
    });
  }

  if ($("#btnChooseBg") && $("#setBgFile")) {
    $("#btnChooseBg").onclick = () => $("#setBgFile").click();
    $("#setBgFile").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await uploadBackground(file);
        notify("success", t("toast_bg_uploaded"));
      } catch (err) {
        notify("error", `${t("toast_bg_failed")}: ${err?.message || err}`);
      }
      e.target.value = "";
    });
  }

  if ($("#btnClearBg")) {
    $("#btnClearBg").onclick = async () => {
      try {
        await deleteBackground();
        notify("info", t("toast_bg_removed"));
      } catch (err) {
        notify("error", `${t("toast_bg_remove_failed")}: ${err?.message || err}`);
      }
    };
  }

  if ($("#btnPickZipDir")) {
    $("#btnPickZipDir").onclick = async () => {
      const initial = $("#setDefaultZipDir")?.value?.trim() || state.info?.downloads_dir || "";
      const picked = await pickDirectory(initial);
      if (!picked) return;
      if ($("#setDefaultZipDir")) $("#setDefaultZipDir").value = picked;
    };
  }

  if ($("#btnPickOutputDir")) {
    $("#btnPickOutputDir").onclick = async () => {
      const initial = $("#setDefaultOutputDir")?.value?.trim() || state.info?.downloads_dir || "";
      const picked = await pickDirectory(initial);
      if (!picked) return;
      if ($("#setDefaultOutputDir")) $("#setDefaultOutputDir").value = picked;
      if ($("#outputDir")) $("#outputDir").value = picked;
    };
  }

  if ($("#btnSaveSettings")) {
    $("#btnSaveSettings").onclick = async () => {
      try {
        await saveSettings();
        notify("success", t("toast_settings_saved"));
      } catch (err) {
        notify("error", `${t("toast_settings_failed")}: ${err?.message || err}`);
      }
    };
  }

  if ($("#btnResetSettings")) {
    $("#btnResetSettings").onclick = async () => {
      if ($("#setLanguage")) $("#setLanguage").value = "ru";
      if ($("#setReduceMotion")) $("#setReduceMotion").checked = false;

      if ($("#setThemePreset")) $("#setThemePreset").value = "niklaser";
      setThemeInputsEnabled(false);
      applyPresetToThemeInputs("niklaser");

      if ($("#setBgEnabled")) $("#setBgEnabled").checked = false;
      if ($("#setBgOpacity")) $("#setBgOpacity").value = "0.22";
      if ($("#setBgBlur")) $("#setBgBlur").value = "0";

      if ($("#setDefaultOutputMode")) $("#setDefaultOutputMode").value = "zip";
      if ($("#setDefaultOutputDir")) $("#setDefaultOutputDir").value = "";
      if ($("#setDefaultZipDir")) $("#setDefaultZipDir").value = state.info?.downloads_dir || "";

      if ($("#setPreserve")) $("#setPreserve").checked = true;
      if ($("#setUnique")) $("#setUnique").checked = true;
      if ($("#setSkeleton")) $("#setSkeleton").checked = true;
      if ($("#setAnimation")) $("#setAnimation").checked = false;

      if ($("#setAutoDownloadZip")) $("#setAutoDownloadZip").checked = true;
      if ($("#setLogLevel")) $("#setLogLevel").value = "INFO";

      // Apply preview (not saved yet)
      applyI18n($("#setLanguage")?.value || "ru");
      applyMotion({ reduce_motion: $("#setReduceMotion")?.checked ?? false });
      applyBackground({
        ...(state.cfg || {}),
        background_enabled: $("#setBgEnabled")?.checked ?? false,
        background_opacity: parseFloat($("#setBgOpacity")?.value || "0.22"),
        background_blur: parseInt($("#setBgBlur")?.value || "0", 10),
      });
    };
  }

  $("#btnOpenAppDir").onclick = async () => {
    if (!state.info?.app_dir) return;
    try {
      await apiPostJson("/api/open", { path: state.info.app_dir });
    } catch (_) {}
  };

  $("#btnOpenLogFile").onclick = async () => {
    if (!state.info?.log_path) return;
    try {
      await apiPostJson("/api/open", { path: state.info.log_path });
    } catch (_) {}
  };

  $("#btnOpenLogsDir").onclick = async () => {
    const logsDir = dirname(state.info?.log_path);
    if (!logsDir) return;
    try {
      await apiPostJson("/api/open", { path: logsDir });
    } catch (_) {}
  };

  if ($("#btnOpenDownloadsDir")) {
    $("#btnOpenDownloadsDir").onclick = async () => {
      if (!state.info?.downloads_dir) return;
      try {
        await apiPostJson("/api/open", { path: state.info.downloads_dir });
      } catch (_) {}
    };
  }

  try {
    const presets = await apiGet("/api/mapmerge/presets");
    const sel = $("#mmPreset");
    for (const name of presets.presets || []) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    }
  } catch (_) {}

  renderFileList();
  renderMapmergeFileList();

  setLoading(false);
}

main();
