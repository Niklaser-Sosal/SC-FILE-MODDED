# SC-FILE:MODDED — Руководство по кастомизации

Этот файл описывает, как менять внешний вид и поведение приложения без переписывания всей логики.

## 1) Где лежат основные файлы

- Основной frontend: `webapp/static/`
- Встроенная копия frontend (fallback внутри пакета): `sc-file-4.3.0/scfile/webapp/static/`
- Сервер и API: `sc-file-4.3.0/scfile/webapp/server.py`
- Desktop-окна (pywebview): `sc-file-4.3.0/scfile/webapp/runner.py`

Важно: если меняете frontend, синхронизируйте изменения в обе папки `static`.

## 2) Темы (цвета интерфейса)

Пресеты тем находятся в:

- `webapp/static/app.js` → `THEME_PRESETS`

Каждый пресет содержит:

- `accent`
- `bg`
- `panel`
- `panel2`
- `text`
- `muted_text`
- `danger`

Чтобы добавить свою тему:

1. Добавьте новый объект в `THEME_PRESETS`.
2. Добавьте `<option value="your_theme">Your Theme</option>` в `webapp/static/index.html` (селектор темы).
3. Добавьте ключ `your_theme` в список `isKnown` в `app.js` (если требуется в текущей версии кода).

## 3) Иконки интерфейса

- SVG-спрайт: `webapp/static/icons.svg`
- Тематические SVG (map/model/anime/fast): в той же папке `webapp/static/`

Если иконка должна перекрашиваться от темы, используйте `currentColor` в SVG или CSS-mask подход (как в `model_view.html`).

## 4) Фон и декоративные изображения

### Встроенные фоны

- Папка: `webapp/static/backrounds/`

### Пользовательский фон

Настраивается через UI (`Settings -> Appearance`), сохраняется в профиле пользователя.


## 5) Шрифты

Шрифты лежат в:

- `webapp/static/fonts/`

Используемые профили:

- `Europe-Book-Edited`
- `Arial`
- `JetBrains Mono`

Логика переключения шрифта: `applyFont()` в `webapp/static/app.js`.

## 6) Watermark (карта/модель/текстуры)

### Карта

- Генерация watermark на сервере: `sc-file-4.3.0/scfile/webapp/server.py` (`_apply_map_watermark`)

### Модель

- Клиентский watermark-паттерн: `webapp/static/model_view.js` (`buildWatermarkPattern`)

### Текстуры

- Клиентский watermark-паттерн: `webapp/static/texture_view.js` (`buildWatermarkPattern`)

Можно менять:

- текст watermark
- прозрачность (`opacity` в HTML/CSS)
- размер паттерна (`background-size`)
- шрифт/вес/угол наклона в canvas-рендере

## 7) Осмотр DDS-текстур

Preview для `.dds` идёт через отдельный API:

- `GET /api/tasks/{task_id}/texture-preview/{rel_path}`

Реализация:

- `sc-file-4.3.0/scfile/webapp/server.py` (`task_texture_preview`)

Особенности:

- для не-DDS возвращается исходный файл
- для DDS создаётся кэшированный WEBP-preview
- для очень больших DDS применяется downscale для ускорения загрузки

## 8) Логи

Логи расположены в:

- `SC-FILE-M-Logs/`
- `logs/sc-file-web.log`

Путь и уровень логирования меняются через настройки (`Settings -> Logs`) и backend-конфиг.

## 9) Локализация (RU/EN)

Основные словари переводов:

- `webapp/static/app.js` → объект `I18N`
- отдельные окна (`map_view.js`, `model_view.js`, `texture_view.js`) имеют свой `I18N`

Чтобы добавить строку:

1. Добавьте ключ в RU и EN.
2. Используйте `data-i18n` / `data-i18n-html` в HTML или `t("key")` в JS.

## 10) Рекомендованный workflow при кастомизации

1. Внести правки в `webapp/static/...`
2. Скопировать изменения в `sc-file-4.3.0/scfile/webapp/static/...`
3. Проверить синтаксис:
   - `node --check webapp/static/app.js`
   - `node --check webapp/static/map_view.js`
   - `node --check webapp/static/model_view.js`
   - `node --check webapp/static/texture_view.js`
4. Для backend:
   - `python -m py_compile sc-file-4.3.0/scfile/webapp/server.py`

## 11) Что не ломать

- Не удаляйте fallback-статик в `sc-file-4.3.0/scfile/webapp/static/`.
- Не меняйте маршруты API без синхронной правки frontend.
- Не коммитьте временные `build/`, `dist/`, `__pycache__/` в релизный PR.
