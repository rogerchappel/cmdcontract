import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
