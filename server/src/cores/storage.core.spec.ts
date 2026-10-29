import { createHash } from 'node:crypto';
import { mkdtemp, readFile, stat, writeFile, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AssetFileType, AssetPathType } from 'src/enum.js';
import { CryptoRepository } from 'src/repositories/crypto.repository.js';
import { StorageRepository } from 'src/repositories/storage.repository.js';
import { MoveRepository } from 'src/repositories/move.repository.js';
import { BaseService } from 'src/services/base.service.js';
import { ServiceMocks, newTestService } from 'test/utils.js';
import { StorageCore } from 'src/cores/storage.core.js';

describe('StorageCore', () => {
  describe('isImmichPath', () => {
    beforeAll(() => {
      StorageCore.setMediaLocation('/photos');
    });

    it('should return true for APP_MEDIA_LOCATION path', () => {
      const immichPath = '/photos';
      expect(StorageCore.isImmichPath(immichPath)).toBe(true);
    });

    it('should return true for paths within the APP_MEDIA_LOCATION', () => {
      const immichPath = '/photos/new/';
      expect(StorageCore.isImmichPath(immichPath)).toBe(true);
    });

    it('should return false for paths outside the APP_MEDIA_LOCATION and same starts', () => {
      const nonImmichPath = '/photos_new';
      expect(StorageCore.isImmichPath(nonImmichPath)).toBe(false);
    });

    it('should return false for paths outside the APP_MEDIA_LOCATION', () => {
      const nonImmichPath = '/some/other/path';
      expect(StorageCore.isImmichPath(nonImmichPath)).toBe(false);
    });
  });
});

// Real filesystem regression coverage: mocked stat() used to hide ENOENT recovery.
describe('StorageCore recoverable files', () => {
  let core: StorageCore;
  let mocks: ServiceMocks;
  let directory: string;
  let oldPath: string;
  let newPath: string;
  let trackedPath: string;
  let history: Awaited<ReturnType<MoveRepository['getByEntity']>>;
  const bytes = Buffer.from('synthetic original bytes');
  const checksum = createHash('sha1').update(bytes).digest();
  const mtime = new Date('2020-06-07T08:09:10.123Z');

  beforeEach(async () => {
    const service = newTestService(BaseService);
    mocks = service.mocks;
    core = service.sut['storageCore'];
    directory = await mkdtemp(join(tmpdir(), 'immich-move-'));
    oldPath = join(directory, 'old.jpg');
    newPath = join(directory, 'folder', 'original.jpg');
    trackedPath = oldPath;
    history = undefined;
    await writeFile(oldPath, bytes);
    await utimes(oldPath, mtime, mtime);
    const storage = new StorageRepository(mocks.logger as never);
    for (const name of ['stat', 'checkFileExists', 'rename', 'copyFile', 'unlink', 'utimes', 'mkdirSync'] as const) {
      mocks.storage[name].mockImplementation(storage[name].bind(storage) as never);
    }
    const crypto = new CryptoRepository();
    mocks.crypto.hashFile.mockImplementation(crypto.hashFile.bind(crypto));
    mocks.systemMetadata.get.mockResolvedValue({ storageTemplate: { hashVerificationEnabled: false } });
    mocks.move.getByEntity.mockImplementation(async () => history);
    mocks.move.create.mockImplementation(
      async (value) =>
        (history = {
          sourceSize: null,
          sourceChecksum: null,
          ...value,
          sourceAtime: value.sourceAtime ? new Date(value.sourceAtime) : null,
          sourceMtime: value.sourceMtime ? new Date(value.sourceMtime) : null,
          id: 'move-id',
        }),
    );
    mocks.move.update.mockImplementation(
      async (_id, value) => (history = { ...history!, ...value } as NonNullable<typeof history>),
    );
    mocks.move.delete.mockImplementation(async () => {
      const result = history!;
      history = undefined;
      return result;
    });
    mocks.asset.update.mockImplementation(async (value) => {
      trackedPath = value.originalPath!;
      return undefined as never;
    });
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const move = () =>
    core.moveFile({
      entityId: 'asset-id',
      pathType: AssetPathType.Original,
      oldPath: trackedPath,
      newPath,
      safe: true,
      assetInfo: { checksum, sizeInBytes: bytes.length },
    });

  async function assertCompleted() {
    expect(await readFile(newPath)).toEqual(bytes);
    expect(
      createHash('sha1')
        .update(await readFile(newPath))
        .digest(),
    ).toEqual(checksum);
    expect((await stat(newPath)).mtime.getTime()).toBe(mtime.getTime());
    expect(trackedPath).toBe(newPath);
    expect(history).toBeUndefined();
    await expect(stat(oldPath)).rejects.toMatchObject({ code: 'ENOENT' });
  }

  it.each(['rename', 'EXDEV'])('preserves actual bytes/hash/mtime using %s', async (mode) => {
    if (mode === 'EXDEV') mocks.storage.rename.mockRejectedValueOnce({ code: 'EXDEV' });
    await expect(move()).resolves.toBe(true);
    await assertCompleted();
  });

  it.each(['rename', 'copy', 'unlink', 'savePath', 'historyDelete'])(
    'recovers after interruption at %s',
    async (stage) => {
      if (['copy', 'unlink'].includes(stage)) mocks.storage.rename.mockRejectedValueOnce({ code: 'EXDEV' });
      if (stage === 'rename') mocks.asset.update.mockRejectedValueOnce(new Error('after rename'));
      if (stage === 'copy') mocks.storage.utimes.mockRejectedValueOnce(new Error('after copy, before utimes'));
      if (stage === 'unlink') mocks.storage.unlink.mockRejectedValueOnce(new Error('source unlink failed'));
      if (stage === 'savePath') mocks.asset.update.mockRejectedValueOnce(new Error('DB unavailable'));
      if (stage === 'historyDelete') mocks.move.delete.mockRejectedValueOnce(new Error('after path save'));
      await expect(move()).rejects.toThrow();
      expect(history).toBeDefined();
      // Fresh StorageCore instance models worker restart; only durable history/path survive.
      StorageCore.reset();
      core = StorageCore.create(
        mocks.asset as never,
        mocks.config as never,
        mocks.crypto as never,
        mocks.move as never,
        mocks.person as never,
        mocks.storage as never,
        mocks.systemMetadata as never,
        mocks.logger as never,
      );
      await expect(move()).resolves.toBe(true);
      await assertCompleted();
      await expect(move()).resolves.toBe(true);
    },
  );

  it('retains different same-size files and history when both recorded paths exist', async () => {
    mocks.storage.rename.mockRejectedValueOnce({ code: 'EXDEV' });
    mocks.storage.utimes.mockRejectedValueOnce(new Error('crash after copy'));
    await expect(move()).rejects.toThrow();
    const unrelated = Buffer.alloc(bytes.length, 88);
    await writeFile(newPath, unrelated);
    await expect(move()).rejects.toThrow(/verified/);
    expect(await readFile(oldPath)).toEqual(bytes);
    expect(await readFile(newPath)).toEqual(unrelated);
    expect(trackedPath).toBe(oldPath);
    expect(history?.newPath).toBe(newPath);
  });

  it('rejects a corrupt new-only destination without statting the absent source', async () => {
    mocks.asset.update.mockRejectedValueOnce(new Error('after rename'));
    await expect(move()).rejects.toThrow();
    await writeFile(newPath, Buffer.alloc(bytes.length, 88));
    mocks.storage.stat.mockClear();
    await expect(move()).rejects.toThrow(/verified/);
    expect(mocks.storage.stat).not.toHaveBeenCalledWith(oldPath);
    expect(history).toBeDefined();
    expect(trackedPath).toBe(oldPath);
  });

  it('recovers a new-only sidecar from persisted proof and fails legacy insufficient proof safely', async () => {
    mocks.asset.upsertFile.mockRejectedValueOnce(new Error('after sidecar rename'));
    const sidecarMove = () =>
      core.moveFile({ entityId: 'asset-id', pathType: AssetFileType.Sidecar, oldPath, newPath, safe: true });
    await expect(sidecarMove()).rejects.toThrow();
    expect(history?.sourceChecksum).toEqual(checksum);
    const proof = history!.sourceChecksum;
    history!.sourceChecksum = null;
    await expect(sidecarMove()).rejects.toThrow(/verified/);
    expect(await readFile(newPath)).toEqual(bytes);
    history!.sourceChecksum = proof;
    await expect(sidecarMove()).resolves.toBe(true);
    expect(history).toBeUndefined();
    expect((await stat(newPath)).mtime.getTime()).toBe(mtime.getTime());
    expect(mocks.asset.upsertFile).toHaveBeenLastCalledWith({
      assetId: 'asset-id',
      type: AssetFileType.Sidecar,
      path: newPath,
    });
  });
});
