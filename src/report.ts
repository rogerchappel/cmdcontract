import type { OutputFormat, RunSummary } from './types.js';

export function validateRunSummary(value: unknown): RunSummary {
  const summary = objectField(value, 'root');
  stringField(summary, 'contractPath');
  stringField(summary, 'startedAt');
  numberField(summary, 'durationMs');
  integerField(summary, 'total');
  integerField(summary, 'passed');
  integerField(summary, 'failed');
  if (!Array.isArray(summary.results)) throw new Error('results must be an array');

  summary.results.forEach((value, index) => {
    const name = `results[${index}]`;
    const result = objectField(value, name);
    stringField(result, 'name', name);
    stringField(result, 'command', name);
    booleanField(result, 'passed', name);
    if (result.exitCode !== null) integerField(result, 'exitCode', name);
    integerField(result, 'expectedExitCode', name);
    numberField(result, 'durationMs', name);
    stringField(result, 'stdout', name);
    stringField(result, 'stderr', name);
    if (!Array.isArray(result.diagnostics) || !result.diagnostics.every((item) => typeof item === 'string')) {
      throw new Error(`${name}.diagnostics must be an array of strings`);
    }
  });

  return summary as unknown as RunSummary;
}

export function formatSummary(summary: RunSummary, format: OutputFormat): string {
  if (format === 'json') return `${JSON.stringify(summary, null, 2)}\n`;
  if (format === 'tap') return formatTap(summary);
  return formatMarkdown(summary);
}

export function formatMarkdown(summary: RunSummary): string {
  const lines = [
    '# CmdContract Report',
    '',
    `- Contract: \`${summary.contractPath}\``,
    `- Total: ${summary.total}`,
    `- Passed: ${summary.passed}`,
    `- Failed: ${summary.failed}`,
    '',
    '| Status | Name | Command | Diagnostics |',
    '| --- | --- | --- | --- |',
  ];
  for (const result of summary.results) {
    lines.push(`| ${result.passed ? '✅' : '❌'} | ${escapeCell(result.name)} | \`${escapeCell(result.command)}\` | ${escapeCell(result.diagnostics.join('; ') || '—')} |`);
  }
  return `${lines.join('\n')}\n`;
}

export function formatTap(summary: RunSummary): string {
  const lines = ['TAP version 13', `1..${summary.total}`];
  summary.results.forEach((result, index) => {
    lines.push(`${result.passed ? 'ok' : 'not ok'} ${index + 1} - ${escapeTapName(result.name)}`);
    if (!result.passed) {
      lines.push('  ---');
      lines.push(`  command: ${JSON.stringify(result.command)}`);
      lines.push(`  diagnostics: ${JSON.stringify(result.diagnostics)}`);
      lines.push('  ...');
    }
  });
  return `${lines.join('\n')}\n`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function escapeTapName(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function objectField(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, field: string, prefix?: string): void {
  if (typeof value[field] !== 'string') throw new Error(`${prefix ? `${prefix}.` : ''}${field} must be a string`);
}

function booleanField(value: Record<string, unknown>, field: string, prefix?: string): void {
  if (typeof value[field] !== 'boolean') throw new Error(`${prefix ? `${prefix}.` : ''}${field} must be a boolean`);
}

function numberField(value: Record<string, unknown>, field: string, prefix?: string): void {
  const item = value[field];
  if (typeof item !== 'number' || !Number.isFinite(item) || item < 0) {
    throw new Error(`${prefix ? `${prefix}.` : ''}${field} must be a non-negative finite number`);
  }
}

function integerField(value: Record<string, unknown>, field: string, prefix?: string): void {
  const item = value[field];
  if (!Number.isSafeInteger(item) || (item as number) < 0) {
    throw new Error(`${prefix ? `${prefix}.` : ''}${field} must be a non-negative integer`);
  }
}
