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

test('loadContractFile applies version and timeout validation to YAML and JSON', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cmdcontract-spec-'));
  try {
    const cases = [
      ['unsupported.yaml', 'version: 2\ncontracts:\n  - name: help\n    command: node --help\n', /version must be 1/],
      ['default-nan.yaml', 'version: 1\ndefaults:\n  timeoutMs: .nan\ncontracts:\n  - name: help\n    command: node --help\n', /defaults\.timeoutMs must be a positive finite number/],
      ['contract-zero.json', JSON.stringify({ version: 1, contracts: [{ name: 'help', command: 'node --help', timeoutMs: 0 }] }), /contracts\[0\]\.timeoutMs must be a positive finite number/],
      ['default-wrong-type.json', JSON.stringify({ version: 1, defaults: { timeoutMs: '1000' }, contracts: [{ name: 'help', command: 'node --help' }] }), /defaults\.timeoutMs must be a positive finite number/],
    ];
    for (const [name, contents, diagnostic] of cases) {
      const file = path.join(directory, name);
      await fs.writeFile(file, contents);
      await assert.rejects(loadContractFile(file), (error) => error.code === 'VALIDATION_ERROR' && diagnostic.test(error.message));
    }

    const valid = path.join(directory, 'valid.json');
    await fs.writeFile(valid, JSON.stringify({ version: 1, defaults: { timeoutMs: 1000 }, contracts: [{ name: 'help', command: 'node --help' }] }));
    assert.equal((await loadContractFile(valid)).version, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
