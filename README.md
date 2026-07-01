# cmdcontract

Executable CLI contract specs that stay honest ✅

`cmdcontract` is a tiny local-first test harness for README examples, CLI smoke tests, and agent-written tools. It copies fixtures into a temp workspace, runs documented commands with a safe minimal environment, normalizes noisy output, and reports drift before your docs lie to people.

## Install

```bash
npm install --save-dev cmdcontract
```

Or run from this repo:

```bash
npm install
npm run build
node dist/cli.js --help
```

## Quick Start

Generate a starter spec from README command fences:

```bash
cmdcontract init --from README.md --out contracts/readme.yaml
```

Run the contract:

```bash
cmdcontract run contracts/readme.yaml --format tap
```

Turn JSON results into a Markdown report:

```bash
cmdcontract report .cmdcontract/results.json --format markdown
```

Inspect a spec when debugging CI:

```bash
cmdcontract inspect contracts/readme.yaml
```

## Contract format

```yaml
version: 1
defaults:
  timeoutMs: 5000
contracts:
  - name: reads copied fixture
    command: cat data/message.txt
    fixtures:
      - from: ../fixtures/hello/message.txt
        to: data/message.txt
    expect:
      exitCode: 0
      stdoutContains:
        - hello from fixture
```

Fields supported in the MVP:

- `command`: shell command to run in an isolated temp workspace.
- `cwd`: workspace-relative working directory.
- `env`: explicit environment variables for the command.
- `timeoutMs`: per-command timeout.
- `fixtures`: files or directories copied from the contract folder into the workspace.
- `expect.exitCode`, `expect.stdoutContains`, `expect.stderrContains`.

## Safety posture

CmdContract is deliberately boring:

- No service, account, telemetry, or network requirement.
- Commands run in temp directories by default.
- Fixture and `cwd` paths are blocked if they escape the workspace.
- Only `PATH`, `HOME`, `CI`, `NO_COLOR`, and explicit contract env are passed through.
- Obvious secret-looking `TOKEN`/`SECRET`/`PASSWORD`/`KEY` values are redacted from captured output.
- README generation skips common foot-guns such as `rm -rf`, `sudo`, and `curl | sh`.

Still: contracts execute shell commands. Review specs like code.

## Developer workflow

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

A real fixture-backed smoke is included at `examples/contracts/happy.yaml`.
`npm run package:smoke` also checks that the packed release candidate contains
the CLI entrypoint, examples, README, license, changelog, security policy, and
contributing guide.

## Personality

CmdContract is the pedantic friend who actually runs the example before saying “ship it.” It is small on purpose: fewer knobs, fewer services, fewer excuses for stale docs.

## Development

Run the same checks locally before opening a change:

```sh
npm ci
npm run check
npm run build
npm test
npm run smoke
npm run package:smoke
npm run release:check
```
