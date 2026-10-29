# Liss Immich — CURRENT

RECORDED_DATE = EVENT_DATE = 2026-10-29
ASSIGNMENT_ID = liss-immich-development
STATE = D0_ACCEPTED / WAIT_PILOT_ACCEPTANCE
INTEGRATION_BRANCH = liss
UPSTREAM_BASELINE = 8303cb117e197c700332b33b61b45314c9cc5bb4

## Current work

[D0 — existing upstream architecture](https://github.com/AV-Lex/liss-immich/issues/1)
is accepted by the assigned development owner. The compact map is in
[LISS_FORK.md](LISS_FORK.md), verified against the pinned upstream baseline.
Exact accepted map source:
[5c1f87118bd7b7bb1cebbc8c01cc257bbd5a7603](https://github.com/AV-Lex/liss-immich/commit/5c1f87118bd7b7bb1cebbc8c01cc257bbd5a7603).
The task thread records integration, published-file read-back and reproducible
checks. Only documentation changed; no build, migration or deployment was needed.
This is source acceptance, not installed/runtime verification.

## Next

The control pilot ends after D0 publication and verification. **Do not start D1
in this pilot run.** Next dependency/owner: maintainer pilot acceptance, then the
assigned development owner takes
[D1 — folder-album v0](https://github.com/AV-Lex/liss-immich/issues/2)
in a later ordinary pickup, starting with its implementation plan and fresh
comments. D1 has not started. No unrelated backlog is assigned.

The assignment remains in rotation; it is not PARKED. Runtime/library deployment
and installed verification belong to the separately assigned operator after a
future source handoff. The actual execution holder and task history stay in the
exact task thread.

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
