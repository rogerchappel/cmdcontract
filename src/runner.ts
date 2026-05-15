import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { copyFixtures } from './fixtures.js';
import { normalizeOutput, redactSecrets } from './normalize.js';
import { safeResolve } from './paths.js';
import { loadContractFile } from './spec.js';
import type { CommandContract, ContractFile, ContractResult, RunSummary } from './types.js';

export interface RunOptions {
  keepWorkspace?: boolean;
}

export async function runContractFile(contractPath: string, options: RunOptions = {}): Promise<RunSummary> {
  const started = Date.now();
  const loaded = await loadContractFile(contractPath);
  const root = path.dirname(path.resolve(contractPath));
  const results: ContractResult[] = [];
  for (const contract of loaded.contracts) {
    results.push(await runOne(contract, loaded, root, options));
  }
  const passed = results.filter((result) => result.passed).length;
  return {
    contractPath,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

async function runOne(contract: CommandContract, file: ContractFile, sourceRoot: string, options: RunOptions): Promise<ContractResult> {
  const start = Date.now();
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'cmdcontract-'));
  const timeoutMs = contract.timeoutMs ?? file.defaults?.timeoutMs ?? 10_000;
  try {
    await copyFixtures(contract.fixtures, sourceRoot, workspace);
    const cwd = safeResolve(workspace, contract.cwd ?? '.');
    await fs.mkdir(cwd, { recursive: true });
    const execution = await execute(contract.command, cwd, { ...file.defaults?.env, ...contract.env }, timeoutMs);
    const stdout = normalizeOutput(redactSecrets(execution.stdout));
    const stderr = normalizeOutput(redactSecrets(execution.stderr));
    const expectedExitCode = contract.expect?.exitCode ?? 0;
    const diagnostics = collectDiagnostics(contract, execution.exitCode, expectedExitCode, stdout, stderr);
    return {
      name: contract.name,
      command: contract.command,
      passed: diagnostics.length === 0,
      exitCode: execution.exitCode,
      expectedExitCode,
      durationMs: Date.now() - start,
      stdout,
      stderr,
      diagnostics,
    };
  } finally {
    if (!options.keepWorkspace) await fs.rm(workspace, { recursive: true, force: true });
  }
}

function execute(command: string, cwd: string, env: Record<string, string> | undefined, timeoutMs: number): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        CI: '1',
        NO_COLOR: '1',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      stderr += `\ncmdcontract: command timed out after ${timeoutMs}ms`;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => (stdout += chunk));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout, stderr });
    });
  });
}

function collectDiagnostics(contract: CommandContract, actualExitCode: number | null, expectedExitCode: number, stdout: string, stderr: string): string[] {
  const diagnostics: string[] = [];
  if (actualExitCode !== expectedExitCode) diagnostics.push(`expected exit ${expectedExitCode}, got ${actualExitCode}`);
  for (const expected of contract.expect?.stdoutContains ?? []) {
    if (!stdout.includes(expected)) diagnostics.push(`stdout did not contain ${JSON.stringify(expected)}`);
  }
  for (const expected of contract.expect?.stderrContains ?? []) {
    if (!stderr.includes(expected)) diagnostics.push(`stderr did not contain ${JSON.stringify(expected)}`);
  }
  return diagnostics;
}
