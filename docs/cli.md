# CLI reference

## `cmdcontract init`

```bash
cmdcontract init [--from README.md] [--out contracts/readme.yaml]
```

Extracts shell-ish fenced commands and writes a starter contract file.

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
