#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm run build >/dev/null

out_dir="${TMPDIR:-/tmp}/cmdcontract-demo"
rm -rf "$out_dir"
mkdir -p "$out_dir"

node dist/cli.js run examples/contracts/happy.yaml --format tap \
  > "$out_dir/happy.tap"

node dist/cli.js init \
  --from examples/README-fixture.md \
  --out "$out_dir/readme-contract.yaml"

node dist/cli.js report examples/results/sample-results.json --format markdown \
  > "$out_dir/sample-report.md"

grep -q 'ok 1 - reads copied fixture' "$out_dir/happy.tap"
grep -q 'fixture readme command' "$out_dir/readme-contract.yaml"
grep -q 'CmdContract Report' "$out_dir/sample-report.md"

printf 'wrote %s/happy.tap\n' "$out_dir"
printf 'wrote %s/readme-contract.yaml\n' "$out_dir"
printf 'wrote %s/sample-report.md\n' "$out_dir"
