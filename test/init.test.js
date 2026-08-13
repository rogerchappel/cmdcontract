import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCommands } from '../dist/index.js';

test('extractCommands preserves an opted-in shell fence as one command', () => {
  const markdown = '```bash cmdcontract\nvalue=ready\nprintf "%s\\n" "$value"\n```';
  assert.deepEqual(extractCommands(markdown), ['value=ready\nprintf "%s\\n" "$value"']);
});

test('extractCommands handles prompted console fences without copying output', () => {
  const markdown = '```console cmdcontract\n$ value=ready\n$ node -e "console.log(process.argv[1])" "$value"\nready\n```';
  assert.deepEqual(extractCommands(markdown), ['value=ready\nnode -e "console.log(process.argv[1])" "$value"']);
});

test('extractCommands skips unmarked, dangerous, and non-shell examples', () => {
  const markdown = [
    '```bash\nnode --version\n```',
    '```bash cmdcontract\nrm -rf /\n```',
    '```yaml cmdcontract\ncommand: node --version\n```',
  ].join('\n');
  assert.deepEqual(extractCommands(markdown), []);
});
