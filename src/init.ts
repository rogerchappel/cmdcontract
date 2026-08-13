import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { ContractFile } from './types.js';

const FENCE = /```(bash|sh|shell|console)\s+cmdcontract\s*\n([\s\S]*?)```/g;

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
    const body = match[2];
    const command = match[1] === 'console' ? consoleCommands(body) : body.trim();
    if (command && !looksDangerous(command)) commands.push(command);
  }
  return commands;
}

function consoleCommands(body: string): string {
  return body.split('\n')
    .map((line) => line.match(/^\s*\$\s+(.*)$/)?.[1])
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

function looksDangerous(command: string): boolean {
  return /\b(rm\s+-rf|sudo|curl\b.*\|\s*sh|wget\b.*\|\s*sh|mkfs|shutdown|reboot)\b/.test(command);
}
