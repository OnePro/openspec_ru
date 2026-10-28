/**
 * Экспорты шаблонов для OpenSpec.
 *
 * Старые шаблоны конфигурационных файлов (AGENTS.md, project.md, claude-template и т. д.)
 * удалены. Процесс на основе SKILL.md использует skill-templates.ts напрямую.
 */

// Повторно экспортируем все шаблоны skill и связанные типы через фасад совместимости.
export * from './skill-templates.js';
