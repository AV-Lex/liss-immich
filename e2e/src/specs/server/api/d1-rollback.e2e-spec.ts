import { getConfig, getQueuesLegacy, updateConfig } from '@immich/sdk';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { app, asBearerAuth, utils } from 'src/utils.js';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const baselineSource = '8303cb117e197c700332b33b61b45314c9cc5bb4';
const baselineImage = process.env.IMMICH_D1_BASELINE_IMAGE;
const evidence = resolve('d1-rollback-evidence');
const execute = promisify(execFile);
const docker = async (...args: string[]) => {
  const result = await execute('docker', args, { maxBuffer: 64 * 1024 * 1024 });
  return result.stdout.trim();
};
const snapshotReceipt = async (filename: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(resolve(evidence, filename))) {
    hash.update(chunk);
  }
  const info = await stat(resolve(evidence, filename));
  return { filename, size: info.size, sha256: hash.digest('hex') };
};
const fileReceipt = async (container: string, path: string) =>
  JSON.parse(
    await docker(
      'exec',
      container,
      'node',
      '-e',
      `const fs=require('node:fs');const p=process.argv[1];const s=fs.statSync(p);
   console.log(JSON.stringify({path:p,size:s.size,mtimeMs:s.mtimeMs,
   sha1:require('node:crypto').createHash('sha1').update(fs.readFileSync(p)).digest('base64')}));`,
      path,
    ),
  ) as { path: string; size: number; mtimeMs: number; sha1: string };

// Destructive only to the existing disposable E2E environment. Run last, explicitly,
// with a source-built baseline image; ordinary API/CLI runs leave this skipped.
describe.skipIf(!baselineImage)('D1 native baseline rollback with readable media retained', () => {
  it(
    'reverts the schema using the current image, starts the exact baseline, and downloads the same original',
    {
      timeout: 300_000,
      retry: 0,
    },
    async () => {
      await mkdir(evidence, { recursive: true });
      await utils.resetDatabase();
      // resetDatabase removes bootstrap metadata while the worker keeps its
      // in-memory media root. Restore native bootstrap state before any upload.
      await docker('restart', 'immich-e2e-server');
      await expect
        .poll(
          async () => {
            try {
              const response = await request(app).get('/server/ping').timeout(2000);
              return response.status;
            } catch {
              return 0;
            }
          },
          { timeout: 60_000, interval: 1000 },
        )
        .toBe(200);
      const database = await utils.connectDatabase();
      await expect
        .poll(
          async () => {
            const result = await database.query<{ value: { location: string } }>(
              'SELECT value FROM system_metadata WHERE key = $1',
              ['MediaLocation'],
            );
            return result.rows[0]?.value;
          },
          { timeout: 30_000 },
        )
        .toEqual({ location: '/data' });
      await writeFile(
        resolve(evidence, 'current-bootstrap.json'),
        JSON.stringify({ mediaLocation: '/data', nativeRestart: true }),
      );
      const admin = await utils.adminSetup();
      const headers = asBearerAuth(admin.accessToken);
      const config = await getConfig({ headers });
      await updateConfig(
        {
          adminConfigDto: {
            ...config,
            storageTemplate: { ...config.storageTemplate, enabled: false },
          },
        },
        { headers },
      );
      const asset = await utils.createAsset(admin.accessToken);
      await utils.waitForQueueFinish(admin.accessToken, 'metadataExtraction');
      const uploaded = await database.query<{ originalPath: string }>(
        'SELECT "originalPath" FROM asset WHERE id = $1',
        [asset.id],
      );
      const oldPath = uploaded.rows[0].originalPath;
      await docker(
        'exec',
        'immich-e2e-server',
        'node',
        '-e',
        `require('node:fs').utimesSync(process.argv[1],new Date('2020-06-07T08:09:10.123Z'),new Date('2020-06-07T08:09:10.123Z'))`,
        oldPath,
      );
      const original = await fileReceipt('immich-e2e-server', oldPath);
      const album = await utils.createAlbum(admin.accessToken, {
        albumName: 'Readable rollback album',
        assetIds: [asset.id],
      });
      const enabled = await request(app)
        .patch(`/albums/${album.id}`)
        .set(headers)
        .send({ isFolderAlbum: true })
        .expect(200);
      const readablePath = `${enabled.body.folderAlbum.path}/example.png`;
      await expect
        .poll(
          async () => {
            const result = await database.query<{ originalPath: string }>(
              'SELECT "originalPath" FROM asset WHERE id = $1',
              [asset.id],
            );
            return result.rows[0].originalPath;
          },
          { timeout: 30_000 },
        )
        .toBe(readablePath);
      await expect
        .poll(
          async () => {
            const queues = await getQueuesLegacy({ headers });
            return Object.values(queues).reduce(
              (total, queue) => total + queue.jobCounts.active + queue.jobCounts.waiting,
              0,
            );
          },
          { timeout: 60_000 },
        )
        .toBe(0);
      const placed = await fileReceipt('immich-e2e-server', readablePath);
      expect(placed).toEqual({ ...original, path: readablePath });
      const beforeDownload = await request(app).get(`/assets/${asset.id}/original`).set(headers).expect(200);
      expect(utils.sha1(beforeDownload.body)).toBe(placed.sha1);
      const currentImage = await docker('inspect', '--format', '{{.Image}}', 'immich-e2e-server');
      const networks = JSON.parse(
        await docker('inspect', '--format', '{{json .NetworkSettings.Networks}}', 'immich-e2e-server'),
      );
      const network = Object.keys(networks)[0];
      const baseline = JSON.parse(await docker('image', 'inspect', baselineImage!));
      expect(baseline[0].Config.Labels['org.opencontainers.image.revision']).toBe(baselineSource);
      expect(baseline[0].Config.Env).toContain(`IMMICH_SOURCE_COMMIT=${baselineSource}`);
      const mounts = JSON.parse(await docker('inspect', '--format', '{{json .Mounts}}', 'immich-e2e-server'));
      expect(mounts).toContainEqual(expect.objectContaining({ Destination: '/data', Type: 'volume' }));
      let baselineStarted = false;
      try {
        // All processes stop before the matching DB/media snapshot and native revert.
        await docker('stop', 'immich-e2e-server');
        const pending = await database.query('SELECT count(*)::int AS count FROM move_history');
        expect(pending.rows[0].count).toBe(0);
        const last = await database.query('SELECT name FROM kysely_migrations ORDER BY timestamp DESC LIMIT 1');
        expect(last.rows[0].name).toBe('1793289600000-FolderAlbums');
        await docker(
          'exec',
          'immich-e2e-postgres',
          'pg_dump',
          '-U',
          'postgres',
          '-d',
          'immich',
          '-Fc',
          '-f',
          '/tmp/d1-post-placement.dump',
        );
        await docker('cp', 'immich-e2e-postgres:/tmp/d1-post-placement.dump', resolve(evidence, 'post-placement.dump'));
        const dumpInventory = await docker(
          'exec',
          'immich-e2e-postgres',
          'pg_restore',
          '--list',
          '/tmp/d1-post-placement.dump',
        );
        expect(dumpInventory).toContain('folder_album');
        await writeFile(resolve(evidence, 'database-inventory.txt'), dumpInventory);
        await docker(
          'run',
          '--name',
          'immich-e2e-d1-snapshot',
          '--volumes-from',
          'immich-e2e-server',
          '--entrypoint',
          'tar',
          currentImage,
          '-czf',
          '/tmp/d1-media.tar.gz',
          '-C',
          '/data',
          '.',
        );
        await docker(
          'cp',
          'immich-e2e-d1-snapshot:/tmp/d1-media.tar.gz',
          resolve(evidence, 'post-placement-media.tar.gz'),
        );
        const archive = await execute('tar', ['-tzf', resolve(evidence, 'post-placement-media.tar.gz')], {
          maxBuffer: 64 * 1024 * 1024,
        });
        expect(archive.stdout).toContain(readablePath.replace(/^\/data\//, './'));
        await writeFile(resolve(evidence, 'media-inventory.txt'), archive.stdout);
        const snapshots = await Promise.all(
          ['post-placement.dump', 'post-placement-media.tar.gz'].map((filename) => snapshotReceipt(filename)),
        );
        await writeFile(
          resolve(evidence, 'post-placement-receipt.json'),
          JSON.stringify(
            {
              baselineSource,
              baselineImageId: baseline[0].Id,
              currentImage,
              mounts,
              snapshots,
              assetId: asset.id,
              albumId: album.id,
              original,
              placed,
            },
            null,
            2,
          ),
        );
        const revert = await docker(
          'run',
          '--rm',
          '--network',
          network,
          '--workdir',
          '/usr/src/app/server',
          '--entrypoint',
          'node',
          currentImage,
          'node_modules/@immich/sql-tools/sql-tools.mjs',
          '-u',
          'postgres://postgres:postgres@database:5432/immich',
          'migrations',
          'revert',
        );
        await writeFile(resolve(evidence, 'native-revert.txt'), revert);
        expect(revert).toContain('Reverted migration "1793289600000-FolderAlbums"');
        const ledger = await database.query('SELECT name FROM kysely_migrations WHERE name = $1', [
          '1793289600000-FolderAlbums',
        ]);
        expect(ledger.rows).toEqual([]);
        const removed = await database.query("SELECT to_regclass('public.folder_album') AS binding");
        expect(removed.rows[0].binding).toBeNull();
        await docker(
          'run',
          '-d',
          '--name',
          'immich-e2e-baseline',
          '--network',
          network,
          '--volumes-from',
          'immich-e2e-server',
          '-p',
          '2285:2285',
          '-e',
          'DB_HOSTNAME=database',
          '-e',
          'DB_USERNAME=postgres',
          '-e',
          'DB_PASSWORD=postgres',
          '-e',
          'DB_DATABASE_NAME=immich',
          '-e',
          'IMMICH_MACHINE_LEARNING_ENABLED=false',
          '-e',
          'IMMICH_ENV=testing',
          '-e',
          'IMMICH_PORT=2285',
          '-e',
          'IMMICH_IGNORE_MOUNT_CHECK_ERRORS=true',
          baselineImage!,
        );
        baselineStarted = true;
        await expect
          .poll(
            async () => {
              try {
                const response = await request(app).get('/server/ping').timeout(2000);
                return response.status;
              } catch {
                return 0;
              }
            },
            { timeout: 120_000, interval: 1000 },
          )
          .toBe(200);
        const version = await request(app).get('/server/about').set(headers).expect(200);
        expect(version.body.sourceCommit).toBe(baselineSource);
        const retained = await database.query('SELECT id, "originalPath" FROM asset WHERE id = $1', [asset.id]);
        expect(retained.rows).toEqual([{ id: asset.id, originalPath: readablePath }]);
        const response = await request(app).get(`/assets/${asset.id}/original`).set(headers).expect(200);
        expect(utils.sha1(response.body)).toBe(original.sha1);
        const after = await fileReceipt('immich-e2e-baseline', readablePath);
        expect(after).toEqual(placed);
        const baselineConfig = await getConfig({ headers });
        expect(baselineConfig.storageTemplate.enabled).toBe(false);
        const albumResponse = await request(app).get(`/albums/${album.id}`).set(headers).expect(200);
        expect(albumResponse.body.id).toBe(album.id);
        await writeFile(
          resolve(evidence, 'baseline-download-receipt.json'),
          JSON.stringify(
            {
              sourceCommit: version.body.sourceCommit,
              assetId: asset.id,
              albumId: album.id,
              after,
              downloadSha1: utils.sha1(response.body),
              storageTemplatesEnabled: baselineConfig.storageTemplate.enabled,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        await writeFile(
          resolve(evidence, 'failure.txt'),
          error instanceof Error ? (error.stack ?? error.message) : String(error),
        );
        throw error;
      } finally {
        if (baselineStarted) {
          const logs = await execute('docker', ['logs', 'immich-e2e-baseline'], { maxBuffer: 64 * 1024 * 1024 });
          await writeFile(resolve(evidence, 'baseline-server.log'), `${logs.stdout}\n${logs.stderr}`);
          await docker('stop', 'immich-e2e-baseline');
        }
      }
    },
  );
});
