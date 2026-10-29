import { createPostgres } from '@immich/sql-tools';
import { Kysely, sql } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import { randomUUID } from 'node:crypto';
import { DatabaseLock } from 'src/enum.js';
import { ConfigRepository } from 'src/repositories/config.repository.js';
import { DatabaseRepository } from 'src/repositories/database.repository.js';
import { LoggingRepository } from 'src/repositories/logging.repository.js';
import { DB } from 'src/schema/index.js';
import { mockEnvData } from 'test/repositories/config.repository.mock.js';
import { getKyselyDB } from 'test/utils.js';

it('dedicated storage locks leave a one-connection query pool usable and nested extraction cannot starve behind queued readers', async () => {
  const initial = await getKyselyDB();
  const result = await sql<{ name: string }>`SELECT current_database() AS name`.execute(initial);
  const url = new URL(process.env.IMMICH_TEST_POSTGRES_URL!);
  url.pathname = result.rows[0].name;
  await initial.destroy();
  const connection = { connectionType: 'url' as const, url: url.href };
  const database = new Kysely<DB>({
    dialect: new PostgresJSDialect({ postgres: createPostgres({ connection, maxConnections: 1 }) }),
  });
  const config = new ConfigRepository();
  vi.spyOn(config, 'getEnv').mockReturnValue(mockEnvData({ database: { config: connection, skipMigrations: false } }));
  const repository = new DatabaseRepository(database, LoggingRepository.create(), config);
  const parentId = randomUUID();
  const childId = randomUUID();
  const { promise: entered, resolve: enter } = Promise.withResolvers<void>();
  const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
  const query = () => sql`SELECT 1`.execute(database);
  const parent = repository.withAssetLock(parentId, async () => {
    enter();
    await blocked;
    // Android motion extraction: same asset reentry, then a different child.
    await repository.withAssetLock(parentId, () => repository.withAssetLock(childId, query));
  });
  try {
    await entered;
    const readers = Array.from({ length: 3 }, () => repository.withAssetLock(parentId, query));
    await expect
      .poll(
        async () => {
          const sessions = await sql<{
            count: string;
          }>`SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname = current_database()`.execute(database);
          return Number(sessions.rows[0].count);
        },
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(5);
    // Four reserved lock sessions must not consume the main pool's only slot.
    await query();
    release();
    await Promise.all([parent, ...readers]);
    await repository.withLock(DatabaseLock.StorageTemplateMigration, () => repository.withAssetLock(parentId, query));
    await expect(repository.withAssetLock(parentId, () => Promise.reject(new Error('reader failed')))).rejects.toThrow(
      'reader failed',
    );
    await repository.withAssetLock(parentId, query);
  } finally {
    release();
    await parent;
    await repository.onModuleDestroy();
    await database.destroy();
  }
}, 20_000);
