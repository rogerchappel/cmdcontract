export type OutputFormat = 'json' | 'tap' | 'markdown';

export interface FixtureCopyRule {
  from: string;
  to?: string;
}

export interface CommandExpectation {
  exitCode?: number;
  stdoutContains?: string[];
  stderrContains?: string[];
}

export interface CommandContract {
  name: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  fixtures?: FixtureCopyRule[];
  expect?: CommandExpectation;
}

export interface ContractFile {
  version?: number;
  defaults?: {
    timeoutMs?: number;
    env?: Record<string, string>;
  };
  contracts: CommandContract[];
}

export interface ContractResult {
  name: string;
  command: string;
  passed: boolean;
  exitCode: number | null;
  expectedExitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  diagnostics: string[];
}

export interface RunSummary {
  contractPath: string;
  startedAt: string;
  durationMs: number;
  total: number;
  passed: number;
  failed: number;
  results: ContractResult[];
}
