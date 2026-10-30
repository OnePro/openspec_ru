# Задачи

## 1. Сканер данных `openspec/`

- [x] 1.1 Реализовать `tools/web/scanner.mjs` (чтение `openspec/specs/**/spec.md`, `openspec/changes/**` и `openspec/changes/archive/**`, поддержка пустых изменений с `.openspec.yaml`, нормализация путей `/` на Windows/Linux/macOS) и покрыть unit-тестами `tools/web/scanner.test.mjs`
- [x] 1.2 Проверить сканер на реальном каталоге `openspec/` текущего репозитория: корректно возвращаются все основные спецификации и изменения (включая заархивированные с датой)

## 2. HTTP + SSE сервер и управление процессом

- [x] 2.1 Реализовать `tools/web/server.mjs`: эндпоинты `GET /`, `GET /api/state`, `GET /api/events` (SSE + `fs.watch` с дебаунсом 250 мс), `POST /api/shutdown`, автовыбор порта (`3000` по умолчанию или `--port`), запись/очистка файла состояния процесса и блокировка запуска при отсутствии `openspec/` (код возврата `1`)
- [x] 2.2 Подключить команды `openspec-ru start web [--port <port>] [--no-open]` (и алиас `ui`) и `openspec-ru stop web` в `tools/apply/cli.mjs` со справкой `--help`; добавить npm-скрипты `web:start` и `web:stop` в `package.json`

## 3. Веб-интерфейс (`tools/web/ui.html`)

- [x] 3.1 Перенести дизайн-макет из `C:\Users\egor\Downloads\openspec-ru-ui.html` в `tools/web/ui.html`, заменив демо-блоки `<script type="text/markdown">` на живую загрузку `fetch('/api/state')` и подписку `EventSource('/api/events')` с пересборкой `changes` и `specs` на лету
- [x] 3.2 Добавить в шапку `tools/web/ui.html` отображение реального имени репозитория и версии бандла из `/api/state`, привязку индикатора `Live / Отключено` к `EventSource` и кнопку выключения сервера (`POST /api/shutdown`)

## 4. Интеграционные тесты и документация

- [x] 4.1 Написать E2E-тесты `tools/web/web.test.mjs`: блокировка `start web` в папке без `openspec/` (код `1`), запуск сервера на свободном порту, проверка `GET /api/state` (черновик без `tasks.md` в статусе `draft`, русские спецификации на Windows), получение SSE-события `update` при изменении файла и остановка через `stop web` / `POST /api/shutdown`
- [x] 4.2 Обновить `README.md`: добавить раздел про запуск (`npx github:OnePro/openspec_ru start web [--port 3000]`) и остановку (`npx github:OnePro/openspec_ru stop web`) веб-панели

## 5. Фоновый режим (`--detach`) и AI-скилл `openspec-ui`

- [x] 5.1 Добавить флаг `--detach` (`-d`) в `openspec-ru start web` (`tools/web/server.mjs` и `tools/apply/cli.mjs`): отвязанный фоновый запуск с проверкой готовности по state-файлу и переиспользованием уже запущенного сервера; покрыть тестом в `tools/web/web.test.mjs`
- [x] 5.2 Добавить скилл `openspec-ui` (`SKILL.md`) и slash-команду `ui` (`/opsx:ui` / `/opsx-ui`) в `tools/build-ru.mjs` и `dist-ru/` (для `skills/`, `tool-skills/<tool>/` и `commands/<tool>/`), доработать `tools/apply/index.mjs`, чтобы `applyRuPatch` устанавливал/обновлял их для каждого обнаруженного в проекте инструмента; проверить тестами и применить в текущем репозитории

## Последующие шаги процесса

- Заархивировать change после выполнения всех задач и проверки работы веб-панели в браузере.
