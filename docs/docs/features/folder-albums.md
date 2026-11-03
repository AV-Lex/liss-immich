# Folder albums (Liss v0)

An album owner can choose **Use as folder album** in the web album menu. This
explicitly applies the first layout to eligible existing members and future
additions. Ordinary albums keep their existing many-to-many behavior. Existing
mobile and CLI uploads continue to use the ordinary upload and album Add APIs.

Managed originals owned by the album owner go into
`library/<user-root>/folder-albums/<readable-name>/`, with readable original
basenames and the existing file collision suffixes. Equal or similarly sanitized
album names receive readable directory suffixes such as `Camera (2)`. The selected
directory is reserved in the existing folder binding, including disabled and
deleted-album bindings; existing filesystem entries and outstanding move-history
directories are excluded. Sidecars use the
original's destination plus `.xmp`; linked motion files use the still's folder.
External assets and embedded Android motion files retain upstream behavior.

Directory reservations compare normalized POSIX paths case-sensitively. The
source checks qualify case-sensitive storage; equivalence on case-insensitive
library filesystems is not established. Confirm the intended filesystem during
native qualification before enabling or transitioning a folder.

The first folder assignment is persistent. Adding an assigned asset to another
album, removing membership, renaming an album, stopping new assignments, or
deleting the logical album does not move or delete its original. The folder's
name is fixed when enabled; renaming the display name does not rename files.
Re-enabling the same album reuses its directory. Account and asset deletion still
follow upstream behavior. Existing UUID-suffixed D1 directories stay in place
until an owner explicitly requests the bounded transition described below.

The album table, recent albums in the sidebar and card covers show the same
folder marker for a retained binding. Its accessible label distinguishes enabled
placement from stopped new assignments. Ordinary logical albums have no marker.
Cards also show a linked `~/folder-albums/<name>` label beneath the album title,
relative to the owner's existing library root. `~` is display shorthand only;
links use the real path. Folder View and its breadcrumbs keep their existing
behavior. If the saved path is outside the current owner root, the shorthand is
omitted rather than guessing a root.

An unassigned asset belonging to several enabled folder albums is skipped and
logged as a placement conflict. No album is chosen by creation date. Remove the
conflicting membership, then retry by adding the asset again or running the
existing storage-template migration job. Normal previews can still be generated
for skipped assets. The Folder View shows physical locations; it does not sync
filesystem edits back into albums.

Folder placement works independently of the stock storage-template enable flag.
Unassigned assets keep stock behavior. Repeated stock single/full jobs preserve
an existing folder assignment. The full job also retries incomplete folder moves.

## One existing D1 directory: explicit readable-name transition

This is an owner-selected transition of one existing binding, not a bulk rename
or a change to ordinary album rename. It uses the same asset IDs, album ID,
first-folder binding, job queue, database lock and recoverable per-file moves.
No additional schema migration is required by this follow-up.

The operator first stages the accepted native server/web release together using
the contract below, verifies the existing migration ledger, and retains a fresh
matching database/media/configuration/queue recovery set. Qualify the transition
on a disposable synthetic binding before the selected installed test album.
Keep the old source/release and evidence until installed verification and any
agreed fixes are complete.

1. Read the selected owner's album and retain its ID, folder binding/enabled
   state, current path, all bound asset IDs plus eligible current members while
   enabled, and each original/sidecar/motion path. Include bound assets removed
   from logical membership, hidden motion companions
   and trashed bound originals. Record bytes/hash and filesystem mtime; retain
   unresolved move history and its files. This is the bounded inventory to compare
   after completion, not permission to opt in another real-library album.
2. As that album's owner, send `PUT /api/albums/<album-ID>` with JSON
   `{"migrateFolderName": true}` using the existing authenticated API route.
   Supply no `isFolderAlbum` field in the same request. This changes a legacy
   directory ending in `--<this-album-UUID>` to an allocated readable destination;
   it does not enable a disabled binding. Ordinary update clients omit this field.
   The returned absolute path is the reserved destination during partial progress,
   not proof that every file is already there. A readable destination cannot have
   the legacy suffix shape, so repeating the request preserves the chosen path.
3. Let the existing storage jobs finish. The request queues bound assets even if
   they are no longer logical members, hidden or trashed; current members are
   additionally eligible only while the binding is enabled. Each asset finishes
   any retained move intent before moving toward the reserved folder. Originals,
   sidecars and motion companions remain separately recoverable, not atomic.
4. If delivery, queueing, restart or movement fails, first reread the same album,
   actual database paths, files and move history. Repeat the same one-album
   request to requeue against its retained target. A crash between target
   reservation and queueing requires this explicit replay; no new automatic retry
   guarantee is claimed. Preserve conflicting files/history and investigate
   logged failures; never repair with a filesystem-only rename, overwrite,
   manual database path edit or blind restoration of an older database alone.
5. Check every inventoried asset's stable IDs/binding, readable original and
   companion paths, sidecar alignment, downloaded/disk bytes and hashes, and
   filesystem mtime. Verify no outstanding history for those files and no leftover
   source copies; an empty old directory is harmless. Repeat the request once and
   confirm the same reservation and no further movement. Check duplicate and
   similarly sanitized album names on synthetic data remain distinct. Existing
   Date/utimes replay precision limits below still apply; a matching snapshot must
   preserve its exact filesystem timestamps.
6. In the served web UI, verify the folder marker beside the table name, in the
   sidebar and on the card cover, including stopped-new-assignment status. Check
   the path label beneath the card title, its actual Folder View destination,
   ordinary album navigation/menus and unchanged Folder View breadcrumbs. Click
   the cover/title, folder link and menu button separately to check that the
   stretched album link does not intercept the other controls. Return
   the exact installed source/artifact identity, bounded transition result and UI
   limits to [#16](https://github.com/AV-Lex/liss-immich/issues/16) and D1 #2.

Recovery uses the matching snapshot/release procedures below. Restoring only the
old executable does not restore a previous physical layout: the binding target
and recorded asset paths are database state. Preserve a matching post-transition
recovery set before any old-baseline rollback. Source acceptance and synthetic
checks do not establish installed transition or live UI success.

## Build and upgrade

The original accepted D1 implementation is
[`6c58b0370eb3fd86cf8ead45fd9e9f521f60de93`](https://github.com/AV-Lex/liss-immich/commit/6c58b0370eb3fd86cf8ead45fd9e9f521f60de93),
integrated at `cb01a95f0a95da1e28169e4afb596a93a4dd7faf` with the identical
source tree. It remains based on Immich 3.3.5. The readable-name and album-marker
follow-up is tracked in [#16](https://github.com/AV-Lex/liss-immich/issues/16); use
its exact accepted source receipt for the combined build. Historical D1 checks
do not establish installed behavior of that follow-up.

Docker/Compose below is a generic packaging and synthetic-test route. **Lex HOME
uses an existing native installation, without Docker or ML**, with a separate
operator-owned binding. The Compose examples are not its installation plan.
Do not install Docker or create a second Immich runtime to follow this guide.
Concrete service units, users, paths, secrets and commands belong to the private
operator canon; this public contract supplies only deployment-neutral inputs.

Use the Node, pnpm, Java and generator versions pinned by [mise.toml](https://github.com/AV-Lex/liss-immich/blob/6c58b0370eb3fd86cf8ead45fd9e9f521f60de93/mise.toml)
and the lockfile. The existing source-check commands are:

```sh
mise run //:plugins
mise run //server:build
mise run //:open-api
pnpm --filter immich check
pnpm --filter immich test --run src/services/storage-template.service.spec.ts src/services/album.service.spec.ts src/cores/storage.core.spec.ts
pnpm --filter immich test:medium --run test/medium/specs/services/storage-template.service.spec.ts test/medium/specs/repositories/folder-placement-queue.spec.ts test/medium/specs/repositories/storage-locks.spec.ts
```

### Native build and runtime contract

Build in a clean checkout on the target OS/architecture, separate from the live
installation. Install the pinned tools with `mise install --locked` in the
operator's build environment. Node **24.22.1** and pnpm **11.27.1** are pinned;
plugin generation also needs the pinned Extism CLI/JS PDK and Binaryen tools.
Java/OpenAPI tools are needed for interface regeneration, not server startup.
The accepted generated interfaces are already committed. From the checkout root:

```sh
: "${LISS_SOURCE_SHA:?set the full accepted source SHA from the task result}"
git checkout --detach "$LISS_SOURCE_SHA"
pnpm install --frozen-lockfile
mise run //:plugins
pnpm --filter immich build
pnpm --filter immich-web build
# Optional operator CLI, if retained by the existing installation:
pnpm --filter @immich/cli build
```

Retain these outputs as one versioned release, using the existing native
installation layout:

| Component    | Build output and runtime requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server       | `server/dist/`, `server/bin/`, `server/package.json` and `server/helmet.json`, with resolved production dependencies (including workspace `@immich/plugin-sdk`). Keep all compiled files in `dist/schema/migrations/`; retain source `server/src/schema/migrations/ORDER` with the build checkout for migration tooling. Copying JavaScript alone is insufficient. The existing [Dockerfile](https://github.com/AV-Lex/liss-immich/blob/6c58b0370eb3fd86cf8ead45fd9e9f521f60de93/server/Dockerfile) shows the corresponding `pnpm --filter immich --prod --no-optional deploy <staging-directory>` packaging operation; a retained complete build checkout is another way to preserve dependency resolution. |
| Web          | Static `web/build/` contents deployed as `<IMMICH_BUILD_DATA>/www/`, including `index.html`. No separate Node web server is required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Core plugin  | `packages/plugin-core/dist/` and `manifest.json` deployed together as `<IMMICH_BUILD_DATA>/plugins/immich-plugin-core/{dist/,manifest.json}`. Preserve native Extism runtime dependencies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Data assets  | Existing compatible geodata under `<IMMICH_BUILD_DATA>/geodata/`; preserve the baseline's assets and native dependency receipt. These are not generated by the server TypeScript build.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Optional CLI | `packages/cli/bin/`, `dist/` and resolved production dependencies; the server's `start.sh` is a different entry point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

`IMMICH_BUILD_DATA` defaults to `/build`; set it to the existing operator-owned
asset root instead of assuming a container path. [ConfigRepository](https://github.com/AV-Lex/liss-immich/blob/6c58b0370eb3fd86cf8ead45fd9e9f521f60de93/server/src/repositories/config.repository.ts)
resolves web, plugin and geodata paths beneath it. Preserve the existing
`IMMICH_MEDIA_LOCATION`, database/Redis settings, service identity, permissions,
configuration and all media roots. Do not move a library as part of packaging.

Runtime needs the pinned Node ABI, PostgreSQL with the baseline's compatible
vector extensions, the existing Redis-compatible queue service, native Sharp/
libvips and Extism support, FFmpeg/ffprobe, ExifTool and ImageMagick used by the
baseline. Build/install native dependencies for the target OS and architecture;
do not transplant another platform's `node_modules`. Reuse the existing native
dependency provisioning and record versions. D1 adds no ML requirement: preserve
the existing disabled machine-learning configuration (including persisted or
file-based overrides); do not enable an ML endpoint during this update.

The production entry is `node dist/main.js` from the server release directory,
or its existing `bin/start.sh` wrapper, under `NODE_ENV=production` and the
operator's secure environment. [The supervisor](https://github.com/AV-Lex/liss-immich/blob/6c58b0370eb3fd86cf8ead45fd9e9f521f60de93/server/src/main.ts)
starts API and microservices workers by default. Keep the existing unit topology
and worker selection; do not add another supervisor alongside it. Record source
SHA, artifact hashes, tool/dependency versions and environment _names_ in the
release receipt; never publish secrets. Preserve the old release for recovery.

### Native update and installed verification

Infra maps the following sequence onto its existing service and records the
site-specific commands privately. The build above does not authorize deployment.

1. Stage and inspect the complete release and configuration before interruption.
   Block incoming uploads/API writes and scheduled producers. Drain active jobs
   and file moves with the current runtime, then stop every API/worker process
   and disable automatic restarts for the maintenance window. Confirm no remaining
   process can write the database or media. Preserve pending queue work; do not
   clear Redis to obtain an idle state. If moves cannot finish, retain their
   history/files and investigate before updating.
2. With writers stopped, capture a matching database plus **complete media**
   snapshot, retaining paths, permissions and fractional mtimes, configuration,
   migration ledger and queue recovery state. Verify hashes and a sample restore.
   Keep this pre-update recovery set and the old release. Database and media
   snapshots from different times are not interchangeable.
3. Use the staged D1 checkout/toolchain and the same database identity. Supply
   `DB_URL` securely through the operator environment (the package script has a
   development fallback, so explicitly require the real value), then run from
   that checkout root:

   ```sh
   : "${DB_URL:?supply the existing database URL securely}"
   pnpm --filter immich migrations:run
   ```

   Retain output and verify the applied ledger contains
   `1793289600000-FolderAlbums`, with no unexpected migration. This additive
   migration enables no albums and moves no files. Server startup also runs
   pending migrations; explicit execution while stopped separates that receipt
   from service restart. Do not generate migrations or edit their ledger.

4. Select the staged server, web and plugin release together, restart the existing
   native service topology, and keep public writes blocked until startup,
   migrations, database/queue access and static web loading are healthy. Verify
   `GET /api/server/ping`, source/artifact receipt and logs; a successful ping
   alone does not establish placement correctness. Do not start an old release
   against the migrated database on a restart failure.
5. In a small synthetic library, verify default-off behavior, owner opt-in for
   existing members, upload then later ordinary Add, later uploads, unchanged
   asset/album IDs, readable paths, downloaded/disk bytes and hashes, fractional
   mtime and repeated processing. Check conflicting membership and the documented
   interrupted-move/replay path without using real media for fault injection.
   Verify ordinary client upload/Add and the folder controls in the served web.
   Use the rollback/recovery procedure below on a disposable matching copy before
   applying it to a real library. Reopen normal traffic only after operator
   acceptance; retain snapshots and logs through installed verification and fixes.

Return the sanitized exact source/artifact identity, installed checks and limits
in [D1 #2](https://github.com/AV-Lex/liss-immich/issues/2). Keep the private service
binding and raw operational details in the operator canon. Source/CI acceptance
is already recorded; this native site installation has not been verified by the
development owner.

### Generic Docker/Compose packaging route

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
binding. If a retained stock move predates the first assignment, the job finishes
that recorded intent before completing the first folder layout with a fresh
durable move. Original and sidecar history destinations are not retargeted during
recovery. A duplicate ordinary Add can repair an earlier membership/enqueue gap.
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

Timestamp restoration uses Node Date/utimes; source rollback checks compare
`fs.stat.mtimeMs`. In the [disposable native qualification](https://github.com/AV-Lex/liss-immich/issues/2#issuecomment-6575973972),
interrupted replay changed a filesystem mtime by +89 ns while that millisecond
value stayed unchanged; a plain-file probe reproduced the difference. Normal
rename placement retained the recorded nanosecond values. Nanosecond-exact replay
and arbitrary sub-millisecond preservation are not established. Matching recovery
snapshots must still preserve and verify the actual filesystem timestamps.

## Fallback and rollback

Stopping new assignments in the same new binary is the immediate fallback.
Already assigned files retain their readable paths; pausing the existing storage
queue stops movement entirely. Disable stock storage templates as well if a
stable layout is required during recovery.

The baseline refuses an unknown executed migration, so starting an old binary
directly against a D1-migrated database is not a supported rollback. To retain
the completed readable layout in a source rollback:

1. Stop all API writes, workers and file moves. Verify that `move_history` is
   empty. Keep the exact new source and native release or image available for recovery.
2. Capture and verify a matching **post-placement database plus complete media**
   snapshot. Retain this snapshot and binding information separately throughout
   rollback; schema down discards folder policy, not original paths or files.
   Preserve fractional mtimes (for example, GNU tar `--format=pax`), and verify
   extracted sample bytes, hash and mtime against the live receipt.
3. With the D1 source/toolchain, run the native last-migration revert
   (`pnpm --filter immich migrations:revert` from the retained D1 checkout root,
   with the existing `DB_URL` explicitly supplied as in the native update above).
   This one-shot command must run while all API/workers remain stopped. Confirm
   the last migration is
   `1793289600000-FolderAlbums`; do not revert another migration. Its down guard
   refuses outstanding move history. Never edit the migration ledger manually.
4. Keep stock templates disabled, start the matching baseline native release or image built from
   `8303cb117e197c700332b33b61b45314c9cc5bb4` (including its web/plugins), and
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

Restore the matching post-placement snapshot and D1 native release or image together to recover
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
