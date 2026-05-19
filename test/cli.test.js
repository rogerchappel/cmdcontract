import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const cli = path.join(process.cwd(), 'dist/cli.js');

test('CLI inspect reports contract names', () => {
  const result = spawnSync(process.execPath, [cli, 'inspect', 'examples/contracts/happy.yaml'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /reads copied fixture/);
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
