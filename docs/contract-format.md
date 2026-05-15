# Contract format

CmdContract accepts YAML or JSON files. YAML is friendlier for hand-written examples; JSON is handy for generators.

```yaml
version: 1
defaults:
  timeoutMs: 10000
  env:
    NODE_ENV: test
contracts:
  - name: prints help
    command: node ../../dist/cli.js --help
    cwd: .
    expect:
      exitCode: 0
      stdoutContains:
        - cmdcontract
```

## Fixture copies

`fixtures` are resolved relative to the contract file and copied into a temporary workspace before the command runs.

```yaml
fixtures:
  - from: ../fixtures/project
    to: project
```

Both source and destination are path-checked so `../..` escapes fail closed.

## Expectations

The MVP supports simple contains assertions because they survive harmless formatting changes:

- `exitCode`
- `stdoutContains`
- `stderrContains`

Output is normalized before assertions for timestamps, temp paths, durations, and CRLF line endings.
