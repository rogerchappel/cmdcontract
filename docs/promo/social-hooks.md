# CmdContract Social Hooks

## Short Hooks

- README examples drift because nobody runs them. `cmdcontract` turns CLI snippets and fixture-backed commands into executable contracts.
- The demo runs a contract, generates a starter spec from README command fences, and turns saved JSON results into a Markdown report.
- Local-first docs testing: temp workspaces, copied fixtures, normalized noisy output, and no hosted service requirement.

## Demo CTA

```sh
npm run build
bash demo/run-readme-contract.sh
```

The script writes TAP, a generated contract, and a Markdown report under `/tmp/cmdcontract-demo`.

## Guardrails

- Say "executes reviewed shell commands" rather than "safe for arbitrary untrusted commands."
- Do not imply generated contracts replace human review; README generation skips obvious foot-guns but still needs review.
- Keep the focus on documentation drift, CLI smoke checks, and reproducible fixtures.
