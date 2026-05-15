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
  return resolved;
}

export function displayPath(filePath: string, from = process.cwd()): string {
  const relative = path.relative(from, filePath);
  return relative && !relative.startsWith('..') ? relative : filePath;
}
