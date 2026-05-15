import fs from 'node:fs/promises';
import path from 'node:path';
import { safeResolve } from './paths.js';
import type { FixtureCopyRule } from './types.js';

export async function copyFixtures(rules: FixtureCopyRule[] | undefined, sourceRoot: string, workspace: string): Promise<void> {
  for (const rule of rules ?? []) {
    const source = safeResolve(sourceRoot, rule.from);
    const destination = safeResolve(workspace, rule.to ?? path.basename(rule.from));
    await copyEntry(source, destination);
  }
}

async function copyEntry(source: string, destination: string): Promise<void> {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      await copyEntry(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  if (!stat.isFile()) return;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
