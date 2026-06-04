#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { initFromReadme } from './init.js';
import { formatSummary } from './report.js';
import { runContractFile } from './runner.js';
import { loadContractFile } from './spec.js';
import type { OutputFormat, RunSummary } from './types.js';

interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  try {
    if (args.flags.version) {
      console.log("0.1.0");
      return 0;
    }

    if (!args.command || args.flags.help || args.flags.h) {
      console.log(help());
      return 0;
    }
    if (args.command === 'init') return await initCommand(args);
    if (args.command === 'run') return await runCommand(args);
    if (args.command === 'report') return await reportCommand(args);
    if (args.command === 'inspect') return await inspectCommand(args);
    console.error(`Unknown command: ${args.command}`);
    console.error(help());
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  let command: string | undefined;
  let rest: string[];
  if (argv[0] && argv[0].startsWith("-")) {
    command = undefined;
    rest = argv;
  } else {
    [command, ...rest] = argv;
  }
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token.startsWith('--')) {
      const [key, inline] = token.slice(2).split('=', 2);
      flags[key] = inline ?? (rest[index + 1] && !rest[index + 1].startsWith('-') ? rest[++index] : true);
    } else if (token.startsWith('-')) {
      flags[token.slice(1)] = true;
    } else {
      positionals.push(token);
    }
  }
  return { command, positionals, flags };
}

async function initCommand(args: ParsedArgs): Promise<number> {
  const from = stringFlag(args, 'from') ?? 'README.md';
  const out = stringFlag(args, 'out') ?? 'contracts/readme.yaml';
  const contract = await initFromReadme(from, out);
  console.log(`Wrote ${contract.contracts.length} contract(s) to ${out}`);
  return 0;
}

async function runCommand(args: ParsedArgs): Promise<number> {
  const contractPath = args.positionals[0];
  if (!contractPath) throw new Error('run requires a contract file path');
  const format = outputFormat(args);
  const summary = await runContractFile(contractPath, { keepWorkspace: Boolean(args.flags['keep-workspace']) });
  process.stdout.write(formatSummary(summary, format));
  const out = stringFlag(args, 'out');
  if (out) {
    await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
    await fs.writeFile(out, JSON.stringify(summary, null, 2), 'utf8');
  }
  return summary.failed === 0 ? 0 : 1;
}

async function reportCommand(args: ParsedArgs): Promise<number> {
  const resultPath = args.positionals[0];
  if (!resultPath) throw new Error('report requires a results JSON path');
  const summary = JSON.parse(await fs.readFile(resultPath, 'utf8')) as RunSummary;
  process.stdout.write(formatSummary(summary, outputFormat(args)));
  return summary.failed === 0 ? 0 : 1;
}

async function inspectCommand(args: ParsedArgs): Promise<number> {
  const contractPath = args.positionals[0];
  if (!contractPath) throw new Error('inspect requires a contract file path');
  const contract = await loadContractFile(contractPath);
  console.log(JSON.stringify({ contracts: contract.contracts.length, names: contract.contracts.map((entry) => entry.name) }, null, 2));
  return 0;
}

function outputFormat(args: ParsedArgs): OutputFormat {
  const format = stringFlag(args, 'format') ?? 'json';
  if (format === 'json' || format === 'tap' || format === 'markdown') return format;
  throw new Error(`unsupported format: ${format}`);
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === 'string' ? value : undefined;
}

function help(): string {
  return `cmdcontract - executable CLI contract specs that stay honest\n\nUsage:\n  cmdcontract init --from README.md --out contracts/readme.yaml\n  cmdcontract run contracts/readme.yaml [--format json|tap|markdown] [--out results.json]\n  cmdcontract report results.json --format markdown\n  cmdcontract inspect contracts/readme.yaml\n\nSafety defaults:\n  - Commands run in a temporary workspace.\n  - Only PATH, HOME, CI, NO_COLOR, and contract env are passed through.\n  - Fixture paths must stay inside the contract directory/workspace.\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
