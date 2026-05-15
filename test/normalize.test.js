import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOutput, redactSecrets } from '../dist/index.js';

test('normalizeOutput replaces timestamps durations and trims', () => {
  assert.equal(normalizeOutput('done 2026-05-16T00:00:00.000Z in 42ms\n'), 'done <timestamp> in <duration>');
});

test('redactSecrets hides common env secret values', () => {
  assert.equal(redactSecrets('API_TOKEN=abc123 OTHER=yes'), 'API_TOKEN=<redacted> OTHER=yes');
});
