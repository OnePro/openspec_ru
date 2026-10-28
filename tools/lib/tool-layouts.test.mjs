import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_LAYOUTS, TOOL_IDS, getLayout, commandPath, skillPath } from './tool-layouts.mjs';

test('топ-5 инструментов', () => {
  assert.deepEqual([...TOOL_IDS], ['claude', 'cursor', 'github-copilot', 'codex', 'gemini']);
  assert.equal(TOOL_LAYOUTS.length, 5);
});

test('пути команд', () => {
  assert.equal(commandPath('claude', 'apply'), '.claude/commands/opsx/apply.md');
  assert.equal(commandPath('cursor', 'apply'), '.cursor/commands/opsx-apply.md');
  assert.equal(commandPath('github-copilot', 'apply'), '.github/prompts/opsx-apply.prompt.md');
  assert.equal(commandPath('gemini', 'apply'), '.gemini/commands/opsx/apply.toml');
  assert.equal(commandPath('codex', 'apply'), null);
});

test('пути skills', () => {
  assert.equal(skillPath('codex', 'openspec-explore'), '.agents/skills/openspec-explore/SKILL.md');
  assert.equal(skillPath('claude', 'openspec-explore'), '.claude/skills/openspec-explore/SKILL.md');
});

test('неизвестный инструмент', () => {
  assert.throws(() => getLayout('nope'));
});
