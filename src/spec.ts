import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { CmdContractError, assertNonEmptyString } from './errors.js';
import type { CommandContract, ContractFile, FixtureCopyRule } from './types.js';

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
  if (candidate.version !== undefined && candidate.version !== 1) {
    throw new CmdContractError('version must be 1', 'VALIDATION_ERROR');
  }
  const contracts = candidate.contracts.map(validateContract);
  return {
    version: 1,
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
  if (candidate.cwd !== undefined) contract.cwd = stringValue(candidate.cwd, `contracts[${index}].cwd`);
  if (candidate.timeoutMs !== undefined) {
    contract.timeoutMs = positiveFiniteNumber(candidate.timeoutMs, `contracts[${index}].timeoutMs`);
  }
  if (candidate.env !== undefined) {
    contract.env = stringRecord(objectValue(candidate.env, `contracts[${index}].env`), `contracts[${index}].env`);
  }
  if (candidate.fixtures !== undefined) {
    contract.fixtures = arrayValue(candidate.fixtures, `contracts[${index}].fixtures`).map((fixture, fixtureIndex) => {
      if (!fixture || typeof fixture !== 'object') {
        throw new CmdContractError(`contracts[${index}].fixtures[${fixtureIndex}] must be an object`, 'VALIDATION_ERROR');
      }
      const rule = fixture as Record<string, unknown>;
      const normalized: FixtureCopyRule = {
        from: assertNonEmptyString(rule.from, `contracts[${index}].fixtures[${fixtureIndex}].from`),
      };
      if (rule.to !== undefined) normalized.to = stringValue(rule.to, `contracts[${index}].fixtures[${fixtureIndex}].to`);
      return normalized;
    });
  }
  if (candidate.expect !== undefined) {
    const expect = objectValue(candidate.expect, `contracts[${index}].expect`);
    contract.expect = {
      exitCode: expect.exitCode === undefined ? 0 : exitCodeValue(expect.exitCode, `contracts[${index}].expect.exitCode`),
      stdoutContains: stringArray(expect.stdoutContains, `contracts[${index}].expect.stdoutContains`),
      stderrContains: stringArray(expect.stderrContains, `contracts[${index}].expect.stderrContains`),
    };
  }
  return contract;
}

function normalizeDefaults(value: unknown): ContractFile['defaults'] {
  if (value === undefined) return undefined;
  const defaults = objectValue(value, 'defaults');
  return {
    timeoutMs: defaults.timeoutMs === undefined ? undefined : positiveFiniteNumber(defaults.timeoutMs, 'defaults.timeoutMs'),
    env: defaults.env === undefined ? undefined : stringRecord(objectValue(defaults.env, 'defaults.env'), 'defaults.env'),
  };
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CmdContractError(`${label} must be an object`, 'VALIDATION_ERROR');
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new CmdContractError(`${label} must be an array`, 'VALIDATION_ERROR');
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new CmdContractError(`${label} must be a string`, 'VALIDATION_ERROR');
  return value;
}

function exitCodeValue(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 255) {
    throw new CmdContractError(`${label} must be an integer from 0 to 255`, 'VALIDATION_ERROR');
  }
  return value;
}

function positiveFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new CmdContractError(`${label} must be a positive finite number`, 'VALIDATION_ERROR');
  }
  return value;
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
