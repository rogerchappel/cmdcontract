import assert from 'node:assert/strict';
import test from 'node:test';
import { validateContractFile } from '../dist/index.js';

test('validateContractFile accepts a minimal contract', () => {
  const spec = validateContractFile({ contracts: [{ name: 'help', command: 'node --help' }] });
  assert.equal(spec.contracts.length, 1);
  assert.equal(spec.contracts[0].expect, undefined);
});

test('validateContractFile rejects empty contract lists', () => {
  assert.throws(() => validateContractFile({ contracts: [] }), /at least one contract/);
});
