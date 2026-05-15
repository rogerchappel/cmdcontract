export class CmdContractError extends Error {
  constructor(message: string, readonly code = 'CMDCONTRACT_ERROR') {
    super(message);
    this.name = 'CmdContractError';
  }
}

export function assertNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CmdContractError(`${label} must be a non-empty string`, 'VALIDATION_ERROR');
  }
  return value;
}
