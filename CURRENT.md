# Liss Immich — CURRENT

RECORDED_DATE = EVENT_DATE = 2026-10-30
ASSIGNMENT_ID = liss-immich-development
STATE = D1_SOURCE_ACCEPTED / WAIT_OPERATOR_INSTALL
INTEGRATION_BRANCH = liss
UPSTREAM_BASELINE = 8303cb117e197c700332b33b61b45314c9cc5bb4

## Accepted source

[D0](https://github.com/AV-Lex/liss-immich/issues/1) and R0 are accepted.
[D1 — folder-album v0](https://github.com/AV-Lex/liss-immich/issues/2)
is source-accepted and integrated through [PR #8](https://github.com/AV-Lex/liss-immich/pull/8).
Exact reviewed candidate:
[`6c58b0370eb3fd86cf8ead45fd9e9f521f60de93`](https://github.com/AV-Lex/liss-immich/commit/6c58b0370eb3fd86cf8ead45fd9e9f521f60de93).
Integration:
[`cb01a95f0a95da1e28169e4afb596a93a4dd7faf`](https://github.com/AV-Lex/liss-immich/commit/cb01a95f0a95da1e28169e4afb596a93a4dd7faf).
Both have tree `0cb121fa55e6a0bb73a3572741ea98288e98d757`.
`main` remains the unchanged upstream copy.

[Coverage, exact commands and independent reports](https://github.com/AV-Lex/liss-immich/issues/4#issuecomment-6504275965)
and [full R1 result with owner disposition](https://github.com/AV-Lex/liss-immich/issues/4#issuecomment-6504510090)
record source acceptance. Claude job
`claude-liss / 9fb826c5-dee7-43cc-ba32-b86b8537e254` completed without
surviving FAIL findings. Native server, PostgreSQL/Valkey/file, API/CLI,
mobile and actual baseline-revert/start/download checks passed on the exact
candidate tree. Matching synthetic DB/media snapshots and raw receipts are retained.

Current web E2E stopped before tests on a registry rate limit; its matrix peer
was cancelled. Prior checks passed on unchanged web source. Current web E2E,
inherited self-hosted lint availability, registry export and proprietary Dart
analysis limits remain explicit in the acceptance record. Source acceptance
does not establish installed operation.

## Next dependency and owner

Next owner: the separately assigned runtime/library operator installs the
accepted source into the existing native/no-Docker/no-ML installation using
[the deployment-neutral native build/update/check/rollback contract](docs/docs/features/folder-albums.md#native-build-and-runtime-contract).
The [D1 handoff correction](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6507850040)
supersedes the earlier Compose installation assumption. Docker/Compose remains
only a generic packaging/test route, not the HOME installation plan; do not
create a parallel runtime. Infra owns concrete paths, units, users, configuration
and commands in its private canon. Keep the exact source/native-artifact receipt
and matching database plus complete media snapshot. First verify a small synthetic library: opt-in first placement,
upload then later association and later uploads, stable IDs, readable paths,
original bytes/hash/mtime, repeated processing and the documented recovery path.
Return sanitized installed source/artifact and verification results to
[the exact D1 task thread](https://github.com/AV-Lex/liss-immich/issues/2).
Real-library deployment remains outside the development owner's authority.

The development owner stays in rotation to review installed results, resolve
concrete findings and deliver any agreed fixes through installation and verification.
While this dependency is pending, do not select unrelated backlog or repeat an
unchanged empty/blocker report. The assignment is not PARKED.

## Finish condition

After successful actual installation and verification, ask the maintainer
whether concrete follow-up fixes remain and record the answer in #2. Complete
any agreed fixes and verify their installed result. Only the maintainer's explicit
decision to finish after those steps permits PARKED and a removal request after
the active run ends. Source merge, handoff or issue closure alone is insufficient.
Preserve source, results and recovery material.

Branch policy and source entry: [LISS_FORK.md](LISS_FORK.md).
Task detail and history stay in the existing issues.
