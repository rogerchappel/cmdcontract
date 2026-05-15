import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { CmdContractError, assertNonEmptyString } from './errors.js';
import type { CommandContract, ContractFile } from './types.js';

export async function loadContractFile(filePath: string): Promise<ContractFile> {
  const text = await fs.readFile(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  const parsed = ext === '.json' ? JSON.parse(text) : YAML.parse(text);
  return validateContractFile(parsed);
}

export function validateContractFile(value: unknown): ContractFile {
  if (!value || typeof value !== 'object') {
    throw new CmdContractError('contract file must be an object', 'VALIDATION_ERROR');
  }
  const candidate = value as { version?: unknown; defaults?: unknown; contracts?: unknown };
  if (!Array.isArray(candidate.contracts) || candidate.contracts.length === 0) {
    throw new CmdContractError('contract file must contain at least one contract', 'VALIDATION_ERROR');
  }
  const contracts = candidate.contracts.map(validateContract);
  return {
    version: typeof candidate.version === 'number' ? candidate.version : 1,
    defaults: normalizeDefaults(candidate.defaults),
    contracts,
  };
}

function validateContract(value: unknown, index: number): CommandContract {
  if (!value || typeof value !== 'object') {
    throw new CmdContractError(`contracts[${index}] must be an object`, 'VALIDATION_ERROR');
  }
  const candidate = value as Record<string, unknown>;
  const contract: CommandContract = {
    name: assertNonEmptyString(candidate.name, `contracts[${index}].name`),
    command: assertNonEmptyString(candidate.command, `contracts[${index}].command`),
  };
  if (typeof candidate.cwd === 'string') contract.cwd = candidate.cwd;
  if (typeof candidate.timeoutMs === 'number') contract.timeoutMs = candidate.timeoutMs;
  if (candidate.env && typeof candidate.env === 'object' && !Array.isArray(candidate.env)) {
    contract.env = stringRecord(candidate.env, `contracts[${index}].env`);
  }
  if (Array.isArray(candidate.fixtures)) {
    contract.fixtures = candidate.fixtures.map((fixture, fixtureIndex) => {
      if (!fixture || typeof fixture !== 'object') {
        throw new CmdContractError(`contracts[${index}].fixtures[${fixtureIndex}] must be an object`, 'VALIDATION_ERROR');
      }
      const rule = fixture as Record<string, unknown>;
      return {
        from: assertNonEmptyString(rule.from, `contracts[${index}].fixtures[${fixtureIndex}].from`),
        to: typeof rule.to === 'string' ? rule.to : undefined,
      };
    });
  }
  if (candidate.expect && typeof candidate.expect === 'object' && !Array.isArray(candidate.expect)) {
    const expect = candidate.expect as Record<string, unknown>;
    contract.expect = {
      exitCode: typeof expect.exitCode === 'number' ? expect.exitCode : 0,
      stdoutContains: stringArray(expect.stdoutContains, `contracts[${index}].expect.stdoutContains`),
      stderrContains: stringArray(expect.stderrContains, `contracts[${index}].expect.stderrContains`),
    };
  }
  return contract;
}

function normalizeDefaults(value: unknown): ContractFile['defaults'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const defaults = value as Record<string, unknown>;
  return {
    timeoutMs: typeof defaults.timeoutMs === 'number' ? defaults.timeoutMs : undefined,
    env: defaults.env && typeof defaults.env === 'object' && !Array.isArray(defaults.env) ? stringRecord(defaults.env, 'defaults.env') : undefined,
  };
}

function stringRecord(value: object, label: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'string') throw new CmdContractError(`${label}.${key} must be a string`, 'VALIDATION_ERROR');
    output[key] = raw;
  }
  return output;
}

function stringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new CmdContractError(`${label} must be an array of strings`, 'VALIDATION_ERROR');
  }
  return value;
}
