# CmdContract PRD

Status: in-progress

## One-liner

Executable CLI contract specs that stay honest ✅

## Problem

README examples rot quickly. Agent-written tools especially need a cheap way to prove documented commands still run against fixtures.

## Proposed solution

A zero-service CLI that reads simple command contract files, runs commands in a temp workspace, normalizes outputs, and reports doc/example drift.

## Primary users

OSS CLI maintainers, docs-focused agents, release check pipelines.

## V1 scope

- Parse YAML/JSON contract specs with command, cwd, env, expected exit code, stdout/stderr contains, and fixture copy rules
- Run isolated temp workspaces with timeout and safe env defaults
- Normalize nondeterministic output such as paths, durations, and timestamps
- Emit TAP, JSON, and Markdown summaries
- Generate starter contracts from README fenced command blocks

## CLI shape

```bash
cmdcontract init --from README.md --out contracts/readme.yaml
cmdcontract run contracts/readme.yaml
cmdcontract report .cmdcontract/results.json --format markdown
```

## Non-goals

- No hosted service, hidden telemetry, or required account.
- No secret collection; fixture and metadata redaction should be conservative.
- No broad framework lock-in beyond a practical Node/TypeScript CLI MVP.

## Local-first safety

- Default to dry-run or read-only behavior for write/apply style commands.
- Keep generated artifacts deterministic and reviewable.
- Fail closed on suspicious paths, binary blobs, or likely secrets.

## Acceptance criteria

- Functional CLI with help text and at least three useful commands.
- Fixture-backed tests covering happy path, validation failure, and deterministic output.
- README with concise examples, safety notes, and practical developer workflow.
- `npm test`, `npm run check`, `npm run build`, `npm run smoke`, and `bash scripts/validate.sh` pass where present.
- Public GitHub repo under `rogerchappel/cmdcontract` with description and topics.

## Attribution / inspiration

Inspired by doctest-style documentation checks and shell smoke testing, specialized for developer CLI contracts.
