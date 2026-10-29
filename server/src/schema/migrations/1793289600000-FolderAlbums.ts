import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "asset" ADD "folderAlbumId" uuid;`.execute(db);
  await sql`CREATE INDEX "asset_folderAlbumId_idx" ON "asset" ("folderAlbumId");`.execute(db);
  await sql`CREATE TABLE "folder_album" (
  "id" uuid NOT NULL,
  "ownerId" uuid NOT NULL,
  "path" character varying NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  CONSTRAINT "folder_album_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "folder_album_path_uq" UNIQUE ("path"),
  CONSTRAINT "folder_album_pkey" PRIMARY KEY ("id")
);`.execute(db);
  await sql`ALTER TABLE "asset" ADD CONSTRAINT "asset_folderAlbumId_fkey" FOREIGN KEY ("folderAlbumId") REFERENCES "folder_album" ("id") ON UPDATE CASCADE ON DELETE SET NULL;`.execute(db);
  await sql`ALTER TABLE "move_history" ADD "sourceSize" bigint;`.execute(db);
  await sql`ALTER TABLE "move_history" ADD "sourceChecksum" bytea;`.execute(db);
  await sql`ALTER TABLE "move_history" ADD "sourceMtime" timestamp with time zone;`.execute(db);
  await sql`ALTER TABLE "move_history" ADD "sourceAtime" timestamp with time zone;`.execute(db);
  await sql`CREATE INDEX "folder_album_ownerId_idx" ON "folder_album" ("ownerId");`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert schema only after the operator has stopped writes/moves and captured
  // matching DB+files recovery material. Never discard unresolved recovery proof.
  const pending = await sql<{ count: string }>`SELECT count(*)::text AS count FROM "move_history"`.execute(db);
  if (Number(pending.rows[0].count) !== 0) {
    throw new Error('Finish outstanding file moves before reverting folder albums; preserve a matching DB/files snapshot');
  }
  await sql`ALTER TABLE "asset" DROP CONSTRAINT "asset_folderAlbumId_fkey";`.execute(db);
  await sql`DROP INDEX "asset_folderAlbumId_idx";`.execute(db);
  await sql`ALTER TABLE "asset" DROP COLUMN "folderAlbumId";`.execute(db);
  await sql`ALTER TABLE "move_history" DROP COLUMN "sourceSize";`.execute(db);
  await sql`ALTER TABLE "move_history" DROP COLUMN "sourceChecksum";`.execute(db);
  await sql`ALTER TABLE "move_history" DROP COLUMN "sourceMtime";`.execute(db);
  await sql`ALTER TABLE "move_history" DROP COLUMN "sourceAtime";`.execute(db);
  await sql`DROP TABLE "folder_album";`.execute(db);
}
