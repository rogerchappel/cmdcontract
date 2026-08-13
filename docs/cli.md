# CLI reference

## `cmdcontract init`

```bash
cmdcontract init [--from README.md] [--out contracts/readme.yaml]
```

Extracts explicitly marked `bash cmdcontract`, `sh cmdcontract`,
`shell cmdcontract`, and `console cmdcontract` fences and writes a starter
contract file. A whole fence becomes one shell command, retaining setup lines,
variables, and directory changes. Every generated contract later runs in a
separate fresh workspace. For `console`, only `$ ` prompt lines are retained.
Unmarked fences, displayed console output, and marked fences containing known
dangerous commands are skipped. Review generated contracts before running them.

## `cmdcontract run`

```bash
cmdcontract run <contract-file> [--format json|tap|markdown] [--out .cmdcontract/results.json] [--keep-workspace]
```

Runs each contract and prints `json`, `tap`, or `markdown`. Exit code is `1` when any contract fails.

## `cmdcontract report`

```bash
cmdcontract report <results-json> [--format json|tap|markdown]
```

Renders saved JSON results without rerunning commands.

## `cmdcontract inspect`

```bash
cmdcontract inspect <contract-file>
```

Validates a contract file and prints the contract count plus names.
