# Folder albums (Liss v0)

An album owner can choose **Use as folder album** in the web album menu. This
explicitly applies the first layout to eligible existing members and future
additions. Ordinary albums keep their existing many-to-many behavior. Existing
mobile and CLI uploads continue to use the ordinary upload and album Add APIs.

Managed originals owned by the album owner go into
`library/<user-root>/folder-albums/<readable-name>--<album-UUID>/`, with readable
original basenames and the existing numeric collision suffixes. The UUID keeps
albums with equal or similarly sanitized names separate. Sidecars use the
original's destination plus `.xmp`; linked motion files use the still's folder.
External assets and embedded Android motion files retain upstream behavior.

The first folder assignment is persistent. Adding an assigned asset to another
album, removing membership, renaming an album, stopping new assignments, or
deleting the logical album does not move or delete its original. The folder's
name is fixed when enabled; renaming the display name does not rename files.
Re-enabling the same album reuses its directory. Account and asset deletion still
follow upstream behavior.

An unassigned asset belonging to several enabled folder albums is skipped and
logged as a placement conflict. No album is chosen by creation date. Remove the
conflicting membership, then retry by adding the asset again or running the
existing storage-template migration job. Normal previews can still be generated
for skipped assets. The Folder View shows physical locations; it does not sync
filesystem edits back into albums.

Folder placement works independently of the stock storage-template enable flag.
Unassigned assets keep stock behavior. Repeated stock single/full jobs preserve
an existing folder assignment. The full job also retries incomplete folder moves.

## Build and upgrade

Use the Node, pnpm, Java and generator versions pinned by `mise.toml` and the
lockfile. Follow the repository's native build and Compose installation workflow;
the version remains based on Immich 3.3.5. From the source checkout:

```sh
mise run //:plugins
mise run //server:build
mise run //:open-api
pnpm --filter immich check
pnpm --filter immich test --run src/services/storage-template.service.spec.ts src/services/album.service.spec.ts src/cores/storage.core.spec.ts
pnpm --filter immich test:medium --run test/medium/specs/services/storage-template.service.spec.ts test/medium/specs/repositories/folder-placement-queue.spec.ts test/medium/specs/repositories/storage-locks.spec.ts
```

Build the existing Dockerfile, including its web, CLI and plugin stages, with a
lowercase local tag. Replace the placeholder with the accepted full source SHA:

```sh
export LISS_SOURCE_SHA=<accepted-source-sha>
git checkout --detach "$LISS_SOURCE_SHA"
docker build -f server/Dockerfile \
  --build-arg BUILD_SOURCE_COMMIT="$LISS_SOURCE_SHA" \
  --build-arg BUILD_SOURCE_REF="$LISS_SOURCE_SHA" \
  --build-arg BUILD_IMAGE=liss \
  --label "org.opencontainers.image.revision=$LISS_SOURCE_SHA" \
  -t "liss-immich-server:$LISS_SOURCE_SHA" .
docker image inspect "liss-immich-server:$LISS_SOURCE_SHA" > image-receipt.json
```

Record the image ID, revision label, source/build arguments and build log with
the source SHA. The inherited GitHub release publisher currently attempts an
uppercase fork registry path; its export result is separate from building and
running this local image. No registry publishing is needed here.

In the existing installation directory, retain its Compose file, environment,
database and media mounts. Add a local `compose.liss.yml` override:

```yaml
services:
  immich-server:
    image: liss-immich-server:${LISS_SOURCE_SHA}
    pull_policy: never
```

Before updating, stop writes/jobs and retain a matching database and complete
media snapshot. Recreate the existing service using the override:

```sh
docker compose -f docker-compose.yml -f compose.liss.yml up -d --no-deps immich-server
```

Server startup runs the additive `1793289600000-FolderAlbums` migration;
it opts no existing album or asset in and moves no files. Start with a small
synthetic library, enable one album, and verify original downloads, disk hashes,
mtimes, UUIDs and later uploads before applying it to a real library. Source
checks and operator installation are separate results.

## Retry and interrupted moves

Placement uses the existing storage queue, database lock and `move_history`.
Folder placement waits for the existing completed-metadata marker; an upload's
initial EXIF size alone is insufficient. Metadata, sidecar checks/writes, preview,
editor and video readers and movers coordinate
on per-asset advisory locks, refreshing paths after acquisition. A bounded pool
of four lock connections per process keeps ordinary database queries available;
nested Android motion extraction reuses the same lock session. Shutdown closes
this pool. Different assets can still be read concurrently. Long reads delay movement of
that asset and occupy one of the four lock sessions; no new automatic timeout or
retry policy is introduced.
Association-triggered jobs are independent of an already active metadata job
for the same asset. Retries retain the recorded destination and the first folder
binding. A duplicate ordinary Add can repair an earlier membership/enqueue gap.
The existing queue has no new automatic-retry guarantee; use an explicit replay
after resolving a reported error.

For folder moves the history records source size, checksum and timestamps before
filesystem mutation. Recovery verifies a new-only file without statting an absent
old path. If both files exist, it verifies them before completing; a mismatch
retains both files and history. A failed source unlink also retains history.
Insufficient legacy evidence is a failure requiring investigation, not permission
to guess, overwrite or discard files. Preserve the database, both recorded paths
and logs when reporting it. Sidecars and motion files are separate moves, so
partial completion is possible and must be retried.

## Fallback and rollback

Stopping new assignments in the same new binary is the immediate fallback.
Already assigned files retain their readable paths; pausing the existing storage
queue stops movement entirely. Disable stock storage templates as well if a
stable layout is required during recovery.

The baseline refuses an unknown executed migration, so starting an old binary
directly against a D1-migrated database is not a supported rollback. To retain
the completed readable layout in a source rollback:

1. Stop all API writes, workers and file moves. Verify that `move_history` is
   empty. Keep the exact new source/image available for recovery.
2. Capture and verify a matching **post-placement database plus complete media**
   snapshot. Retain this snapshot and binding information separately throughout
   rollback; schema down discards folder policy, not original paths or files.
3. With the D1 source/toolchain, run the native last-migration revert
   (`pnpm --filter immich migrations:revert`). Confirm the last migration is
   `1793289600000-FolderAlbums`; do not revert another migration. Its down guard
   refuses outstanding move history. Never edit the migration ledger manually.
4. Keep stock templates disabled, start the matching baseline source/image, and
   verify startup, original downloads, file hashes/mtimes and retained readable
   `asset.originalPath` values before allowing writes again. Folder controls and
   future first assignments are unavailable in the baseline.

For an image installation, the equivalent native revert uses the same D1 image
and existing Compose network while the service is stopped. Set `DB_URL` to the
existing database's URL, with URL-encoded credentials, through the operator's
normal secure environment. This command does not start the server or workers:

```sh
docker compose -f docker-compose.yml -f compose.liss.yml stop immich-server
docker compose -f docker-compose.yml -f compose.liss.yml run --rm --no-deps \
  --env DB_URL --entrypoint /bin/bash immich-server -lc \
  'cd /usr/src/app/server && node node_modules/@immich/sql-tools/sql-tools.mjs -u "$DB_URL" migrations revert'
```

Keep the output and verify that only `1793289600000-FolderAlbums` was reverted.
Then select the exact baseline image built from
`8303cb117e197c700332b33b61b45314c9cc5bb4` in the same override and recreate the
service with the same database and media mounts. Do not remove volumes.

Restore the matching post-placement snapshot and D1 image together to recover
the exact D1 binding state. A pre-upgrade database/media snapshot is an additional
disaster-recovery option; it may restore the earlier layout and cannot preserve
uploads made afterward. Never combine a database snapshot with files from a
different point in time or treat schema down as a file undo.

The opt-in `e2e/src/specs/server/api/d1-rollback.e2e-spec.ts` runs last in the
existing synthetic x64 CI environment. It requires `IMMICH_D1_BASELINE_IMAGE`
to identify a source-built baseline image with the exact revision label and
build environment above. It stops the current server, retains its anonymous
`/data` volume explicitly, archives matching post-placement DB/media snapshots,
runs the current image's native revert and starts the baseline on those same
resources. Receipts record startup source, HTTP download hash, asset/album IDs,
readable path and disk mtime. Ordinary API/CLI runs skip this destructive
synthetic-only test. Native CI execution and installed operator verification
are separate results; the medium inventory test alone is insufficient proof
of a baseline restart.

Cross-folder Move, hierarchy, reverse sync, automatic folder renaming and a new
mobile build are outside v0.
