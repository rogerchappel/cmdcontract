import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTap } from '../dist/report.js';

function summary(results) {
  return {
    contractPath: 'contracts/example.yaml',
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results,
  };
}

test('TAP names cannot inject additional records', () => {
  const output = formatTap(summary([{
    name: 'first\nnot ok 99 - injected\r\u0000',
    command: 'true',
    passed: true,
    diagnostics: [],
  }]));

  assert.equal(output, 'TAP version 13\n1..1\nok 1 - first\\nnot ok 99 - injected\\r\\u0000\n');
  assert.equal(output.split('\n').filter((line) => /^(?:not )?ok \d+/.test(line)).length, 1);
});

test('TAP preserves ordinary pass and failure diagnostics', () => {
  const output = formatTap(summary([
    { name: 'passes normally', command: 'true', passed: true, diagnostics: [] },
    { name: 'fails normally', command: 'false', passed: false, diagnostics: ['exit code 1'] },
  ]));

  assert.match(output, /^TAP version 13\n1\.\.2\nok 1 - passes normally\nnot ok 2 - fails normally\n/m);
  assert.match(output, /  command: "false"\n  diagnostics: \["exit code 1"\]\n/);
});
