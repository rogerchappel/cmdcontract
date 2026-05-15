# Safety model

CmdContract is local-first, but it still executes shell commands. The safety goal is to make the default path reviewable and hard to accidentally widen.

## Defaults

- Every contract command gets a fresh temporary workspace.
- Fixture paths are constrained to the contract directory.
- Workspace paths are constrained to the temp workspace.
- Environment pass-through is intentionally small.
- Results redact common secret-looking environment assignments.
- Starter generation skips obvious destructive README examples.

## What CmdContract does not promise

- It is not a sandbox or container runtime.
- It does not prevent a malicious command from using available local tools.
- It does not audit transitive commands spawned by your shell snippet.

## Recommended CI use

Use small fixtures, avoid live credentials, and prefer commands with explicit dry-run/read-only flags. If a command needs network or secrets, put that in a separate manually reviewed job.
