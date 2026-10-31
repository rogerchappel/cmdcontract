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

test('JUnit emits escaped XML and representative pass/failure cases', async () => {
  const { formatJUnit } = await import('../dist/report.js');
  const output = formatJUnit({
    contractPath: 'contracts/a&<".yaml', startedAt: '2026-10-31T00:00:00Z', durationMs: 1250, total: 2, passed: 1, failed: 1,
    results: [
      { name: 'works & <fine>', command: 'true', passed: true, exitCode: 0, expectedExitCode: 0, durationMs: 25, stdout: '', stderr: '', diagnostics: [] },
      { name: 'bad "case"', command: 'false', passed: false, exitCode: 2, expectedExitCode: 0, durationMs: 75, stdout: '', stderr: 'oops & <nope>', diagnostics: ['expected <x> & got y'] },
    ],
  });
  assert.match(output, /<testsuite name="contracts\/a&amp;&lt;&quot;\.yaml" tests="2" failures="1" errors="0" time="1\.250">/);
  assert.match(output, /<testcase name="works &amp; &lt;fine&gt;" classname=/);
  assert.match(output, /<failure message="expected &lt;x&gt; &amp; got y">oops &amp; &lt;nope&gt;<\/failure>/);
  assert.equal((output.match(/<testcase /g) ?? []).length, 2);
});
