import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadContractFile, validateContractFile } from '../dist/index.js';

test('validateContractFile accepts a minimal contract', () => {
  const spec = validateContractFile({ contracts: [{ name: 'help', command: 'node --help' }] });
  assert.equal(spec.contracts.length, 1);
  assert.equal(spec.contracts[0].expect, undefined);
});

test('validateContractFile rejects empty contract lists', () => {
  assert.throws(() => validateContractFile({ contracts: [] }), /at least one contract/);
});

test('validateContractFile accepts the supported version and positive timeouts', () => {
  const spec = validateContractFile({
    version: 1,
    defaults: { timeoutMs: 1000 },
    contracts: [{ name: 'help', command: 'node --help', timeoutMs: 500 }],
  });
  assert.equal(spec.version, 1);
  assert.equal(spec.defaults.timeoutMs, 1000);
  assert.equal(spec.contracts[0].timeoutMs, 500);
});

test('validateContractFile rejects unsupported versions', () => {
  for (const version of [2, 0, '1']) {
    assert.throws(
      () => validateContractFile({ version, contracts: [{ name: 'help', command: 'node --help' }] }),
      (error) => error.code === 'VALIDATION_ERROR' && /version must be 1/.test(error.message),
    );
  }
});

test('validateContractFile rejects invalid default and per-contract timeouts', () => {
  for (const timeoutMs of [0, -1, NaN, Infinity, '1000']) {
    assert.throws(
      () => validateContractFile({ defaults: { timeoutMs }, contracts: [{ name: 'help', command: 'node --help' }] }),
      (error) => error.code === 'VALIDATION_ERROR' && /defaults\.timeoutMs must be a positive finite number/.test(error.message),
    );
    assert.throws(
      () => validateContractFile({ contracts: [{ name: 'help', command: 'node --help', timeoutMs }] }),
      (error) => error.code === 'VALIDATION_ERROR' && /contracts\[0\]\.timeoutMs must be a positive finite number/.test(error.message),
    );
  }
});

test('validateContractFile accepts only child-process exit codes', () => {
  for (const exitCode of [0, 1, 127, 255]) {
    const spec = validateContractFile({ contracts: [{ name: 'exit', command: 'node --version', expect: { exitCode } }] });
    assert.equal(spec.contracts[0].expect.exitCode, exitCode);
  }
  for (const exitCode of [NaN, Infinity, -Infinity, 1.5, -1, 256]) {
    assert.throws(
      () => validateContractFile({ contracts: [{ name: 'exit', command: 'node --version', expect: { exitCode } }] }),
      (error) => error.code === 'VALIDATION_ERROR' && /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/.test(error.message),
    );
  }
});

test('validateContractFile rejects wrong types for every supported optional shape', () => {
  const contract = { name: 'help', command: 'node --help' };
  const cases = [
    [{ defaults: 'wrong', contracts: [contract] }, /defaults must be an object/],
    [{ defaults: { env: [] }, contracts: [contract] }, /defaults\.env must be an object/],
    [{ contracts: [{ ...contract, cwd: 42 }] }, /contracts\[0\]\.cwd must be a string/],
    [{ contracts: [{ ...contract, env: 'wrong' }] }, /contracts\[0\]\.env must be an object/],
    [{ contracts: [{ ...contract, fixtures: {} }] }, /contracts\[0\]\.fixtures must be an array/],
    [{ contracts: [{ ...contract, fixtures: [{ from: 'source', to: 42 }] }] }, /contracts\[0\]\.fixtures\[0\]\.to must be a string/],
    [{ contracts: [{ ...contract, expect: [] }] }, /contracts\[0\]\.expect must be an object/],
    [{ contracts: [{ ...contract, expect: { exitCode: '0' } }] }, /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/],
    [{ contracts: [{ ...contract, expect: { stdoutContains: 'help' } }] }, /contracts\[0\]\.expect\.stdoutContains must be an array of strings/],
    [{ contracts: [{ ...contract, expect: { stderrContains: [42] } }] }, /contracts\[0\]\.expect\.stderrContains must be an array of strings/],
  ];
  for (const [value, diagnostic] of cases) {
    assert.throws(
      () => validateContractFile(value),
      (error) => error.code === 'VALIDATION_ERROR' && diagnostic.test(error.message),
    );
  }
});

test('validateContractFile preserves omitted optional-field defaults', () => {
  const spec = validateContractFile({ contracts: [{ name: 'help', command: 'node --help', expect: {} }] });
  assert.equal(spec.defaults, undefined);
  assert.equal(spec.contracts[0].cwd, undefined);
  assert.equal(spec.contracts[0].env, undefined);
  assert.equal(spec.contracts[0].fixtures, undefined);
  assert.deepEqual(spec.contracts[0].expect, { exitCode: 0, stdoutContains: undefined, stderrContains: undefined });
});

test('loadContractFile applies version and timeout validation to YAML and JSON', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cmdcontract-spec-'));
  try {
    const cases = [
      ['unsupported.yaml', 'version: 2\ncontracts:\n  - name: help\n    command: node --help\n', /version must be 1/],
      ['default-nan.yaml', 'version: 1\ndefaults:\n  timeoutMs: .nan\ncontracts:\n  - name: help\n    command: node --help\n', /defaults\.timeoutMs must be a positive finite number/],
      ['contract-zero.json', JSON.stringify({ version: 1, contracts: [{ name: 'help', command: 'node --help', timeoutMs: 0 }] }), /contracts\[0\]\.timeoutMs must be a positive finite number/],
      ['default-wrong-type.json', JSON.stringify({ version: 1, defaults: { timeoutMs: '1000' }, contracts: [{ name: 'help', command: 'node --help' }] }), /defaults\.timeoutMs must be a positive finite number/],
      ['fixtures-wrong-type.yaml', 'contracts:\n  - name: help\n    command: node --help\n    fixtures: wrong\n', /contracts\[0\]\.fixtures must be an array/],
      ['env-wrong-type.json', JSON.stringify({ contracts: [{ name: 'help', command: 'node --help', env: 'wrong' }] }), /contracts\[0\]\.env must be an object/],
      ['expect-wrong-type.yaml', 'contracts:\n  - name: help\n    command: node --help\n    expect: wrong\n', /contracts\[0\]\.expect must be an object/],
      ['defaults-wrong-type.json', JSON.stringify({ defaults: 'wrong', contracts: [{ name: 'help', command: 'node --help' }] }), /defaults must be an object/],
      ['exit-code-nan.yaml', 'contracts:\n  - name: help\n    command: node --help\n    expect:\n      exitCode: .nan\n', /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/],
      ['exit-code-fractional.json', JSON.stringify({ contracts: [{ name: 'help', command: 'node --help', expect: { exitCode: 1.5 } }] }), /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/],
      ['exit-code-negative.json', JSON.stringify({ contracts: [{ name: 'help', command: 'node --help', expect: { exitCode: -1 } }] }), /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/],
      ['exit-code-out-of-range.yaml', 'contracts:\n  - name: help\n    command: node --help\n    expect:\n      exitCode: 256\n', /contracts\[0\]\.expect\.exitCode must be an integer from 0 to 255/],
      ['cwd-wrong-type.json', JSON.stringify({ contracts: [{ name: 'help', command: 'node --help', cwd: false }] }), /contracts\[0\]\.cwd must be a string/],
      ['fixture-to-wrong-type.yaml', 'contracts:\n  - name: help\n    command: node --help\n    fixtures:\n      - from: source\n        to: 42\n', /contracts\[0\]\.fixtures\[0\]\.to must be a string/],
    ];
    for (const [name, contents, diagnostic] of cases) {
      const file = path.join(directory, name);
      await fs.writeFile(file, contents);
      await assert.rejects(loadContractFile(file), (error) => error.code === 'VALIDATION_ERROR' && diagnostic.test(error.message));
    }

    const valid = path.join(directory, 'valid.json');
    await fs.writeFile(valid, JSON.stringify({ version: 1, defaults: { timeoutMs: 1000 }, contracts: [{ name: 'help', command: 'node --help' }] }));
    assert.equal((await loadContractFile(valid)).version, 1);

    const validBoundaries = path.join(directory, 'valid-boundaries.yaml');
    await fs.writeFile(validBoundaries, 'contracts:\n  - name: success\n    command: node --help\n    expect:\n      exitCode: 0\n  - name: maximum\n    command: node --help\n    expect:\n      exitCode: 255\n');
    assert.deepEqual((await loadContractFile(validBoundaries)).contracts.map((contract) => contract.expect.exitCode), [0, 255]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
