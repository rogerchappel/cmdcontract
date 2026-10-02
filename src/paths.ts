import fs from 'node:fs';
import path from 'node:path';
import { CmdContractError } from './errors.js';

export function safeResolve(root: string, candidate = '.'): string {
  if (candidate.includes('\0')) {
    throw new CmdContractError('path contains a null byte', 'UNSAFE_PATH');
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, candidate);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new CmdContractError(`path escapes workspace: ${candidate}`, 'UNSAFE_PATH');
  }

  // Resolve the existing portion of the path so symlinks cannot redirect a
  // lexically-contained candidate outside the workspace. The suffix may not
  // exist yet (for example, a fixture destination), so append it afterward.
  const existing: string[] = [];
  let cursor = resolved;
  while (true) {
    try {
      fs.lstatSync(cursor);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      existing.unshift(path.basename(cursor));
      cursor = parent;
    }
  }
  const canonicalRoot = fs.realpathSync.native(resolvedRoot);
  const canonicalCandidate = path.resolve(fs.realpathSync.native(cursor), ...existing);
  const canonicalRelative = path.relative(canonicalRoot, canonicalCandidate);
  if (canonicalRelative.startsWith('..') || path.isAbsolute(canonicalRelative)) {
    throw new CmdContractError(`path escapes workspace: ${candidate}`, 'UNSAFE_PATH');
  }
  return resolved;
}

export function displayPath(filePath: string, from = process.cwd()): string {
  const relative = path.relative(from, filePath);
  return relative && !relative.startsWith('..') ? relative : filePath;
}
