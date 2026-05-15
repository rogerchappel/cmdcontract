# Contributing

Thanks for helping keep CLI docs honest.

## Local setup

```bash
npm install
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Pull request expectations

- Keep changes small and purposeful.
- Add or update fixture-backed tests for behavior changes.
- Prefer deterministic output over broad snapshots.
- Update README/docs when CLI behavior changes.
- Do not add telemetry or hosted-service assumptions.

## Contract safety

Contracts are executable shell snippets. Treat new examples and fixtures as code review material, especially when they touch the network, filesystem, or environment variables.
