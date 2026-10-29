import { Kysely, sql } from 'kysely';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, stat, utimes, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageCore } from 'src/cores/storage.core.js';
import { defaults } from 'src/dtos/config.dto.js';
import { AssetPathType, JobStatus } from 'src/enum.js';
import { AccessRepository } from 'src/repositories/access.repository.js';
import { AlbumRepository } from 'src/repositories/album.repository.js';
import { AssetRepository } from 'src/repositories/asset.repository.js';
import { AssetJobRepository } from 'src/repositories/asset-job.repository.js';
import { CryptoRepository } from 'src/repositories/crypto.repository.js';
import { DatabaseRepository } from 'src/repositories/database.repository.js';
import { MoveRepository } from 'src/repositories/move.repository.js';
import { StorageRepository } from 'src/repositories/storage.repository.js';
import { UserRepository } from 'src/repositories/user.repository.js';
import { ConfigRepository } from 'src/repositories/config.repository.js';
import { EventRepository } from 'src/repositories/event.repository.js';
import { JobRepository } from 'src/repositories/job.repository.js';
import { LoggingRepository } from 'src/repositories/logging.repository.js';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository.js';
import { DB } from 'src/schema/index.js';
import { up, down } from 'src/schema/migrations/1793289600000-FolderAlbums.js';
import { AlbumService } from 'src/services/album.service.js';
import { StorageTemplateService } from 'src/services/storage-template.service.js';
import { newMediumService } from 'test/medium.factory.js';
import { mockEnvData } from 'test/repositories/config.repository.mock.js';
import { clearConfigCache } from 'src/utils/config.js';
import { factory } from 'test/small.factory.js';
import { getKyselyDB } from 'test/utils.js';

let database: Kysely<DB>;
let directory: string;
const bytes = Buffer.from('synthetic medium original');
const checksum = createHash('sha1').update(bytes).digest();
const mtime = new Date('2020-06-07T08:09:10.123Z');

const setup = <T extends typeof AlbumService | typeof StorageTemplateService>(Service: T) => {
  clearConfigCache();
  StorageCore.reset();
  StorageCore.setMediaLocation(directory);
  const result = newMediumService(Service, {
    database,
    real: [
      AccessRepository,
      AlbumRepository,
      AssetRepository,
      AssetJobRepository,
      CryptoRepository,
      DatabaseRepository,
      MoveRepository,
      StorageRepository,
      UserRepository,
    ],
    mock: [ConfigRepository, EventRepository, JobRepository, LoggingRepository, SystemMetadataRepository],
  });
  result.ctx.getMock(ConfigRepository).getEnv.mockReturnValue(mockEnvData({}));
  result.ctx.getMock(EventRepository).emit.mockResolvedValue(undefined);
  result.ctx.getMock(SystemMetadataRepository).get.mockResolvedValue({ storageTemplate: { enabled: false } } as never);
  return result;
};

beforeAll(async () => {
  database = await getKyselyDB();
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'immich-folder-medium-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
afterAll(async () => {
  await database.destroy();
});

describe('folder album DB/jobs and real files', () => {
  it('lays out an existing asset, accepts late association, keeps first binding across album edits and worker restart', async () => {
    const { sut: albums, ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const auth = factory.auth({ user });
    const oldPath = join(directory, 'uploaded.jpg');
    await writeFile(oldPath, bytes);
    await utimes(oldPath, mtime, mtime);
    const { asset } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: oldPath,
      originalFileName: 'photo.jpg',
      checksum,
    });
    await ctx
      .get(AssetRepository)
      .upsertExif({ lockedPropertiesBehavior: 'override', exif: { assetId: asset.id, fileSizeInByte: bytes.length } });
    const { album } = await ctx.newAlbum({ ownerId: user.id, albumName: 'Trip/One' }, [asset.id]);
    const enabled = await albums.update(auth, album.id, { isFolderAlbum: true });
    expect(enabled.id).toBe(album.id);
    const destination = join(enabled.folderAlbum!.path, 'photo.jpg');
    const first = setup(StorageTemplateService);
    first.sut.onConfigInit({ newConfig: defaults });
    await expect(first.sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Success);
    expect(await readFile(destination)).toEqual(bytes);
    expect((await stat(destination)).mtime.getTime()).toBe(mtime.getTime());
    expect((await ctx.get(AssetRepository).getById(asset.id))?.originalPath).toBe(destination);
    expect((await ctx.get(AlbumRepository).getAssetFolder(asset.id, user.id)).binding?.id).toBe(album.id);
    await albums.update(auth, album.id, { albumName: 'Renamed', isFolderAlbum: false });
    await albums.removeAssets(auth, album.id, { ids: [asset.id] });
    const { album: other } = await ctx.newAlbum({ ownerId: user.id, albumName: 'Trip:One' });
    await albums.update(auth, other.id, { isFolderAlbum: true });
    await albums.addAssets(auth, other.id, { ids: [asset.id] });
    await albums.delete(auth, album.id);
    const restarted = setup(StorageTemplateService);
    restarted.sut.onConfigInit({ newConfig: defaults });
    await expect(restarted.sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Success);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.originalPath).toBe(destination);
    expect(await readFile(destination)).toEqual(bytes);
    expect((await stat(destination)).mtime.getTime()).toBe(mtime.getTime());
    expect((await ctx.get(AlbumRepository).getAssetFolder(asset.id, user.id)).binding?.id).toBe(album.id);
    expect(await ctx.get(MoveRepository).getByEntity(asset.id, AssetPathType.Original)).toBeUndefined();
    // A later upload, before its ordinary Add, has no folder placement.
    const secondPath = join(directory, 'later.jpg');
    await writeFile(secondPath, 'later upload');
    const secondChecksum = createHash('sha1').update('later upload').digest();
    const { asset: second } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: secondPath,
      originalFileName: 'later.jpg',
      checksum: secondChecksum,
    });
    await ctx
      .get(AssetRepository)
      .upsertExif({ lockedPropertiesBehavior: 'override', exif: { assetId: second.id, fileSizeInByte: 12 } });
    await expect(restarted.sut.handleMigrationSingle({ id: second.id })).resolves.toBe(JobStatus.Skipped);
    await albums.addAssets(auth, other.id, { ids: [second.id] });
    await expect(restarted.sut.handleMigrationSingle({ id: second.id })).resolves.toBe(JobStatus.Success);
    expect((await ctx.get(AssetRepository).getById(second.id))?.originalPath).toBe(
      join((await ctx.get(AlbumRepository).getFolderAlbum(other.id))!.path, 'later.jpg'),
    );
  });

  it('refuses ambiguous membership in either order and atomically keeps one first binding on concurrent jobs', async () => {
    const { sut: albums, ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const auth = factory.auth({ user });
    const oldPath = join(directory, 'conflict.jpg');
    await writeFile(oldPath, bytes);
    const { asset } = await ctx.newAsset({ ownerId: user.id, originalPath: oldPath, checksum });
    await ctx
      .get(AssetRepository)
      .upsertExif({ lockedPropertiesBehavior: 'override', exif: { assetId: asset.id, fileSizeInByte: bytes.length } });
    const { album: a } = await ctx.newAlbum({ ownerId: user.id, albumName: 'Trip/One' }, [asset.id]);
    const { album: b } = await ctx.newAlbum({ ownerId: user.id, albumName: 'Trip:One' }, [asset.id]);
    const aa = await albums.update(auth, a.id, { isFolderAlbum: true });
    const bb = await albums.update(auth, b.id, { isFolderAlbum: true });
    expect(aa.folderAlbum!.path).not.toBe(bb.folderAlbum!.path);
    const { sut } = setup(StorageTemplateService);
    sut.onConfigInit({ newConfig: defaults });
    await expect(sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Failed);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.folderAlbumId).toBeNull();
    expect(await readFile(oldPath)).toEqual(bytes);
    await albums.removeAssets(auth, b.id, { ids: [asset.id] });
    await expect(
      Promise.all([sut.handleMigrationSingle({ id: asset.id }), sut.handleMigrationSingle({ id: asset.id })]),
    ).resolves.toEqual([JobStatus.Success, JobStatus.Success]);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.folderAlbumId).toBe(a.id);
  });

  it('native down refuses pending recovery; completed schema down/up retains readable paths and original bytes', async () => {
    const { ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const path = join(directory, 'readable-album-photo.jpg');
    await writeFile(path, bytes);
    await utimes(path, mtime, mtime);
    const { asset } = await ctx.newAsset({ ownerId: user.id, originalPath: path, checksum });
    const moves = ctx.get(MoveRepository);
    const pending = await moves.create({
      entityId: asset.id,
      pathType: AssetPathType.Original,
      oldPath: 'old',
      newPath: 'new',
    });
    await expect(down(database)).rejects.toThrow(/outstanding file moves/);
    await moves.delete(pending.id);
    // Same guard/body used by native sql-tools migrations revert; it does not touch originals.
    await down(database);
    expect(
      (await sql<{ originalPath: string }>`SELECT "originalPath" FROM asset WHERE id = ${asset.id}`.execute(database))
        .rows[0].originalPath,
    ).toBe(path);
    expect(await readFile(path)).toEqual(bytes);
    expect((await stat(path)).mtime.getTime()).toBe(mtime.getTime());
    await up(database);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.originalPath).toBe(path);
  });
});
