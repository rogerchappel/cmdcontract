# Video Brief: Stop Shipping Stale CLI Examples

## Angle

Show how `cmdcontract` lets maintainers run README-style commands against copied fixtures before documentation drifts.

## Grounded Demo Assets

- Happy contract: `examples/contracts/happy.yaml`
- README command fixture: `examples/README-fixture.md`
- Sample JSON results: `examples/results/sample-results.json`
- Demo wrapper: `demo/run-readme-contract.sh`

## 60-Second Flow

1. Run `bash demo/run-readme-contract.sh`.
2. Open `/tmp/cmdcontract-demo/happy.tap` to show the fixture-backed contract passing.
3. Open `/tmp/cmdcontract-demo/readme-contract.yaml` to show generated starter contracts from command fences.
4. Open `/tmp/cmdcontract-demo/sample-report.md` to show a shareable Markdown report.
5. Close on the safety posture: temp workspaces, copied fixtures, minimal environment, and secret-looking output redaction.

## Claims To Avoid

- Do not claim it sandboxes arbitrary malware.
- Do not claim generated specs are ready to merge without review.
- Do not imply it replaces full integration tests.
