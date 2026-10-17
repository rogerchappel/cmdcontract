import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { runContractFile } from '../dist/index.js';

const root = process.cwd();

test('runContractFile passes happy fixture contract', async () => {
  const summary = await runContractFile(path.join(root, 'examples/contracts/happy.yaml'));
  assert.equal(summary.failed, 0);
  assert.equal(summary.total, 2);
  assert.match(summary.results[0].stdout, /hello from fixture/);
});

test('runContractFile records diagnostics for expectation failures', async () => {
  const summary = await runContractFile(path.join(root, 'examples/contracts/failing.yaml'));
  assert.equal(summary.failed, 1);
  assert.match(summary.results[0].diagnostics.join('\n'), /expected exit 0, got 2/);
});

test('runContractFile reports command spawn errors without an uncaught exception', async () => {
  const preload = path.join(root, 'test/fixtures/spawn-error-preload.cjs');
  const config = path.join(root, 'test/fixtures/spawn-error.yaml');
  const child = spawnSync(process.execPath, ['--import', preload, 'dist/cli.js', 'run', config, '--format', 'json'], { encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.doesNotMatch(child.stderr, /uncaught|uncaughtException/i);
  const summary = JSON.parse(child.stdout);
  assert.equal(summary.failed, 1);
  assert.equal(summary.results[0].exitCode, null);
  assert.match(summary.results[0].stderr, /failed to start command: controlled spawn failure/);
  assert.match(summary.results[0].diagnostics.join('\n'), /got null/);
});

test('runContractFile fails timed-out commands and terminates their process tree', async () => {
  const summary = await runContractFile(path.join(root, 'test/fixtures/timeout.yaml'));

  assert.equal(summary.passed, 0);
  assert.equal(summary.failed, 2);
  for (const result of summary.results) {
    assert.equal(result.passed, false);
    assert.match(result.diagnostics.join('\n'), /command timed out/);
  }
  assert.ok(summary.durationMs < 1_000, `expected prompt termination, took ${summary.durationMs}ms`);
});
