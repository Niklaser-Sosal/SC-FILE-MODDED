# SC-FILE:MODDED

<p align="center">
  <img src="webapp/static/app_icon.png" alt="SC-FILE:MODDED" width="96" height="96" />
  <img src="webapp/static/github-svgrepo-com.svg" alt="GitHub" width="28" height="28" />
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-yellow?style=flat-square" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-windows%20%7C%20linux-black?style=flat-square" />
  <img alt="UI" src="https://img.shields.io/badge/ui-web%20%7C%20pywebview-yellow?style=flat-square" />
  <img alt="Build" src="https://img.shields.io/badge/build-pyinstaller-black?style=flat-square" />
  <img alt="Status" src="https://img.shields.io/badge/status-stable-yellow?style=flat-square" />
</p>

Модифицированная версия `sc-file` с современным Web UI и desktop-окном (pywebview).  
Проект ориентирован на локальную работу: файлы обрабатываются на вашем ПК.

## Возможности

- Пакетная конвертация ассетов в ZIP или папку
- Map Merge (склейка регионов карты в изображения)
- Темы, фон, язык, настройки вывода
- Логи и журнал задач
- Desktop-окно (pywebview) или запуск в браузере

## Структура

```
sc-file-4.2.1/          # исходники sc-file
sc-mapmerge-2.1.1/      # исходники sc-mapmerge
webapp/static/          # фронтенд (HTML/CSS/JS + ассеты)
scfile-web.bat          # запуск Web UI (Windows)
scfile-setup.bat        # установка зависимостей (Windows)
build.py                # сборка exe через PyInstaller
```

## Быстрый старт (Windows)

1. Запуск и автоустановка зависимостей:
   ```bat
   scfile-web.bat
   ```
2. Если нужен принудительный setup:
   ```bat
   scfile-setup.bat
   ```

## Сборка EXE (Windows)

```bat
sc-file-4.2.1\.venv\Scripts\python.exe -m PyInstaller scfile_webapp_entry.py --name SC-FILE_MODDED --clean --onefile --noconsole --paths sc-file-4.2.1 --paths sc-mapmerge-2.1.1 --add-data "webapp\static;webapp\static" -i webapp\static\app_icon.ico --hidden-import zstandard --hidden-import rich._unicode_data.unicode17-0-0 --hidden-import rich._unicode_data --collect-data rich --collect-submodules webview --collect-submodules scmapmerge --collect-data scmapmerge
```

## Сборка (Linux)

Собирать нужно **на Linux** (PyInstaller не кросс‑компилирует):

```bash
python3.11 -m venv sc-file-4.2.1/.venv
./sc-file-4.2.1/.venv/bin/python -m pip install -r sc-file-4.2.1/requirements.txt -r sc-file-4.2.1/requirements-web.txt
./sc-file-4.2.1/.venv/bin/python -m PyInstaller scfile_webapp_entry.py \
  --name SC-FILE_MODDED \
  --clean --onefile --noconsole \
  --paths sc-file-4.2.1 --paths sc-mapmerge-2.1.1 \
  --add-data "webapp/static:webapp/static" \
  -i webapp/static/app_icon.ico \
  --hidden-import zstandard \
  --hidden-import rich._unicode_data.unicode17-0-0 \
  --hidden-import rich._unicode_data \
  --collect-data rich \
  --collect-submodules webview \
  --collect-submodules scmapmerge \
  --collect-data scmapmerge
```

## Шрифты

Файлы лежат в `webapp/static/fonts/`:
- `Europe-Book-Edited.otf`
- `JetBrainsMono.ttf`
- `JetBrainsMono-Italic.ttf`
- `arialmt.ttf`

Если шрифт не установлен или файл отсутствует, используется ближайший доступный.

## Логи

По умолчанию логи сохраняются в `logs/` рядом с `.bat`:

```
logs/sc-file-web.log
```

## Лицензия и ответственность

Проект предоставляется «как есть». Автор программы не несёт ответственности за ваши действия.
