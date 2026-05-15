const ISO_TIMESTAMP = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g;
const DURATION = /\b\d+(?:\.\d+)?\s?(?:ms|s)\b/g;
const TMP_PATH = /(?:\/var\/folders|\/tmp|\/private\/tmp|[A-Z]:\\Temp)[^\s'\"]+/gi;

export function normalizeOutput(value: string): string {
  return value
    .replace(ISO_TIMESTAMP, '<timestamp>')
    .replace(TMP_PATH, '<tmp>')
    .replace(DURATION, '<duration>')
    .replace(/\r\n/g, '\n')
    .trimEnd();
}

export function redactSecrets(value: string): string {
  return value.replace(/([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|KEY)[A-Z0-9_]*=)([^\s]+)/gi, '$1<redacted>');
}
