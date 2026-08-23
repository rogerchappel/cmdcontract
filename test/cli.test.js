import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';

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

test('CLI runs contracts generated from the README fixture end to end', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-init-run-'));
  const out = path.join(tmp, 'contract.yaml');
  const init = runCli('init', '--from', 'examples/README-fixture.md', '--out', out);
  assert.equal(init.status, 0, init.stderr);
  const run = runCli('run', out, '--format', 'tap');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /ok 1 - readme-command-1/);
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

test('CLI inspect rejects malformed YAML and JSON optional fields', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-invalid-'));
  const contract = { name: 'help', command: 'node --help' };
  const cases = [
    ['defaults', { defaults: 'wrong', contracts: [contract] }, /defaults must be an object/],
    ['defaults-env', { defaults: { env: [] }, contracts: [contract] }, /defaults\.env must be an object/],
    ['cwd', { contracts: [{ ...contract, cwd: 42 }] }, /cwd must be a string/],
    ['env', { contracts: [{ ...contract, env: 'wrong' }] }, /env must be an object/],
    ['fixtures', { contracts: [{ ...contract, fixtures: 'wrong' }] }, /fixtures must be an array/],
    ['fixture-to', { contracts: [{ ...contract, fixtures: [{ from: 'source', to: 42 }] }] }, /fixtures\[0\]\.to must be a string/],
    ['expect', { contracts: [{ ...contract, expect: [] }] }, /expect must be an object/],
    ['exit-code', { contracts: [{ ...contract, expect: { exitCode: '0' } }] }, /expect\.exitCode must be an integer from 0 to 255/],
    ['stdout', { contracts: [{ ...contract, expect: { stdoutContains: 'help' } }] }, /stdoutContains must be an array of strings/],
    ['stderr', { contracts: [{ ...contract, expect: { stderrContains: [42] } }] }, /stderrContains must be an array of strings/],
  ];
  for (const [name, value, diagnostic] of cases) {
    for (const [extension, serialize] of [['json', JSON.stringify], ['yaml', YAML.stringify]]) {
      const file = path.join(tmp, `${name}.${extension}`);
      fs.writeFileSync(file, serialize(value));
      const result = runCli('inspect', file);
      assert.equal(result.status, 1, `${name}.${extension}`);
      assert.match(result.stderr, diagnostic);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI run cannot silently pass a malformed expectation', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-invalid-run-'));
  const file = path.join(tmp, 'invalid-expect.json');
  fs.writeFileSync(file, JSON.stringify({ contracts: [{ name: 'false must fail', command: 'node -e "process.exit(1)"', expect: 'wrong' }] }));
  const result = runCli('run', file, '--format', 'tap');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contracts\[0\]\.expect must be an object/);
  assert.doesNotMatch(result.stdout, /ok 1/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI inspect and run reject impossible exit codes before commands execute', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdcontract-invalid-exit-'));
  const marker = path.join(tmp, 'executed');
  for (const [name, contents] of [
    ['non-finite.yaml', `contracts:\n  - name: impossible\n    command: node -e "require('node:fs').writeFileSync('${marker}', '')"\n    expect:\n      exitCode: .inf\n`],
    ['out-of-range.json', JSON.stringify({ contracts: [{ name: 'impossible', command: `node -e "require('node:fs').writeFileSync('${marker}', '')"`, expect: { exitCode: 256 } }] })],
  ]) {
    const file = path.join(tmp, name);
    fs.writeFileSync(file, contents);
    for (const command of ['inspect', 'run']) {
      const result = runCli(command, file);
      assert.equal(result.status, 1, `${command} ${name}`);
      assert.match(result.stderr, /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/);
      assert.equal(fs.existsSync(marker), false, `${command} ${name} executed the command`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
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
