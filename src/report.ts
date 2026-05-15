import type { OutputFormat, RunSummary } from './types.js';

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
    lines.push(`${result.passed ? 'ok' : 'not ok'} ${index + 1} - ${result.name}`);
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
