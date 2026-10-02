import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { safeResolve } from '../dist/paths.js';

test('safeResolve rejects a workspace symlink that resolves outside', async (t) => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'cmdcontract-path-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(root, 'linked'));

  assert.equal(safeResolve(root, 'ordinary/file.txt'), path.join(root, 'ordinary/file.txt'));
  assert.throws(() => safeResolve(root, 'linked/secret.txt'), { code: 'UNSAFE_PATH' });
});
