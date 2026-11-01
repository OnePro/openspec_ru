# Задачи

## 1. Перевод контента docs-lab (42 файла)

- [x] 1.1 Перевод 41 pending-файла зоны `docs-lab` в `ru/docs-lab/` через `translate.mjs` (kimi k3.1-pro, advisor claude-sonnet-5.5), порядок — от малых к крупным; терминологические правки глоссария по ходу волны. Проверка: каждая запись зоны имеет статус не ниже `machine`, RU-файл на диске.
- [x] 1.2 Advisor-ревью существующего machine-файла `start/installation.md` без переперевода; точечная правка замечаний. Проверка: статус `reviewed`.
- [x] 1.3 Доработка замечаний ревью по файлам волны до статуса `reviewed`. Проверка: все 42 записи зоны `docs-lab` — `reviewed`.

## 2. Итоговая проверка

- [x] 2.1 `npm run validate:ru` — все файлы валидны; `npm test` зелёный (кроме известного pre-existing `installGlobalCliShim`); записи зоны `docs-lab` — `reviewed` с актуальным base_blob_sha.
