import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('validation runs the aggregate release check script', () => {
  const validator = readFileSync(new URL('../scripts/validate.sh', import.meta.url), 'utf8');
  assert.match(validator, /for script_name in[^\n]*\brelease:check\b/);
});
