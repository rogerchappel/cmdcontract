# Security

CmdContract runs shell commands from contract files. Please report security issues privately before opening public issues.

## Supported versions

The current pre-1.0 line receives best-effort security fixes on `main`.

## Reporting

Open a private GitHub security advisory if available, or contact the maintainer through the repository profile.

Please include:

- The contract file or minimal reproduction.
- The command that was run.
- Expected vs actual behavior.
- Whether secrets, network access, or filesystem writes were involved.

## Current safeguards

- Temporary workspaces.
- Workspace-relative path checks.
- Minimal inherited environment.
- Conservative README generator skips for common destructive commands.
- Secret-looking output redaction.

These are guardrails, not a sandbox. Do not run untrusted contracts on a machine with sensitive access.
