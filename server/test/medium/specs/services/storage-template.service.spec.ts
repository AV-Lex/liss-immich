/* eslint-disable unicorn/no-await-expression-member -- Keep DB/disk invariant assertions beside their awaited reads. */
import { Kysely, sql } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageCore } from 'src/cores/storage.core.js';
import { defaults } from 'src/dtos/config.dto.js';
import { AssetFileType, AssetPathType, AssetType, AssetVisibility, JobStatus } from 'src/enum.js';
import { AccessRepository } from 'src/repositories/access.repository.js';
import { AlbumRepository } from 'src/repositories/album.repository.js';
import { AssetJobRepository } from 'src/repositories/asset-job.repository.js';
import { AssetRepository } from 'src/repositories/asset.repository.js';
import { ConfigRepository } from 'src/repositories/config.repository.js';
import { CryptoRepository } from 'src/repositories/crypto.repository.js';
import { DatabaseRepository } from 'src/repositories/database.repository.js';
import { EventRepository } from 'src/repositories/event.repository.js';
import { JobRepository } from 'src/repositories/job.repository.js';
import { LoggingRepository } from 'src/repositories/logging.repository.js';
import { MetadataRepository } from 'src/repositories/metadata.repository.js';
import { MoveRepository } from 'src/repositories/move.repository.js';
import { StorageRepository } from 'src/repositories/storage.repository.js';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository.js';
import { UserRepository } from 'src/repositories/user.repository.js';
import { DB } from 'src/schema/index.js';
import { AlbumService } from 'src/services/album.service.js';
import { MediaService } from 'src/services/media.service.js';
import { MetadataService } from 'src/services/metadata.service.js';
import { StorageTemplateService } from 'src/services/storage-template.service.js';
import { clearConfigCache } from 'src/utils/config.js';
import { newMediumService } from 'test/medium.factory.js';
import { mockEnvData } from 'test/repositories/config.repository.mock.js';
import { factory } from 'test/small.factory.js';
import { getKyselyDB } from 'test/utils.js';

let database: Kysely<DB>;
let directory: string;
let lockDatabaseUrl: string;
const lockRepositories = new Set<DatabaseRepository>();
const bytes = Buffer.from('synthetic medium original');
const checksum = createHash('sha1').update(bytes).digest();
const mtime = new Date('2020-06-07T08:09:10.123Z');

const setup = <
  T extends typeof AlbumService | typeof StorageTemplateService | typeof MetadataService | typeof MediaService,
>(
  Service: T,
) => {
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
    mock: [
      ConfigRepository,
      EventRepository,
      JobRepository,
      LoggingRepository,
      MetadataRepository,
      SystemMetadataRepository,
    ],
  });
  const repository = result.ctx.get(DatabaseRepository);
  lockRepositories.add(repository);
  vi.spyOn(repository['configRepository'], 'getEnv').mockReturnValue(
    mockEnvData({
      database: { config: { connectionType: 'url', url: lockDatabaseUrl }, skipMigrations: false },
    }),
  );
  result.ctx.getMock(ConfigRepository).getEnv.mockReturnValue(mockEnvData({}));
  result.ctx.getMock(EventRepository).emit.mockResolvedValue(undefined);
  result.ctx.getMock(JobRepository).queue.mockResolvedValue(undefined);
  result.ctx.getMock(SystemMetadataRepository).get.mockResolvedValue({ storageTemplate: { enabled: false } } as never);
  return result;
};

beforeAll(async () => {
  database = await getKyselyDB();
  const result = await sql<{ name: string }>`SELECT current_database() AS name`.execute(database);
  const connection = new URL(process.env.IMMICH_TEST_POSTGRES_URL!);
  connection.pathname = result.rows[0].name;
  lockDatabaseUrl = connection.href;
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'immich-folder-medium-'));
});
afterEach(async () => {
  for (const repository of lockRepositories) {
    await repository.onModuleDestroy();
  }
  lockRepositories.clear();
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
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: asset.id, metadataExtractedAt: new Date() });
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
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: second.id, metadataExtractedAt: new Date() });
    await albums.addAssets(auth, other.id, { ids: [second.id] });
    await expect(restarted.sut.handleMigrationSingle({ id: second.id })).resolves.toBe(JobStatus.Success);
    expect((await ctx.get(AssetRepository).getById(second.id))?.originalPath).toBe(
      join((await ctx.get(AlbumRepository).getFolderAlbum(other.id))!.path, 'later.jpg'),
    );
  });

  it('waits for completed metadata rather than the upload EXIF size row', async () => {
    const { sut: albums, ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const path = join(directory, 'not-extracted.jpg');
    await writeFile(path, bytes);
    const { asset } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: path,
      originalFileName: 'photo.jpg',
      checksum,
    });
    await ctx
      .get(AssetRepository)
      .upsertExif({ lockedPropertiesBehavior: 'override', exif: { assetId: asset.id, fileSizeInByte: bytes.length } });
    const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);
    const enabled = await albums.update(factory.auth({ user }), album.id, { isFolderAlbum: true });
    const placement = setup(StorageTemplateService);
    placement.sut.onConfigInit({ newConfig: defaults });
    await expect(placement.sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Skipped);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.folderAlbumId).toBeNull();
    expect(await readFile(path)).toEqual(bytes);
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: asset.id, metadataExtractedAt: new Date() });
    await placement.sut.onAssetMetadataExtracted({ assetId: asset.id, userId: user.id, source: 'upload' });
    await expect(placement.sut.handleMigrationSingle({ id: asset.id, source: 'upload' })).resolves.toBe(
      JobStatus.Success,
    );
    expect(await readFile(join(enabled.folderAlbum!.path, 'photo.jpg'))).toEqual(bytes);
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
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: asset.id, metadataExtractedAt: new Date() });
    const { album: a } = await ctx.newAlbum({ ownerId: user.id, albumName: 'Trip/One' }, [asset.id]);
    const { album: b } = await ctx.newAlbum({ ownerId: user.id, albumName: 'Trip:One' }, [asset.id]);
    const aa = await albums.update(auth, a.id, { isFolderAlbum: true });
    const bb = await albums.update(auth, b.id, { isFolderAlbum: true });
    expect(aa.folderAlbum!.path).not.toBe(bb.folderAlbum!.path);
    const { sut } = setup(StorageTemplateService);
    sut.onConfigInit({ newConfig: defaults });
    await expect(sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Skipped);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.folderAlbumId).toBeNull();
    expect(await readFile(oldPath)).toEqual(bytes);
    await albums.removeAssets(auth, b.id, { ids: [asset.id] });
    await expect(
      Promise.all([sut.handleMigrationSingle({ id: asset.id }), sut.handleMigrationSingle({ id: asset.id })]),
    ).resolves.toEqual([JobStatus.Success, JobStatus.Success]);
    expect((await ctx.get(AssetRepository).getById(asset.id))?.folderAlbumId).toBe(a.id);
  });

  it.each([
    { intent: 'legacy-stock' },
    { intent: 'same-folder' },
    { intent: 'legacy-stock', interrupt: AssetPathType.Original },
    { intent: 'legacy-stock', interrupt: AssetFileType.Sidecar },
  ])(
    'finishes $intent history before first layout of still, XMP and motion (interrupt=$interrupt)',
    async ({ intent, interrupt }) => {
      const { sut: albums, ctx } = setup(AlbumService);
      const { user } = await ctx.newUser();
      const oldPath = join(directory, 'legacy-upload.jpg');
      const oldSidecar = `${oldPath}.xmp`;
      const oldMotion = join(directory, 'legacy-motion.mov');
      const sidecarBytes = Buffer.from('<xmp>legacy sidecar</xmp>');
      const motionBytes = Buffer.from('legacy motion');
      for (const [path, data] of [
        [oldPath, bytes],
        [oldSidecar, sidecarBytes],
        [oldMotion, motionBytes],
      ] as const) {
        await writeFile(path, data);
        await utimes(path, mtime, mtime);
      }
      const { asset: motion } = await ctx.newAsset({
        ownerId: user.id,
        originalPath: oldMotion,
        originalFileName: 'motion.mov',
        type: AssetType.Video,
        visibility: AssetVisibility.Hidden,
        checksum: createHash('sha1').update(motionBytes).digest(),
      });
      const { asset } = await ctx.newAsset({
        ownerId: user.id,
        originalPath: oldPath,
        originalFileName: 'photo.jpg',
        checksum,
        livePhotoVideoId: motion.id,
      });
      const assets = ctx.get(AssetRepository);
      for (const [id, size] of [
        [asset.id, bytes.length],
        [motion.id, motionBytes.length],
      ] as const) {
        await assets.upsertExif({ lockedPropertiesBehavior: 'override', exif: { assetId: id, fileSizeInByte: size } });
        await assets.upsertJobStatus({ assetId: id, metadataExtractedAt: new Date() });
      }
      await assets.upsertFile({ assetId: asset.id, type: AssetFileType.Sidecar, path: oldSidecar });
      const { album } = await ctx.newAlbum({ ownerId: user.id, albumName: 'First layout' }, [asset.id]);
      const enabled = await albums.update(factory.auth({ user }), album.id, { isFolderAlbum: true });
      const folder = enabled.folderAlbum!.path;
      const legacyTarget =
        intent === 'legacy-stock' ? join(directory, 'stock', 'old-intent.jpg') : join(folder, 'photo+2.jpg');
      const finalOriginal = intent === 'legacy-stock' ? join(folder, 'photo.jpg') : legacyTarget;
      const moves = ctx.get(MoveRepository);
      await moves.create({ entityId: asset.id, pathType: AssetPathType.Original, oldPath, newPath: legacyTarget });
      await moves.create({
        entityId: asset.id,
        pathType: AssetFileType.Sidecar,
        oldPath: oldSidecar,
        newPath: `${legacyTarget}.xmp`,
      });
      expect((await assets.getById(asset.id))?.folderAlbumId).toBeNull();
      const placement = setup(StorageTemplateService);
      placement.sut.onConfigInit({ newConfig: defaults });
      const storage = placement.ctx.get(StorageRepository);
      const realRename = storage.rename.bind(storage);
      let interrupted = false;
      const rename = vi.spyOn(storage, 'rename').mockImplementation((oldPath, newPath) => {
        const interruptedTarget = interrupt === AssetPathType.Original ? finalOriginal : `${finalOriginal}.xmp`;
        if (interrupt && !interrupted && newPath === interruptedTarget) {
          interrupted = true;
          throw new Error('synthetic first-folder leg failure after legacy recovery');
        }
        return realRename(oldPath, newPath);
      });
      const result = await placement.sut.handleMigrationSingle({ id: asset.id });
      expect(result).toBe(interrupt ? JobStatus.Failed : JobStatus.Success);
      if (interrupt) {
        const retained = await moves.getByEntity(asset.id, interrupt);
        expect(retained?.newPath).toBe(interrupt === AssetPathType.Original ? finalOriginal : `${finalOriginal}.xmp`);
        expect(retained?.oldPath).toBe(interrupt === AssetPathType.Original ? legacyTarget : `${legacyTarget}.xmp`);
        expect(new Date(retained!.sourceMtime!).getTime()).toBe(mtime.getTime());
        expect(await readFile(retained!.oldPath)).toEqual(interrupt === AssetPathType.Original ? bytes : sidecarBytes);
        const restarted = setup(StorageTemplateService);
        restarted.sut.onConfigInit({ newConfig: defaults });
        await expect(restarted.sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Success);
      }
      const originalMoves = rename.mock.calls.filter(
        ([, target]) => target === legacyTarget || target === finalOriginal,
      );
      expect(originalMoves.map(([, target]) => target)).toEqual(
        intent === 'legacy-stock' ? [legacyTarget, finalOriginal] : [legacyTarget],
      );
      expect((await assets.getById(asset.id))?.originalPath).toBe(finalOriginal);
      expect((await assets.getById(asset.id))?.folderAlbumId).toBe(album.id);
      const current = await ctx.get(AssetJobRepository).getForSidecarCheckJob(asset.id);
      expect(current?.files.find((file) => file.type === AssetFileType.Sidecar)?.path).toBe(`${finalOriginal}.xmp`);
      expect((await assets.getById(motion.id))?.originalPath).toBe(join(folder, 'photo.mov'));
      expect((await assets.getById(motion.id))?.folderAlbumId).toBe(album.id);
      for (const [path, data] of [
        [finalOriginal, bytes],
        [`${finalOriginal}.xmp`, sidecarBytes],
        [join(folder, 'photo.mov'), motionBytes],
      ] as const) {
        const actual = await readFile(path);
        expect(actual).toEqual(data);
        expect(createHash('sha1').update(actual).digest()).toEqual(createHash('sha1').update(data).digest());
        expect((await stat(path)).mtime.getTime()).toBe(mtime.getTime());
      }
      expect(await moves.getByEntity(asset.id, AssetPathType.Original)).toBeUndefined();
      expect(await moves.getByEntity(asset.id, AssetFileType.Sidecar)).toBeUndefined();
      await expect(stat(oldPath)).rejects.toMatchObject({ code: 'ENOENT' });
      if (intent === 'legacy-stock') {
        await expect(stat(legacyTarget)).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(stat(`${legacyTarget}.xmp`)).rejects.toMatchObject({ code: 'ENOENT' });
      }
      const completedRenameCount = rename.mock.calls.length;
      await expect(placement.sut.handleMigrationSingle({ id: asset.id })).resolves.toBe(JobStatus.Success);
      expect(rename).toHaveBeenCalledTimes(completedRenameCount);
    },
  );

  it('recovers partial still/sidecar/motion placement with the same binding and timestamps', async () => {
    const { sut: albums, ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const auth = factory.auth({ user });
    const stillOld = join(directory, 'still.jpg');
    const sidecarOld = join(directory, 'still.xmp');
    const motionOld = join(directory, 'motion.mov');
    const motionBytes = Buffer.from('synthetic motion bytes');
    const sidecarBytes = Buffer.from('<x:xmpmeta>synthetic sidecar</x:xmpmeta>');
    for (const [path, data] of [
      [stillOld, bytes],
      [sidecarOld, sidecarBytes],
      [motionOld, motionBytes],
    ] as const) {
      await writeFile(path, data);
      await utimes(path, mtime, mtime);
    }
    const { asset: motion } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: motionOld,
      originalFileName: 'motion.mov',
      type: AssetType.Video,
      visibility: AssetVisibility.Hidden,
      checksum: createHash('sha1').update(motionBytes).digest(),
    });
    const { asset: still } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: stillOld,
      originalFileName: 'photo.jpg',
      livePhotoVideoId: motion.id,
      checksum,
    });
    const assets = ctx.get(AssetRepository);
    await assets.upsertExif({
      lockedPropertiesBehavior: 'override',
      exif: { assetId: still.id, fileSizeInByte: bytes.length },
    });
    await assets.upsertExif({
      lockedPropertiesBehavior: 'override',
      exif: { assetId: motion.id, fileSizeInByte: motionBytes.length },
    });
    await assets.upsertFile({ assetId: still.id, type: AssetFileType.Sidecar, path: sidecarOld });
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: still.id, metadataExtractedAt: new Date() });
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: motion.id, metadataExtractedAt: new Date() });
    const { album } = await ctx.newAlbum({ ownerId: user.id, albumName: 'LivePhoto' }, [still.id]);
    const enabled = await albums.update(auth, album.id, { isFolderAlbum: true });
    const original = join(enabled.folderAlbum!.path, 'photo.jpg');
    const sidecar = original + '.xmp';
    const companion = join(enabled.folderAlbum!.path, 'photo.mov');
    const first = setup(StorageTemplateService);
    first.sut.onConfigInit({ newConfig: defaults });
    const storage = first.ctx.get(StorageRepository);
    const rename = storage.rename.bind(storage);
    let interrupted = false;
    vi.spyOn(storage, 'rename').mockImplementation((source, destination) => {
      if (source === sidecarOld && !interrupted) {
        interrupted = true;
        return Promise.reject(new Error('synthetic interruption before sidecar rename'));
      }
      return rename(source, destination);
    });
    await expect(first.sut.handleMigrationSingle({ id: still.id })).resolves.toBe(JobStatus.Failed);
    expect((await assets.getById(still.id))?.originalPath).toBe(original);
    expect(await readFile(sidecarOld)).toEqual(sidecarBytes);
    expect(await readFile(motionOld)).toEqual(motionBytes);
    expect(await ctx.get(MoveRepository).getByEntity(still.id, AssetFileType.Sidecar)).toBeDefined();
    const restart = setup(StorageTemplateService);
    restart.sut.onConfigInit({ newConfig: defaults });
    await expect(restart.sut.handleMigrationSingle({ id: still.id })).resolves.toBe(JobStatus.Success);
    for (const [path, data] of [
      [original, bytes],
      [sidecar, sidecarBytes],
      [companion, motionBytes],
    ] as const) {
      expect(await readFile(path)).toEqual(data);
      expect((await stat(path)).mtime.getTime()).toBe(mtime.getTime());
    }
    expect((await assets.getById(motion.id))?.originalPath).toBe(companion);
    expect((await assets.getById(motion.id))?.folderAlbumId).toBe(album.id);
    expect(await ctx.get(MoveRepository).getByEntity(still.id, AssetFileType.Sidecar)).toBeUndefined();
  });

  it.each(
    ['reader-first', 'mover-first'].flatMap((order) => [
      {
        order,
        reader: 'metadata',
        Service: MetadataService,
        method: 'handleMetadataExtraction',
        body: 'extractMetadata',
      },
      {
        order,
        reader: 'thumbnails',
        Service: MediaService,
        method: 'handleGenerateThumbnails',
        body: 'generateThumbnailsForAsset',
      },
      { order, reader: 'video', Service: MediaService, method: 'handleVideoConversion', body: 'convertVideoForAsset' },
      {
        order,
        reader: 'editor',
        Service: MediaService,
        method: 'handleAssetEditThumbnailGeneration',
        body: 'generateEditedThumbnailsForAsset',
      },
    ]),
  )('coordinates $reader and first placement: $order', async ({ order, Service, method, body }) => {
    const { sut: albums, ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const oldPath = join(directory, 'race.jpg');
    await writeFile(oldPath, bytes);
    const { asset } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: oldPath,
      originalFileName: 'race.jpg',
      checksum,
    });
    await ctx.get(AssetRepository).upsertExif({
      lockedPropertiesBehavior: 'override',
      exif: { assetId: asset.id, fileSizeInByte: bytes.length },
    });
    // A previous successful extraction does not make re-extraction safe to race.
    await ctx.get(AssetRepository).upsertJobStatus({ assetId: asset.id, metadataExtractedAt: new Date() });
    const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);
    const enabled = await albums.update(factory.auth({ user }), album.id, { isFolderAlbum: true });
    const newPath = join(enabled.folderAlbum!.path, 'race.jpg');
    const metadata = setup(Service);
    const placement = setup(StorageTemplateService);
    placement.sut.onConfigInit({ newConfig: defaults });
    const { promise: entered, resolve: enter } = Promise.withResolvers<void>();
    const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
    let readerPath: string | undefined;
    const extractor = metadata.sut as unknown as Record<string, (data: unknown) => Promise<unknown>>;
    vi.spyOn(extractor, body).mockImplementation(async () => {
      const current = await metadata.ctx.get(AssetJobRepository).getForMetadataExtraction(asset.id);
      readerPath = current!.originalPath;
      if (order === 'reader-first') {
        enter();
        await blocked;
      }
      expect(await readFile(readerPath)).toEqual(bytes);
    });
    const storage = placement.ctx.get(StorageRepository);
    const rename = storage.rename.bind(storage);
    if (order === 'mover-first') {
      vi.spyOn(storage, 'rename').mockImplementation(async (source, destination) => {
        enter();
        await blocked;
        return rename(source, destination);
      });
    }
    try {
      const first =
        order === 'reader-first'
          ? extractor[method]({ id: asset.id })
          : placement.sut.handleMigrationSingle({ id: asset.id });
      await entered;
      const second =
        order === 'reader-first'
          ? placement.sut.handleMigrationSingle({ id: asset.id })
          : extractor[method]({ id: asset.id });
      // The mover cannot invalidate a reader's captured path while its lock is held.
      expect(await readFile(oldPath)).toEqual(bytes);
      release();
      await Promise.all([first, second]);
      expect(readerPath).toBe(order === 'reader-first' ? oldPath : newPath);
      expect(await readFile(newPath)).toEqual(bytes);
    } finally {
      release();
    }
  });

  it.each(
    ['reader-first', 'mover-first'].flatMap((order) => ['write', 'check'].map((operation) => ({ order, operation }))),
  )('coordinates sidecar $operation with placement: $order', async ({ order, operation }) => {
    const { sut: albums, ctx } = setup(AlbumService);
    const { user } = await ctx.newUser();
    const oldPath = join(directory, 'sidecar-race.jpg');
    const oldSidecar = `${oldPath}.xmp`;
    const sidecarBytes = Buffer.from('<xmp>synthetic rating</xmp>');
    const editedSidecarBytes = Buffer.from('<xmp>edited rating 3</xmp>');
    await writeFile(oldPath, bytes);
    await writeFile(oldSidecar, sidecarBytes);
    const { asset } = await ctx.newAsset({
      ownerId: user.id,
      originalPath: oldPath,
      originalFileName: 'sidecar-race.jpg',
      checksum,
    });
    const assets = ctx.get(AssetRepository);
    await assets.upsertExif({
      lockedPropertiesBehavior: 'override',
      exif: {
        assetId: asset.id,
        fileSizeInByte: bytes.length,
        rating: 3,
        lockedProperties: ['rating'],
      },
    });
    await assets.upsertFile({ assetId: asset.id, type: AssetFileType.Sidecar, path: oldSidecar });
    await assets.upsertJobStatus({ assetId: asset.id, metadataExtractedAt: new Date() });
    const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);
    const enabled = await albums.update(factory.auth({ user }), album.id, { isFolderAlbum: true });
    const newPath = join(enabled.folderAlbum!.path, 'sidecar-race.jpg');
    const newSidecar = `${newPath}.xmp`;
    const metadata = setup(MetadataService);
    const placement = setup(StorageTemplateService);
    placement.sut.onConfigInit({ newConfig: defaults });
    const { promise: entered, resolve: enter } = Promise.withResolvers<void>();
    const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
    let observedSidecar: string | undefined;
    const observe = async (path: string) => {
      observedSidecar = path;
      if (order !== 'reader-first') {
        return;
      }

      enter();
      await blocked;
    };
    metadata.ctx.getMock(MetadataRepository).writeTags.mockImplementation(async (path) => {
      await observe(path);
      await writeFile(path, editedSidecarBytes);
    });
    const storage = metadata.ctx.get(StorageRepository);
    const exists = storage.checkFileExists.bind(storage);
    vi.spyOn(storage, 'checkFileExists').mockImplementation(async (path, mode) => {
      await observe(path);
      return exists(path, mode);
    });
    const moverStorage = placement.ctx.get(StorageRepository);
    const rename = moverStorage.rename.bind(moverStorage);
    if (order === 'mover-first') {
      vi.spyOn(moverStorage, 'rename').mockImplementation(async (source, destination) => {
        enter();
        await blocked;
        return rename(source, destination);
      });
    }
    const sidecarJob = () =>
      operation === 'write'
        ? metadata.sut.handleSidecarWrite({ id: asset.id })
        : metadata.sut.handleSidecarCheck({ id: asset.id });
    try {
      const first = order === 'reader-first' ? sidecarJob() : placement.sut.handleMigrationSingle({ id: asset.id });
      await entered;
      const second = order === 'reader-first' ? placement.sut.handleMigrationSingle({ id: asset.id }) : sidecarJob();
      // The competing connection must wait on the asset advisory lock before reading/moving paths.
      await expect
        .poll(async () => {
          const waiting = await sql<{ count: number }>`SELECT count(*)::int AS count FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event = 'advisory'`.execute(database);
          return waiting.rows[0].count;
        })
        .toBeGreaterThan(0);
      release();
      const results = await Promise.all([first, second]);
      expect(results).toContain(JobStatus.Success);
      expect(observedSidecar).toBe(order === 'reader-first' ? oldSidecar : newSidecar);
      expect(await readFile(newSidecar)).toEqual(operation === 'write' ? editedSidecarBytes : sidecarBytes);
      expect(await readFile(newPath)).toEqual(bytes);
      const saved = await ctx.get(AssetJobRepository).getForSidecarCheckJob(asset.id);
      expect(saved?.originalPath).toBe(newPath);
      expect(saved?.files.find((file) => file.type === AssetFileType.Sidecar)?.path).toBe(newSidecar);
      expect(await ctx.get(AssetJobRepository).getLockedPropertiesForMetadataExtraction(asset.id)).toEqual(
        operation === 'write' ? [] : ['rating'],
      );
      await expect(stat(oldSidecar)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      release();
    }
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
    const native = ctx.get(DatabaseRepository)['createMigrator']();
    const blocked = await native.migrateDown();
    expect(String(blocked.error)).toContain('outstanding file moves');
    expect(await moves.getByEntity(asset.id, AssetPathType.Original)).toBeDefined();
    await moves.delete(pending.id);
    const reverted = await native.migrateDown();
    expect(reverted.error).toBeUndefined();
    expect(
      (await sql<{ originalPath: string }>`SELECT "originalPath" FROM asset WHERE id = ${asset.id}`.execute(database))
        .rows[0].originalPath,
    ).toBe(path);
    expect(await readFile(path)).toEqual(bytes);
    expect((await stat(path)).mtime.getTime()).toBe(mtime.getTime());
    // Model the baseline migration inventory without modifying the ledger: this
    // is the same guard that rejects an old binary while the D1 migration exists.
    const provider = new FileMigrationProvider({
      fs: { readdir },
      path: { join },
      import: (file) => import(file),
      migrationFolder: join(import.meta.dirname, '../../../../src/schema/migrations'),
    });
    const baseline = await provider.getMigrations();
    delete baseline['1793289600000-FolderAlbums'];
    const baselineStartup = new Migrator({
      db: database,
      migrationTableName: 'kysely_migrations',
      migrationLockTableName: 'kysely_migrations_lock',
      provider: { getMigrations: () => Promise.resolve(baseline) },
    });
    expect((await baselineStartup.migrateToLatest()).error).toBeUndefined();
    expect(
      (await database.selectFrom('asset').select('originalPath').where('id', '=', asset.id).executeTakeFirstOrThrow())
        .originalPath,
    ).toBe(path);
    expect((await native.migrateToLatest()).error).toBeUndefined();
    expect((await ctx.get(AssetRepository).getById(asset.id))?.originalPath).toBe(path);
  });
});
