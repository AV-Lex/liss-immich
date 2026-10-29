# Liss Immich

A small Immich fork for readable physical storage associated with
explicitly selected folder albums.

## Working source

- Initial upstream baseline: Immich **3.3.5**,
  [8303cb117e197c700332b33b61b45314c9cc5bb4](https://github.com/immich-app/immich/commit/8303cb117e197c700332b33b61b45314c9cc5bb4).
- Fork integration branch: **liss**. All fork documents and changes live here.
- **main** remains an unmodified upstream copy.
- Assignment and workflow: [AGENTS.md](AGENTS.md).
- Current work: [CURRENT.md](CURRENT.md).
- Tasks and results: [issues](https://github.com/AV-Lex/liss-immich/issues).

## Existing upstream architecture

Source-verified for **3.3.5**, commit
`8303cb117e197c700332b33b61b45314c9cc5bb4`, in [D0][d0].
All upstream links below pin that commit; they describe stock source, not an
installed instance. Start with the [README][readme], [CONTRIBUTING][contributing]
and [architecture overview][architecture]; use the code for version-sensitive facts.

| Responsibility | Contracts and implementation |
| --- | --- |
| Server | TypeScript/NestJS: HTTP controllers and DTOs call services; repositories handle database, filesystem and queue access. [Supervisor][supervisor] starts API and microservices workers. The [Compose file][compose] runs one server service, separate Python machine-learning service, PostgreSQL and a Redis-compatible Valkey queue service. The overview's separate microservices-container description is stale for this baseline. |
| Web | TypeScript/SvelteKit UI in [web][web], using the generated TypeScript SDK. Existing [Folder View][folder-doc] and [folder store][folder-store] browse physical original paths; [ViewRepository][view-repo] selects directories/assets from `asset.originalPath`, scoped to the user and visible, nondeleted timeline assets. This is a view, not an album-to-folder binding or reverse filesystem sync. |
| Mobile and CLI | Flutter/Dart mobile client handles local media, backup and remote sync; [linked-album sync][mobile-sync] uses a Drift database and Riverpod providers (the overview's Isar description is stale). [CLI][cli] provides API-driven bulk upload. Neither client owns server-side physical placement. |
| Persistent data | PostgreSQL holds users, permissions, metadata, identities and relations. [Asset][asset-table] has a generated ID, owner, checksum, `originalPath`, `originalFileName` and file timestamps. [Album][album-table] has its own generated ID/name; [album_asset][album-asset] is a many-to-many relation. [asset_file][asset-file] tracks sidecars/derived files. Filesystem paths are mutable attributes, not asset or album IDs. |
| Storage and jobs | [StorageCore][storage-core] owns common paths and recoverable moves; [StorageRepository][storage-repo] wraps filesystem operations. [JobRepository][jobs] uses BullMQ; decorated service handlers implement metadata extraction, previews, transcoding, storage migration and other jobs. Original bytes live on disk; SQL state and queue state have separate responsibilities. |
| Generated interfaces | Controllers/DTOs produce [OpenAPI JSON][openapi]; [API guide][api-doc] explains generation. The actual [mise tasks][mise] run server schema export and generate TypeScript into `packages/sdk/src/fetch-client.ts` and Dart into `mobile/generated/openapi/` (the guide's TypeScript output path is stale). Update contracts and regenerate clients together when a public API changes. |

### Upload, association and placement

1. [AssetMediaController][upload-controller] accepts multipart upload through the
   upload interceptors. [AssetMediaService][upload-service] chooses a UUID filename
   under `upload/<user>/<two>/<two>/`, creates the asset with the original filename
   and checksum, records optional sidecar data, sets filesystem mtime from
   `fileModifiedAt`, and queues metadata extraction. Duplicate checksum handling
   returns the existing asset ID and queues disposal of the redundant upload.
2. Album association can arrive **after upload**. Mobile [SyncLinkedAlbumService][mobile-sync]
   stores/uses `linkedRemoteAlbumId`, finds uploaded assets missing from the remote
   album, and calls ordinary Add Assets. [AlbumService][albums] creates/updates
   membership and emits album updates; its add/remove paths do not schedule a
   storage-template move. Do not assume membership is available when upload
   metadata processing first runs, or that adding membership will rerun placement.
   The shared-link upload branch also adds album membership within the upload
   request, after queueing extraction; D1 must handle membership already present
   at extraction as well as membership arriving later. This is not a guarantee
   of ordering between the asynchronous worker and the request.
3. [StorageTemplateService][templates] queues a single migration on
   `AssetMetadataExtracted`; the single and full migration handlers require
   `storageTemplate.enabled`. [Asset job queries][asset-jobs] join EXIF data and
   exclude deleted/hidden assets by default; motion companions may include hidden
   assets. `moveAsset` skips external assets and Android motion paths and requires
   a nonzero recorded size. A full storage-template job applies the current
   template to existing eligible assets, then removes empty library directories.
4. Templates render under `library/<storageLabel-or-userId>/` from original
   filename, date, camera and optional album tokens. [Template documentation][template-doc]
   and [implementation][templates] agree: album selection uses `albums[0]` from
   [getByAssetId][album-repo], ordered by album creation descending. It selects the
   newest associated album, not an explicit stable folder album. Names are
   sanitized; distinct albums can render the same directory. Live Photo motion
   parts use the still image's album/date metadata and a motion filename.

### Moves, collisions and recovery boundaries

- [Template path selection][templates] normalizes/checks the library path,
  sanitizes filenames and normalizes extensions. Existing destinations receive
  `+1`, `+2`, etc.; an already matching numeric suffix is retained on rerun.
  `DatabaseLock.StorageTemplateMigration` serializes template moves. These are
  filename protections, not distinct sanitized album-directory identities.
- [StorageCore.moveFile][storage-core] returns for null/empty `oldPath` or an unchanged destination,
  records a move before filesystem mutation, and updates the asset/file path
  before deleting the history entry. [move_history][move-table] has unique
  `(entityId, pathType)` and `newPath` constraints; [MoveRepository][moves] provides
  lookup, updates and orphan cleanup. Reuse this machinery instead of a new file
  mover or scheduler.
- Same-filesystem movement uses rename. On `EXDEV`, it copies, verifies size
  (and checksum when asset info is supplied and hash verification is enabled),
  restores atime/mtime from the source, then unlinks the source. Original moves
  require size/checksum info. Rename preserves the existing file; the explicit
  timestamp restoration is on the copy path. This is source behaviour, not a
  runtime guarantee for every filesystem.
- Sidecars are separate moves to `<new-original-path>.xmp`, after the original;
  original, sidecar and Live Photo companion movement is not one atomic transaction.
  Non-`EXDEV` rename failures leave history for a later attempt. Failure deleting
  a copied source can leave an untracked old copy. A successful job status alone
  does not prove every file moved: move errors can be logged/returned without
  propagation through the migration handler.
- Recovery checks recorded old/new locations and attempts to finish an incomplete
  move. **Source caveat:** `verifyNewPathContentsMatchesExpected` unconditionally
  stats the old path even when recovery found only the new path. That branch can
  throw if the old path is absent; D0 does not claim interruption recovery is
  universally successful. D1 must exercise this case with real synthetic files,
  alongside collisions, timestamps, bytes/hash and separate sidecar moves.
- When move history remains and both recorded paths exist, recovery prefers
  the old path and skips new-path verification before retrying rename/copy.
  A crash after copying can reach this branch; D1 must test different bytes at
  both paths and prevent silent destination overwrite. The logged unlink-failure
  path above normally clears history, so it is a separate untracked-copy case.

### Reuse and D1 extension points

Reuse asset/album IDs and membership APIs, permission checks, existing SQL
[schema/migration workflow][migrations], storage-template jobs/lock, collision
selection and StorageCore move history. The likely affected responsibilities are
explicit folder binding/placement policy, association-triggered first placement,
persistent binding state, compatible DTOs/generated SDKs and minimal album UI;
reuse Folder View for location browsing. This is a source-based starting map,
not a chosen D1 design or evidence that unchanged clients are already compatible.

D1 still needs a short implementation plan and synthetic checks for upload then
association, deterministic conflicting membership, distinct sanitized destinations,
repeated processing, rename/delete/unmark behaviour, recovery and ordinary client
compatibility. No folder binding or first-assignment policy exists in this fork yet.

## Planned fork delta

[D1](https://github.com/AV-Lex/liss-immich/issues/2) covers initial physical
placement and subsequent uploads into explicitly bound folder albums,
preserving existing asset/album identities and ordinary client compatibility.

User cross-folder Move, hierarchy, reverse sync and a new mobile build
are deferred. The implementation has not started. When integrated,
replace this planned summary with the actual supported behaviour.

This page describes integrated source, not an installed instance.

[d0]: https://github.com/AV-Lex/liss-immich/issues/1
[readme]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/README.md
[contributing]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/CONTRIBUTING.md
[architecture]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/docs/docs/developer/architecture.mdx
[supervisor]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/main.ts
[compose]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/docker/docker-compose.yml
[web]: https://github.com/immich-app/immich/tree/8303cb117e197c700332b33b61b45314c9cc5bb4/web
[folder-doc]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/docs/docs/features/folder-view.md
[folder-store]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/web/src/lib/stores/folders.svelte.ts
[view-repo]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/repositories/view-repository.ts
[mobile-sync]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/mobile/lib/domain/services/sync_linked_album.service.dart
[cli]: https://github.com/immich-app/immich/tree/8303cb117e197c700332b33b61b45314c9cc5bb4/packages/cli
[asset-table]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/schema/tables/asset.table.ts
[album-table]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/schema/tables/album.table.ts
[album-asset]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/schema/tables/album-asset.table.ts
[asset-file]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/schema/tables/asset-file.table.ts
[storage-core]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/cores/storage.core.ts
[storage-repo]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/repositories/storage.repository.ts
[jobs]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/repositories/job.repository.ts
[openapi]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/open-api/immich-openapi-specs.json
[api-doc]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/docs/docs/api.md
[mise]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/mise.toml
[upload-controller]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/controllers/asset-media.controller.ts
[upload-service]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/services/asset-media.service.ts
[albums]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/services/album.service.ts
[templates]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/services/storage-template.service.ts
[asset-jobs]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/repositories/asset-job.repository.ts
[template-doc]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/docs/docs/partials/_storage-template.md
[album-repo]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/repositories/album.repository.ts
[move-table]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/schema/tables/move.table.ts
[moves]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/server/src/repositories/move.repository.ts
[migrations]: https://github.com/immich-app/immich/blob/8303cb117e197c700332b33b61b45314c9cc5bb4/docs/docs/developer/database-migrations.md
