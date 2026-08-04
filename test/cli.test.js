import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const cli = path.join(process.cwd(), 'dist/cli.js');

function runCli(...args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('CLI inspect reports contract names', () => {
  const result = spawnSync(process.execPath, [cli, 'inspect', 'examples/contracts/happy.yaml'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /reads copied fixture/);
});

test('CLI accepts documented help, version, and inline option values', () => {
  for (const args of [['--help'], ['-h'], ['--version']]) {
    assert.equal(runCli(...args).status, 0);
  }
  const result = runCli('run', 'examples/contracts/happy.yaml', '--format=tap');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^TAP version 13/);
});

test('CLI accepts separated values for init options', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-init-'));
  const out = path.join(tmp, 'contract.yaml');
  const result = runCli('init', '--from', 'examples/README-fixture.md', '--out', out);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(out), true);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI rejects malformed arguments with usage diagnostics', () => {
  const malformed = [
    [['run', 'examples/contracts/happy.yaml', '--bogus'], /Unknown option for run: --bogus/],
    [['init', '--from'], /Option --from requires a value/],
    [['run', 'examples/contracts/happy.yaml', '--out'], /Option --out requires a value/],
    [['report', 'examples/results/sample-results.json', '--format'], /Option --format requires a value/],
    [['inspect', 'examples/contracts/happy.yaml', '-x'], /Unknown option for inspect: --x/],
    [['inspect', 'examples/contracts/happy.yaml', 'ignored.yaml'], /requires exactly 1 positional argument/],
    [['init', 'unexpected'], /requires no positional arguments/],
  ];
  for (const [args, diagnostic] of malformed) {
    const result = runCli(...args);
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, diagnostic);
    assert.match(result.stderr, /Usage:/);
  }
});

test('CLI runs when invoked through an npm-style bin symlink', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-bin-'));
  const linkedCli = path.join(tmp, 'cmdcontract');
  fs.symlinkSync(cli, linkedCli);
  const result = spawnSync(process.execPath, [linkedCli, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /cmdcontract - executable CLI contract specs/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI run returns non-zero for failing contracts', () => {
  const result = spawnSync(process.execPath, [cli, 'run', 'examples/contracts/failing.yaml', '--format', 'tap'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /not ok 1/);
});

test('CLI run creates parent directories for --out', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-cli-'));
  const out = path.join(tmp, 'nested', 'results.json');
  const result = spawnSync(process.execPath, [cli, 'run', 'examples/contracts/happy.yaml', '--out', out], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(summary.failed, 0);
  fs.rmSync(tmp, { recursive: true, force: true });
});
