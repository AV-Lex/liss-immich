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

Accepted source and operator handoff lead to installation, not PARKED.
Keep the assignment in rotation until the assigned operator has actually
installed the change and verified the agreed behaviour in use.

After successful installation and verification, ask the maintainer whether
any concrete follow-up fixes remain. Complete the agreed fixes and verify
their installed result. Only then, with the maintainer's explicit decision
to finish this stage, record exact source and installation/result status,
set PARKED and request removal after the active run ends.

While waiting for installation or an answer, record the dependency and next
owner here. Keep private operational evidence out of this public repository;
a sanitized status is enough. Do not start an unrelated feature backlog.
Preserve the fork and its results.

Branch policy and source entry: [LISS_FORK.md](LISS_FORK.md).
Task detail and history stay in the existing issues.
