# Liss Immich — CURRENT

RECORDED_DATE = EVENT_DATE = 2026-10-28
ASSIGNMENT_ID = liss-immich-development
STATE = READY_D0 / OPERATOR_ACTIVATION_PENDING
INTEGRATION_BRANCH = liss
UPSTREAM_BASELINE = 8303cb117e197c700332b33b61b45314c9cc5bb4

## Current work

[D0 — document the existing upstream architecture](https://github.com/AV-Lex/liss-immich/issues/1)
is the first task. Create and verify the compact source map in
LISS_FORK.md before implementation. No application behaviour change
belongs to D0. Bootstrap files are not an architecture acceptance.

## Next

[D1 — folder-album v0](https://github.com/AV-Lex/liss-immich/issues/2)
follows accepted D0. The owner continues the normal development cycle;
there is no repeated approval for each ordinary step. Significant product
boundary questions return in the corresponding issue.

The actual execution holder and task progress are recorded in the task
thread. Source and installed/runtime state must remain distinct.

## Finish condition

After accepted source and operator handoff, including concrete fixes from
initial acceptance: record exact source/result, set PARKED and request
removal from recurring execution. Do not start a future feature backlog.
Preserve the fork and its results.

Branch policy and source entry: [LISS_FORK.md](LISS_FORK.md).
Task detail and history stay in the existing issues.
