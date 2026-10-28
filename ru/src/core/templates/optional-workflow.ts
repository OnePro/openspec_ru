/**
 * Условные конструкции Optional-Workflow
 *
 * Не каждый процесс установлен. Профиль `core` поставляет шесть из двенадцати
 * (`propose`, `explore`, `apply`, `update`, `sync`, `archive`), а профиль `custom`
 * может поставлять любое подмножество. Шаблон, который упоминает `/opsx:continue`,
 * поэтому создаёт мёртвую ссылку для всех, чей профиль её не включает, —
 * агенту предлагается передать управление процессу, который никогда не был
 * сгенерирован (#1734, umbrella #919).
 *
 * `command-references.ts` изменяет написание ссылки; этот модуль решает,
 * будет ли она вообще выведена. Шаблоны описывают обе ветви через
 * `optionalWorkflow()`, а `resolveOptionalWorkflows()` выбирает одну из них
 * на этапе генерации на основе разрешённого набора процессов, так что
 * сгенерированный файл содержит один конкретный путь вместо того, чтобы
 * заставлять модель проверять доступность во время выполнения.
 */

const OPEN = '[[opsx:if-workflow ';
const OPEN_END = ']]';
const ELSE = '[[opsx:else]]';
const END = '[[opsx:end]]';

/**
 * Условная конструкция, занимающая целую строку. Проверяется первой, чтобы
 * ветвь, разрешающаяся в пустую строку, уносила с собой свою строку, —
 * иначе при удалении строки таблицы или пункта списка осталась бы пустая
 * строка, которую Markdown трактует как конец таблицы или списка.
 */
const WHOLE_LINE_PATTERN =
  /^([ \t]*)\[\[opsx:if-workflow ([a-z-]+)\]\]([^\n]*?)\[\[opsx:else\]\]([^\n]*?)\[\[opsx:end\]\][ \t]*\r?\n/gm;

const CONDITIONAL_PATTERN =
  /\[\[opsx:if-workflow ([a-z-]+)\]\]([\s\S]*?)\[\[opsx:else\]\]([\s\S]*?)\[\[opsx:end\]\]/g;

/** Любой остаточный маркер, используется для громкого сбоя при ошибочном написании. */
const RESIDUAL_MARKER_PATTERN = /\[\[opsx:(if-workflow|else|end)/;

/** Один корректный маркер в любой позиции. */
const MARKER_PATTERN = /\[\[opsx:(?:if-workflow [a-z-]+|else|end)\]\]/g;

/** Всё, что открывается как маркер, корректный или нет. */
const MARKER_LIKE_PATTERN = /\[\[opsx:/;

/**
 * Отклоняет некорректную условную конструкцию до выбора любой ветви.
 *
 * Проверки после разрешения недостаточно: невыбранная ветвь отбрасывается
 * первой, поэтому усечённый блок внутри неё прошёл бы для одного профиля
 * и выбросил бы исключение для другого — именно такое зависящее от профиля
 * поведение этот модуль существует, чтобы устранить. Написание либо корректно
 * для каждого профиля, либо не корректно ни для одного.
 *
 * @param text - Тело шаблона в том виде, в котором написано
 * @throws Если маркер не распознан или блоки не образуют плоскую последовательность
 *         if / else / end
 */
function assertConditionalsWellFormed(text: string): void {
  const kinds: Array<'if' | 'else' | 'end'> = [];
  const withoutMarkers = text.replace(MARKER_PATTERN, (marker) => {
    kinds.push(marker.startsWith(OPEN) ? 'if' : marker === ELSE ? 'else' : 'end');
    return '';
  });

  const unrecognized = MARKER_LIKE_PATTERN.exec(withoutMarkers);
  if (unrecognized) {
    throw new Error(
      `Некорректная условная конструкция optional-workflow: нераспознанный маркер в позиции '${withoutMarkers
        .slice(unrecognized.index, unrecognized.index + 40)
        .split('\n')[0]}'. Маркеры: [[opsx:if-workflow <id>]], [[opsx:else]] и [[opsx:end]].`
    );
  }

  for (let i = 0; i < kinds.length; i += 3) {
    if (kinds[i] !== 'if' || kinds[i + 1] !== 'else' || kinds[i + 2] !== 'end') {
      throw new Error(
        'Некорректная условная конструкция optional-workflow: маркеры расположены в ' +
          'неправильном порядке или блок не завершён. Каждый блок должен иметь полную форму ' +
          '[[opsx:if-workflow <id>]] ... [[opsx:else]] ... [[opsx:end]], блоки не могут быть вложенными.'
      );
    }
  }
}

/**
 * Создаёт фрагмент, формулировка которого зависит от того, установлен ли `workflowId`.
 *
 * Обе ветви должны читаться корректно сами по себе: сгенерированный файл содержит
 * ровно одну из них, без следа другой.
 *
 * @param workflowId - Идентификатор процесса, как он указан в ALL_WORKFLOWS (например, 'continue')
 * @param whenInstalled - Текст для вывода, когда процесс входит в профиль
 * @param whenMissing - Текст для вывода в противном случае, обычно запасной вариант через CLI
 *
 * @example
 * optionalWorkflow('continue', 'suggest `/opsx:continue`', 'run `openspec status`')
 */
export function optionalWorkflow(
  workflowId: string,
  whenInstalled: string,
  whenMissing: string
): string {
  return `${OPEN}${workflowId}${OPEN_END}${whenInstalled}${ELSE}${whenMissing}${END}`;
}

/**
 * Фрагмент, который полностью удаляется, если `workflowId` не установлен.
 *
 * Используйте для строки, которая имеет смысл только вместе с упомянутым
 * процессом, — строки таблицы со ссылками на команды или пункта списка,
 * перечисляющего один процесс. Когда условная конструкция занимает целую
 * строку, строка удаляется вместе с ней, не оставляя пустую.
 *
 * @param workflowId - Идентификатор процесса, как он указан в ALL_WORKFLOWS
 * @param whenInstalled - Текст для вывода, когда процесс входит в профиль
 */
export function onlyWithWorkflow(workflowId: string, whenInstalled: string): string {
  return optionalWorkflow(workflowId, whenInstalled, '');
}

/**
 * Разрешает каждый фрагмент `optionalWorkflow()` в `text` относительно процессов,
 * которые будут фактически установлены.
 *
 * Выполняется до трансформеров ссылок на команды, поэтому ссылка из удалённой
 * ветви никогда до них не доходит.
 *
 * @param text - Тело шаблона, возможно содержащее условные конструкции
 * @param installedWorkflows - Разрешённый набор процессов для данной установки
 * @returns Тело с одной сохранённой ветвью каждой условной конструкции
 * @throws Если некорректная условная конструкция оставляет маркер в выводе
 */
export function resolveOptionalWorkflows(
  text: string,
  installedWorkflows: ReadonlySet<string>
): string {
  assertConditionalsWellFormed(text);

  const wholeLinesResolved = text.replace(
    WHOLE_LINE_PATTERN,
    (
      _match,
      indent: string,
      workflowId: string,
      whenInstalled: string,
      whenMissing: string
    ) => {
      const chosen = installedWorkflows.has(workflowId) ? whenInstalled : whenMissing;
      return chosen === '' ? '' : `${indent}${chosen}\n`;
    }
  );

  const resolved = wholeLinesResolved.replace(
    CONDITIONAL_PATTERN,
    (_match, workflowId: string, whenInstalled: string, whenMissing: string) =>
      installedWorkflows.has(workflowId) ? whenInstalled : whenMissing
  );

  assertWorkflowConditionalsResolved(
    resolved,
    'Некорректная условная конструкция optional-workflow'
  );

  return resolved;
}

/**
 * Громко завершает сбоем, если `text` всё ещё содержит маркер условной конструкции.
 *
 * Вызывается в конце разрешения, чтобы перехватить некорректный блок, и снова
 * в точках записи сгенерированного файла — так тело, полностью миновавшее
 * разрешение (путь генерации, обошедший getSkillTemplates / getCommandTemplates),
 * выбрасывает исключение вместо того, чтобы поставлять пользователю
 * буквальные маркеры.
 *
 * @param text - Текст, готовый к записи или только что разрешённый
 * @param reason - Что пошло не так, используется как префикс сообщения
 * @throws Если остался любой маркер `[[opsx:...]]`
 */
export function assertWorkflowConditionalsResolved(text: string, reason: string): void {
  const residual = RESIDUAL_MARKER_PATTERN.exec(text);
  if (residual) {
    throw new Error(
      `${reason}: '${residual[0]}' не разрешён. Блоки Optional-workflow ` +
        'разрешаются getSkillTemplates()/getCommandTemplates() относительно установленного ' +
        'набора процессов, и каждый должен иметь полную форму ' +
        '[[opsx:if-workflow <id>]] ... [[opsx:else]] ... [[opsx:end]].'
    );
  }
}
