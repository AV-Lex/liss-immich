# Liss Immich — CURRENT

RECORDED_DATE = EVENT_DATE = 2026-11-03
ASSIGNMENT_ID = liss-immich-development
STATE = D1_INSTALLED_NATIVE / WAIT_INTERACTIVE_VERIFICATION
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

The [2026-11-03 installed-use return](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6610909041)
reports maintainer confirmation of owner opt-in, enabled status/directory link and
Folder View showing two existing images. The operator independently reports
preserved asset IDs, bytes/SHA1/SHA256, original basenames and mtime_ns after
placement, with zero outstanding moves. This bounded web/existing-member
checkpoint does not establish phone upload/association/later-upload behavior or
opening each full image.

The maintainer requested concrete D1 fixes, [split into two tasks](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6611027359).
[#17](https://github.com/AV-Lex/liss-immich/issues/17) adds Russian translations
for the five existing folder-album strings in `i18n/ru.json`; its source result
does not establish installed Russian UI behavior. Native packaging/update and
live UI read-back remain operator-owned. The accepted installed implementation
and artifact identities below remain unchanged.

Next development pickup: [#16](https://github.com/AV-Lex/liss-immich/issues/16),
the agreed readable physical names, folder markers and relative card path labels,
including a bounded recoverable transition for an existing D1 directory.
Localization does not wait for that task. No maintainer finish decision has been
given; the assignment remains active through agreed fixes and installed checks.

The [2026-11-02 disposable native qualification checkpoint](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6575973972)
records operator-reported PASS for additive migration/default-off, existing-member
and later-upload placement, duplicate/conflict behavior, unresolved-history down
guard, interrupted new-only replay, matched post-placement preservation and exact
baseline revert/startup/downloads. The development owner read the complete report
and structured receipt; this is not independent installed-behavior acceptance.
Accepted implementation and staged native candidate are unchanged.

Interrupted replay showed a +89 ns difference reproduced by a plain-file Node
Date/utimes probe, while the tested Node `mtimeMs` value remained unchanged.
Nanosecond-exact replay and arbitrary sub-millisecond preservation are not proven;
normal rename placement retained the recorded nanosecond values. The strict stop,
probe and guarded completion evidence are retained. This does not relax timestamp
integrity checks for matching snapshots. No implementation fix is indicated by
this observation alone.

The [native installed return](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6580958056)
now reports the accepted implementation running in the existing installation.
The development owner read the complete operator report and structured receipt,
checked agreement with that return and the accepted startup marker-writing source,
and [accepted the native installation checkpoint](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6581054112)
on operator-reported evidence.
This is not independent interactive behavior acceptance.

Installed source remains `6c58b0370eb3fd86cf8ead45fd9e9f521f60de93`.
Native archive SHA256:
`58128ab521a5ccfa0ad1689d014045e486a109eaac5480ca606299aa2de2e3ab`;
manifest SHA256:
`ffe239df1c61cd4ee3bf77c162318a7dac03c8a3697d41c7e4acdbd655ceb0eb`.
Operator verified all 34,736 artifact entries, explicit native migration 101→102
(only `1793289600000-FolderAlbums`), zero enabled folder policies/assignments/moves,
current API/worker, trusted HTTPS, native dependencies, disabled ML and served
HTML/startup assets. Existing 113 asset identities/paths/checksums and 339
non-marker files were preserved. Six expected startup mount markers were rewritten;
the fresh matching recovery set preserves all 345 files including original markers.
Separate database restoration compared all 72 tables plus owners/extensions.
Old release, matching recovery and failed-attempt evidence remain operator-retained.
Operator PATH/config-mode fixes required no repeated migration or application patch.

Production folder opt-in, interactive folder controls and phone behavior were not
exercised by the cutover. Production rollback and off-host/VM-loss recovery remain
unproven. Reuse the completed disposable qualification; do not repeat migration or
fixtures to fill this dependency. The measured replay precision limit above remains.

Next owner: maintainer for interactive use, with the separately assigned operator
checking installed paths/data and handling runtime actions. On a small synthetic
album verify **Use as folder album**, its confirmation/status/directory link and
Folder View/file location, then ordinary phone upload followed by normal album
association and a later upload. Confirm visible results, stable IDs, readable paths,
bytes/hash/mtime with operator assistance; return sanitized PASS or the exact failed
step to [D1](https://github.com/AV-Lex/liss-immich/issues/2). This does not authorize
bulk real-library conversion. Concrete service binding and raw evidence stay in
the operator canon; the public
[native build/update/check/rollback contract](docs/docs/features/folder-albums.md#native-build-and-runtime-contract)
remains the source route.

The development owner stays in rotation to review installed results, resolve
concrete findings and deliver any agreed fixes through installation and verification.
While interactive verification is pending, do not select unrelated backlog or repeat an
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
