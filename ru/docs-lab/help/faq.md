# Часто задаваемые вопросы

> Короткие ответы на вопросы, которые не требуют отдельной страницы.

<!-- WIP, on the todo list: this page is not written yet and is held back from the
site (its section is commented out in website/docs.sync.config.mjs, 2026-08-21). The
file stays so the structure and inbound links survive; re-list it in the sync config
once the prose lands. -->

<!-- Every entry is a one-liner: a short answer or a router link to the page that owns the topic; how-to content never lives here (README's "FAQ is one-liners" rule). Update/uninstall moved to installation.md; the skills-missing fix and Getting help live in troubleshooting.md; the git question is a one-line yes routing to guides/teams.md, which owns the team conventions. Unfilled headings are skeletons. -->

## Нужно ли добавлять openspec/ в git?

## Что выполняется в терминале, а что — в чате?

## Работает ли OpenSpec с моим инструментом?

Если для него есть строка в [матрице поддержки](../reference/supported-tools.md), да.
Выберите его id при инициализации. Если его нет в списке, но он читает общую папку `.agents/skills/`,
выберите **Other / Universal** (`--tools agents`) — этот вариант описан в разделе Other / Universal
матрицы поддержки. Если ни один вариант не подходит, оставьте запрос в
[репозитории OpenSpec](https://github.com/Fission-AI/OpenSpec/issues).

## Куда исчезли старые команды /openspec:*?
