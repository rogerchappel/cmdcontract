import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { ContractFile } from './types.js';

const FENCE = /```(?:bash|sh|shell|console)?\n([\s\S]*?)```/g;

export async function initFromReadme(readmePath: string, outPath: string): Promise<ContractFile> {
  const markdown = await fs.readFile(readmePath, 'utf8');
  const commands = extractCommands(markdown);
  const contract: ContractFile = {
    version: 1,
    defaults: { timeoutMs: 10_000 },
    contracts: commands.map((command, index) => ({
      name: `readme-command-${index + 1}`,
      command,
      expect: { exitCode: 0 },
    })),
  };
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, YAML.stringify(contract), 'utf8');
  return contract;
}

export function extractCommands(markdown: string): string[] {
  const commands: string[] = [];
  for (const match of markdown.matchAll(FENCE)) {
    for (const line of match[1].split('\n')) {
      const trimmed = line.trim();
      const prompt = trimmed.match(/^\$\s+(.+)/);
      if (prompt) commands.push(prompt[1]);
      else if (/^(cmdcontract|node|npm|npx)\s+/.test(trimmed)) commands.push(trimmed);
    }
  }
  return commands.filter((command) => !looksDangerous(command));
}

function looksDangerous(command: string): boolean {
  return /\b(rm\s+-rf|sudo|curl\b.*\|\s*sh|wget\b.*\|\s*sh|mkfs|shutdown|reboot)\b/.test(command);
}
