# cmdcontract

Executable CLI contract specs that stay honest ✅

`cmdcontract` is a tiny local-first test harness for README examples, CLI smoke tests, and agent-written tools. It copies fixtures into a temp workspace, runs documented commands with a safe minimal environment, normalizes noisy output, and reports drift before your docs lie to people.

## Install

`cmdcontract` is not published to the npm registry yet. From a clean checkout,
build and pack the release candidate, then install that tarball in a project:

```bash
git clone https://github.com/rogerchappel/cmdcontract.git
cd cmdcontract
npm ci
npm run build
package_file="$(npm pack --silent)"
mkdir -p ../cmdcontract-example
cd ../cmdcontract-example
npm init -y
npm install --save-dev "../cmdcontract/$package_file"
npx cmdcontract --help
```

### After npm publication

Once a release is available on npm, projects will be able to install it with:

```bash
npm install --save-dev cmdcontract
```

## Quick Start

Generate a starter spec from README command fences:

```bash
cmdcontract init --from README.md --out contracts/readme.yaml
```

Initialization is deliberately opt-in. It extracts fences whose info string is
`bash cmdcontract`, `sh cmdcontract`, `shell cmdcontract`, or
`console cmdcontract`. Each selected fence becomes one contract and runs in its
own fresh temporary workspace, so setup lines, variables, and `cd` commands
must be in the same fence. In `console` fences, only lines beginning with `$ `
are retained; displayed output is ignored. Unmarked examples and selected
fences containing a known dangerous command are skipped. Review the generated
file before running it.

For example, this complete, portable group is extracted and passes:

```bash cmdcontract
message='cmdcontract starter is ready'
node -e "console.log(process.argv[1])" "$message"
```

Run the contract:

```bash
cmdcontract run contracts/readme.yaml --format tap
```

TAP output JSON-escapes newlines and other control characters in contract names
so every contract remains exactly one TAP test record.

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
- README generation only extracts explicitly marked shell fences and skips common foot-guns such as `rm -rf`, `sudo`, and `curl | sh`.

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

## Usage

Inspect the available commands before running the CLI against a project:

```sh
npm exec -- cmdcontract --help
```

Use fixture or sample input from this repository first when evaluating changes, then run the same command against your target project.

## Release policy

Version tags currently create a GitHub release containing the packed npm
tarball. They intentionally do not publish to npm. Registry installation
instructions above therefore remain conditional until npm publishing is added
and a package is verified on the registry.

The release tag must be exactly `v` followed by the version in `package.json`
(for example, package version `0.1.0` requires tag `v0.1.0`). The release
workflow validates this identity before running `npm pack` or creating a
GitHub release. `npm run release:contract` exercises the same contract during
local and dry-run verification.
