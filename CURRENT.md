# Liss Immich — CURRENT

RECORDED_DATE = EVENT_DATE = 2026-11-11
ASSIGNMENT_ID = liss-immich-development
STATE = D1_PHONE_AND_FULL_IMAGE_CHECK_VERIFIED / WAIT_MAINTAINER_FOLLOWUP_DECISION
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
live UI read-back remain operator-owned. Its strings are included in the combined
installed follow-up checkpoint below. The selected installed Russian status is
confirmed below; the other four strings have no explicit live read-back.

The agreed [#16](https://github.com/AV-Lex/liss-immich/issues/16) follow-up is
source-accepted through [PR #19](https://github.com/AV-Lex/liss-immich/pull/19),
based on `72da94c01db610c261213396f58772c6a29245f0` (including #17 localization).
Its exact final source, reproducible checks and review disposition are returned
in that task thread. Reviewed implementation:
[`7b5a76c9d0f58bda5e9af34d74ed10c34c48f28b`](https://github.com/AV-Lex/liss-immich/commit/7b5a76c9d0f58bda5e9af34d74ed10c34c48f28b);
later test/continuation-only edits preserve the production files.

New allocations use readable reserved names and numeric collision suffixes. An
explicit owner-only `migrateFolderName: true` album update transitions one existing
UUID directory, preserves enabled state and replays bound removed/hidden/trashed
files through existing jobs/move history. Ordinary display rename does not move
files. Table/sidebar/card markers distinguish enabled and retained bindings;
cards link an owner-root-relative label to the real folder. The
[bounded native transition and recovery contract](docs/docs/features/folder-albums.md#one-existing-d1-directory-explicit-readable-name-transition)
defines the operator action. No new schema migration or bulk rename is added.

Independent behavior and pre-design simplicity checks passed. Required Claude
review `claude-liss / 64a340d5-876d-465e-bd5b-80df524577ca` found no violated source
invariant; its enabled-legacy coverage finding was accepted and committed as
native medium cases for both enabled states and original/sidecar interruptions.
The source result records actual CI evidence and remaining tooling limits.
Case-insensitive filesystem equivalence, arbitrary submillisecond replay and
real-browser hit testing are not established by the source checks.

## Installed follow-up checkpoint (2026-11-10)

The development owner read the complete operator report and structured receipt,
checked their agreement with the [sanitized native return](https://github.com/AV-Lex/liss-immich/issues/16#issuecomment-6772996463)
and prior staged archive identity, and accepts the qualification/installation
checkpoint on operator-reported evidence. This is not independent interactive
behavior acceptance or completion of the selected existing-binding transition.

Installed implementation: **d0f9b2b9fcee587a05ea91e209c4d813132b6749**, including #17.
Native archive SHA256:
`10e9b85804f4c0e8f5b3303b015bc8d685583ab4945179ada5d744169ee9598d`;
manifest SHA256:
`9d9a29c8972d47ff58c63e90c841ce37d8a985d288cbc9ab3ec0caa2f36cda2a`.
The operator reports all 34,736 release entries verified, 306 compiled migrations
identical to the old release and all 102 ledger rows unchanged. No migration ran.
126 asset identities/paths/checksums and 378 non-marker files retained
bytes/hash/ownership/mode/nanosecond mtime; six expected startup markers were
rewritten. Current API/worker, trusted HTTPS, served HTML/entry assets, ML-off and
stock-templates-off checks passed, with zero outstanding moves. Old release and
configuration remain retained. The maintainer's one-update test-library exception
below applies; no new full backup, restore or recovery PASS is claimed.

Bounded native tests passed case-sensitive readable allocation/collisions,
both enabled states, removed still/hidden motion/bound trash/eligible members,
interrupted original and sidecar replay, download and stable repeat. Ordinary
renames preserved exact nanosecond mtime. Both injected replays differed by
-94 ns, exactly reproduced by the actual Node Date/utimes control on the same
filesystem while Node mtimeMs stayed unchanged. Arbitrary submillisecond
preservation and real video decoding remain unproved. Test setup repairs covered
parent traversal/ownership, quiet psql output and faithful original-before-sidecar
interruption; no application defect or source patch was established. Failed
attempts and fixture state remain operator-retained. Do not repeat the completed
qualification/install or initial D1 migration/revert matrix.

## Selected transition and browser return (2026-11-11)

The [selected transition return](https://github.com/AV-Lex/liss-immich/issues/16#issuecomment-6793148299)
reports completion of the one agreed owner PATCH on the installed
`d0f9b2b9fcee587a05ea91e209c4d813132b6749`. The development owner read the
operator's corresponding return and compared it with the public report.
The operator independently verified three original asset identities and album
memberships, all nine referenced files' bytes/SHA256/nanosecond mtime, absence
of the old original paths and empty move history. The selected physical folder
now has a readable name without the UUID suffix. This bounded installed
transition checkpoint is accepted on operator-reported evidence; do not repeat it.

Lex reported that the selected album's Russian folder status, folder link into
Folder View and separate card navigation/menu behavior worked. The
[localization return](https://github.com/AV-Lex/liss-immich/issues/17#issuecomment-6793224878)
confirms the selected Russian status. This is maintainer-reported browser
acceptance on one album. It does not explicitly establish all five #17 strings,
enabled/retained markers in each table/sidebar/card location, the relative card
label or each individual cover/title/link hit target. No source defect is
reported, and no code change or runtime action was performed in this assessment.

## Phone upload and full-image return (2026-11-11)

The development owner read the [phone and later-upload return](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6794860479)
and its corresponding operator record and accepts this bounded installed-use
checkpoint on operator- and maintainer-reported evidence. Installed implementation
remains `d0f9b2b9fcee587a05ea91e209c4d813132b6749`.

Lex reported two separate additions from the phone to the selected enabled folder
album; membership increased from three to four and then five. The operator
verified that both new originals retain the same album binding, physically reside
in its readable directory and match their catalog checksums. Previously checked
originals retained their identities, paths, bytes and file timestamps, with empty
move history. Lex confirmed full-size viewing and, for one image, matching pixel
dimensions between the saved phone image and the server file. This completes the
requested phone/later-upload and full-image live checkpoint for the selected album.
It does not establish every device, background-sync scenario or unobserved API
ordering; no new source defect or code/runtime action is reported here.

Next owner: maintainer to report concrete remaining fixes or explicitly decide
that this stage is finished, taking account of the still-unreported #16
marker/relative-label/individual-hit-target observations and four #17 wording
observations described above. Return any outstanding UI observations to #16,
wording to #17, and the follow-up/finish decision to #2. The assigned operator
handles any required integrity read-back under its existing assignment. Completed
installation, qualification, selected transition and phone/full-image checks need
no repeat. The assignment remains active through the decision and any agreed
fixes, including their installation and verification; it is not PARKED. Earlier
replay-precision, video-decoding and backup/recovery limits remain unchanged.

## Earlier operator checkpoints (historical)

The [2026-11-06 operator preparation return](https://github.com/AV-Lex/liss-immich/issues/16#issuecomment-6691503145)
identified an HTTP-method typo in the selected-binding transition guide. Step 2
now correctly specifies `PATCH /api/albums/<album-ID>`, matching the accepted
controller and OpenAPI contract. Accepted implementation/build source remains
`d0f9b2b9fcee587a05ea91e209c4d813132b6749`; this documentation correction
changes no runtime behavior.

The [2026-11-06 staged native candidate return](https://github.com/AV-Lex/liss-immich/issues/16#issuecomment-6692161240)
reports a persisted combined build and inactive stage for that accepted source,
including #17. The operator reports 1,771 exact source-blob checks, verification
of all 34,736 artifact entries and byte-identical compiled migrations against the
installed D1 release, plus passing offline dependency checks. Candidate archive
SHA256: `10e9b85804f4c0e8f5b3303b015bc8d685583ab4945179ada5d744169ee9598d`.
These are operator-reported build/staging results; bounded native transition
qualification, the installed switch, selected owner PATCH and live UI checks
were pending. At that staging checkpoint, the installed identity was still the
previous D1 release.

The [operator's maintainer scope clarification](https://github.com/AV-Lex/liss-immich/issues/16#issuecomment-6693074563)
waives mandatory full backup and a separate restore drill for this one update of
the current reloadable test library. For this update, that exception supersedes
the matching-recovery-set prerequisite above. Preserve the old release/configuration;
verify the ledger, outstanding moves, selected transition and bytes/hash/mtime.
No backup/recovery PASS is claimed. The normal product/non-test-library recovery
contract remains unchanged, and no deletion or reset is authorized. The assigned
operator owns the pending native qualification/update/transition and live checks;
phone behavior, full-image opening and maintainer finish remain open.

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

At the initial D1 checkpoint, installed source was
`6c58b0370eb3fd86cf8ead45fd9e9f521f60de93`; the 2026-11-10 checkpoint above supersedes it.
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

At the initial D1 checkpoint, next owner was the maintainer for interactive use,
with the separately assigned operator checking installed paths/data and handling
runtime actions. On a small synthetic
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
