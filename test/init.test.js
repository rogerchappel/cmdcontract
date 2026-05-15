import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCommands } from '../dist/index.js';

test('extractCommands finds shell commands and skips dangerous lines', () => {
  const markdown = '```bash\n$ node -e "console.log(1)"\n$ rm -rf /\n```';
  assert.deepEqual(extractCommands(markdown), ['node -e "console.log(1)"']);
});
