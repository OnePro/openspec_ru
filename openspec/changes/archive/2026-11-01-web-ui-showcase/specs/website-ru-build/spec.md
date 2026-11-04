# Дельта спецификации

## MODIFIED Requirements

### Requirement: Сайт открывается обзором openspec-ru

Собранный сайт SHALL перенаправлять `/` и `/docs` на `/docs/ru` (обзор openspec-ru), а секция «OpenSpec RU» SHALL быть первой в сайдбаре. Страница `/docs/ru` MUST начинаться с презентации встроенной веб-панели openspec-ru (со скриншотами `/assets/openspec-ru-ui-kanban.png` и `/assets/openspec-ru-ui-specs.png` и командами запуска), содержать дисклеймер неофициальности и ссылку на обычную документацию OpenSpec.

#### Scenario: Первый визит

- **WHEN** посетитель открывает корень сайта
- **THEN** он попадает на обзор openspec-ru с презентацией веб-панели, дисклеймером неофициальности и путём к установке

#### Scenario: Скриншоты и команды веб-панели в начале главной страницы

- **WHEN** собран сайт и открыта страница `/docs/ru`
- **THEN** в начале страницы отображаются скриншоты Канбан-доски и спецификаций (`/assets/openspec-ru-ui-kanban.png`, `/assets/openspec-ru-ui-specs.png`), вызов через агента («открой спеки», `/opsx:ui`) и команды `openspec-ru start web` / `openspec-ru stop web`, а сами изображения присутствуют в `dist-website/assets/`

#### Scenario: Сайдбар

- **WHEN** открыта любая страница документации
- **THEN** первой секцией сайдбара идёт «OpenSpec RU», за ней — секции переведённой документации OpenSpec
