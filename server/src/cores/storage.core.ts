import { dirname, join, resolve } from 'node:path';
import type { VideoInterfaces } from 'src/types.js';
import { StorageAsset } from 'src/database.js';
import {
  AssetFileType,
  AssetPathType,
  ImageFormat,
  PathType,
  PersonPathType,
  RawExtractedFormat,
  StorageFolder,
  UserPathType,
} from 'src/enum.js';
import { AssetRepository } from 'src/repositories/asset.repository.js';
import { ConfigRepository } from 'src/repositories/config.repository.js';
import { CryptoRepository } from 'src/repositories/crypto.repository.js';
import { LoggingRepository } from 'src/repositories/logging.repository.js';
import { MoveRepository } from 'src/repositories/move.repository.js';
import { PersonRepository } from 'src/repositories/person.repository.js';
import { StorageRepository } from 'src/repositories/storage.repository.js';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository.js';
import { getAssetFile } from 'src/utils/asset.util.js';
import { getConfig } from 'src/utils/config.js';

export interface MoveRequest {
  entityId: string;
  /** a person is owned, so the owner is needed to save the new path */
  ownerId?: string;
  pathType: PathType;
  oldPath: string | null;
  newPath: string;
  safe?: boolean;
  assetInfo?: {
    sizeInBytes: number;
    checksum: Buffer;
  };
}

export type ThumbnailPathEntity = { id: string; ownerId: string };

export type PersonThumbnailPathEntity = { personGroupId: string; ownerId: string };

export type HlsSessionFolder = { ownerId: string; sessionId: string };

export type HlsVariantFolder = { ownerId: string; sessionId: string; variantIndex: number };

export type ImagePathOptions = { fileType: AssetFileType; format: ImageFormat | RawExtractedFormat; isEdited: boolean };

let instance: StorageCore | null;

let mediaLocation: string | undefined;

export class StorageCore {
  private constructor(
    private assetRepository: AssetRepository,
    private configRepository: ConfigRepository,
    private cryptoRepository: CryptoRepository,
    private moveRepository: MoveRepository,
    private personRepository: PersonRepository,
    private storageRepository: StorageRepository,
    private systemMetadataRepository: SystemMetadataRepository,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(StorageCore.name);
  }

  static create(
    assetRepository: AssetRepository,
    configRepository: ConfigRepository,
    cryptoRepository: CryptoRepository,
    moveRepository: MoveRepository,
    personRepository: PersonRepository,
    storageRepository: StorageRepository,
    systemMetadataRepository: SystemMetadataRepository,
    logger: LoggingRepository,
  ) {
    if (!instance) {
      instance = new StorageCore(
        assetRepository,
        configRepository,
        cryptoRepository,
        moveRepository,
        personRepository,
        storageRepository,
        systemMetadataRepository,
        logger,
      );
    }

    return instance;
  }

  static reset() {
    instance = null;
  }

  static getMediaLocation(): string {
    if (mediaLocation === undefined) {
      throw new Error('Media location is not set.');
    }

    return mediaLocation;
  }

  static setMediaLocation(location: string) {
    mediaLocation = location;
  }

  static getFolderLocation(folder: StorageFolder, userId: string) {
    return join(StorageCore.getBaseFolder(folder), userId);
  }

  static getLibraryFolder(user: { storageLabel: string | null; id: string }) {
    return join(StorageCore.getBaseFolder(StorageFolder.Library), user.storageLabel || user.id);
  }

  static getBaseFolder(folder: StorageFolder) {
    return join(StorageCore.getMediaLocation(), folder);
  }

  static getPersonThumbnailPath(person: PersonThumbnailPathEntity) {
    return StorageCore.getNestedPath(StorageFolder.Thumbnails, person.ownerId, `${person.personGroupId}.jpeg`);
  }

  static getImagePath(asset: ThumbnailPathEntity, { fileType, format, isEdited }: ImagePathOptions) {
    return StorageCore.getNestedPath(
      StorageFolder.Thumbnails,
      asset.ownerId,
      `${asset.id}_${fileType}${isEdited ? '_edited' : ''}.${format}`,
    );
  }

  static getEncodedVideoPath(asset: ThumbnailPathEntity) {
    return StorageCore.getNestedPath(StorageFolder.EncodedVideo, asset.ownerId, `${asset.id}.mp4`);
  }

  static getHlsSessionFolder({ ownerId, sessionId }: HlsSessionFolder) {
    return StorageCore.getNestedPath(StorageFolder.EncodedVideo, ownerId, sessionId);
  }

  static getHlsVariantFolder({ ownerId, sessionId, variantIndex }: HlsVariantFolder) {
    return join(StorageCore.getHlsSessionFolder({ ownerId, sessionId }), variantIndex.toString());
  }

  static getAndroidMotionPath(asset: ThumbnailPathEntity, uuid: string) {
    return StorageCore.getNestedPath(StorageFolder.EncodedVideo, asset.ownerId, `${uuid}-MP.mp4`);
  }

  static isAndroidMotionPath(originalPath: string) {
    return originalPath.startsWith(StorageCore.getBaseFolder(StorageFolder.EncodedVideo));
  }

  static isImmichPath(path: string) {
    const resolvedPath = resolve(path);
    const resolvedAppMediaLocation = StorageCore.getMediaLocation();
    const normalizedPath = resolvedPath.endsWith('/') ? resolvedPath : resolvedPath + '/';
    const normalizedAppMediaLocation = resolvedAppMediaLocation.endsWith('/')
      ? resolvedAppMediaLocation
      : resolvedAppMediaLocation + '/';
    return normalizedPath.startsWith(normalizedAppMediaLocation);
  }

  async moveAssetImage(asset: StorageAsset, fileType: AssetFileType, format: ImageFormat) {
    const { id: entityId, files } = asset;
    const oldFile = getAssetFile(files, fileType, { isEdited: false });
    return this.moveFile({
      entityId,
      pathType: fileType,
      oldPath: oldFile?.path || null,
      newPath: StorageCore.getImagePath(asset, { fileType, format, isEdited: false }),
    });
  }

  async moveAssetVideo(asset: StorageAsset) {
    const encodedVideoFile = getAssetFile(asset.files, AssetFileType.EncodedVideo, { isEdited: false });
    return this.moveFile({
      entityId: asset.id,
      pathType: AssetPathType.EncodedVideo,
      oldPath: encodedVideoFile?.path || null,
      newPath: StorageCore.getEncodedVideoPath(asset),
    });
  }

  async movePersonFile(person: PersonThumbnailPathEntity & { thumbnailPath: string }, pathType: PersonPathType) {
    const { ownerId, personGroupId, thumbnailPath } = person;
    switch (pathType) {
      case PersonPathType.Face: {
        await this.moveFile({
          entityId: personGroupId,
          ownerId,
          pathType,
          oldPath: thumbnailPath,
          newPath: StorageCore.getPersonThumbnailPath(person),
        });
      }
    }
  }

  async moveFile(request: MoveRequest) {
    const { entityId, ownerId, pathType, oldPath, newPath, assetInfo, safe } = request;
    if (!oldPath) {
      return;
    }

    this.ensureFolders(newPath);

    let move = await this.moveRepository.getByEntity(entityId, pathType);
    if (!move && oldPath === newPath) {
      return true;
    }
    const incomplete = (message: string): false => {
      this.logger.warn(message);
      if (safe) {
        throw new Error(message);
      }
      return false;
    };
    if (move) {
      this.logger.log(`Attempting to finish incomplete move: ${move.oldPath} => ${move.newPath}`);
      const isOldPathExists = await this.storageRepository.checkFileExists(move.oldPath);
      const isNewPathExists = await this.storageRepository.checkFileExists(move.newPath);
      const newPathCheck = isNewPathExists ? move.newPath : null;
      let actualPath = isOldPathExists ? move.oldPath : newPathCheck;
      if (!actualPath) {
        return incomplete('Unable to complete move. File does not exist at either location.');
      }

      const proof =
        move.sourceChecksum && move.sourceSize !== null && move.sourceSize !== undefined
          ? { checksum: move.sourceChecksum, sizeInBytes: Number(move.sourceSize) }
          : assetInfo;
      if (safe && isNewPathExists && (!move.sourceMtime || !move.sourceAtime)) {
        return incomplete('Incomplete move is missing source timestamp proof; retaining files and history');
      }
      if (isNewPathExists) {
        // A retry may find both paths after copy. Never rename over unverified bytes.
        if (!proof || !(await this.verifyNewPathContentsMatchesExpected(move.oldPath, move.newPath, proof, true))) {
          return incomplete('Incomplete move destination could not be verified; retaining files and history');
        }
        if (isOldPathExists && move.oldPath !== move.newPath) {
          const oldChecksum = await this.cryptoRepository.hashFile(move.oldPath);
          if (!oldChecksum.equals(proof.checksum)) {
            return incomplete('Incomplete move source differs from expected contents; retaining both files');
          }
        }
        // Validate both paths before changing either timestamps or contents.
        if (move.sourceMtime && move.sourceAtime) {
          await this.storageRepository.utimes(move.newPath, new Date(move.sourceAtime), new Date(move.sourceMtime));
        }
        if (isOldPathExists && move.oldPath !== move.newPath) {
          await this.storageRepository.unlink(move.oldPath);
        }
        actualPath = move.newPath;
      }

      move = await this.moveRepository.update(move.id, { id: move.id, oldPath: actualPath, newPath });
    } else {
      const proof = safe ? await this.storageRepository.stat(oldPath) : undefined;
      const sourceChecksum = safe
        ? (assetInfo?.checksum ?? (await this.cryptoRepository.hashFile(oldPath)))
        : undefined;
      move = await this.moveRepository.create({
        entityId,
        pathType,
        oldPath,
        newPath,
        ...(proof && { sourceSize: proof.size, sourceChecksum, sourceAtime: proof.atime, sourceMtime: proof.mtime }),
      });
    }

    if (pathType === AssetPathType.Original && !assetInfo) {
      return incomplete(`Unable to complete move. Missing asset info for ${entityId}`);
    }

    if (move.oldPath !== newPath) {
      if (safe && (await this.storageRepository.checkFileExists(newPath))) {
        return incomplete('Folder move destination already exists; retaining source, destination and history');
      }
      try {
        this.logger.debug(`Attempting to rename file: ${move.oldPath} => ${newPath}`);
        await this.storageRepository.rename(move.oldPath, newPath);
      } catch (error: any) {
        if (error.code !== 'EXDEV') {
          return incomplete(`Unable to complete move. Error renaming file: ${error.message}`);
        }
        this.logger.debug(`Unable to rename file. Falling back to copy, verify and delete`);
        await this.storageRepository.copyFile(move.oldPath, newPath);

        if (
          !(await this.verifyNewPathContentsMatchesExpected(
            move.oldPath,
            newPath,
            assetInfo ??
              (move.sourceChecksum && move.sourceSize !== null && move.sourceSize !== undefined
                ? { checksum: move.sourceChecksum, sizeInBytes: Number(move.sourceSize) }
                : undefined),
            !!safe,
          ))
        ) {
          this.logger.warn(`Skipping move due to file size mismatch`);
          await this.storageRepository.unlink(newPath);
          return incomplete('Copied file verification failed; retaining move history');
        }

        const { atime, mtime } = await this.storageRepository.stat(move.oldPath);
        await this.storageRepository.utimes(newPath, atime, mtime);

        try {
          await this.storageRepository.unlink(move.oldPath);
        } catch (error: any) {
          return incomplete(`Unable to delete old file; retaining move history: ${error.message}`);
        }
      }
    }

    await this.savePath(pathType, entityId, newPath, ownerId);
    await this.moveRepository.delete(move.id);
    return true;
  }

  private async verifyNewPathContentsMatchesExpected(
    oldPath: string,
    newPath: string,
    assetInfo?: { sizeInBytes: number; checksum: Buffer },
    forceHash = false,
  ) {
    const oldStat = !assetInfo || !forceHash ? await this.storageRepository.stat(oldPath) : undefined;
    const newStat = await this.storageRepository.stat(newPath);
    const oldPathSize = assetInfo ? assetInfo.sizeInBytes : oldStat!.size;
    const newPathSize = newStat.size;
    this.logger.debug(`File size check: ${newPathSize} === ${oldPathSize}`);
    if (newPathSize !== oldPathSize) {
      this.logger.warn(`Unable to complete move. File size mismatch: ${newPathSize} !== ${oldPathSize}`);
      return false;
    }
    const repos = {
      configRepo: this.configRepository,
      metadataRepo: this.systemMetadataRepository,
      logger: this.logger,
    };
    const config = await getConfig(repos, { withCache: true });
    if (assetInfo && (forceHash || config.storageTemplate.hashVerificationEnabled)) {
      const { checksum } = assetInfo;
      const newChecksum = await this.cryptoRepository.hashFile(newPath);
      if (!newChecksum.equals(checksum)) {
        this.logger.warn(
          `Unable to complete move. File checksum mismatch: ${newChecksum.toString('base64')} !== ${checksum.toString(
            'base64',
          )}`,
        );
        return false;
      }
      this.logger.debug(`File checksum check: ${newChecksum.toString('base64')} === ${checksum.toString('base64')}`);
    }
    return true;
  }

  ensureFolders(input: string) {
    this.storageRepository.mkdirSync(dirname(input));
  }

  removeEmptyDirs(folder: StorageFolder) {
    return this.storageRepository.removeEmptyDirs(StorageCore.getBaseFolder(folder));
  }

  async getVideoInterfaces(): Promise<VideoInterfaces> {
    const [dri, mali] = await Promise.all([this.getDevices(), this.hasMaliOpenCL()]);
    return { dri, mali };
  }

  private savePath(pathType: PathType, id: string, newPath: string, ownerId?: string) {
    switch (pathType) {
      case AssetPathType.Original: {
        return this.assetRepository.update({ id, originalPath: newPath });
      }

      case AssetFileType.FullSize:
      case AssetFileType.EncodedVideo:
      case AssetFileType.Thumbnail:
      case AssetFileType.Preview:
      case AssetFileType.Sidecar:
      case AssetPathType.EncodedVideo: {
        return this.assetRepository.upsertFile({ assetId: id, type: pathType as AssetFileType, path: newPath });
      }

      case PersonPathType.Face: {
        if (!ownerId) {
          this.logger.warn('Unable to save person path without an owner');
          return;
        }

        return this.personRepository.update({ ownerId, personGroupId: id, thumbnailPath: newPath });
      }

      case UserPathType.Profile: {
        this.logger.warn('Unexpected path type:', pathType);
        return;
      }
    }
  }

  static getNestedFolder(folder: StorageFolder, ownerId: string, filename: string): string {
    return join(StorageCore.getFolderLocation(folder, ownerId), filename.slice(0, 2), filename.slice(2, 4));
  }

  static getNestedPath(folder: StorageFolder, ownerId: string, filename: string): string {
    return join(StorageCore.getNestedFolder(folder, ownerId, filename), filename);
  }

  private async getDevices() {
    try {
      return await this.storageRepository.readdir('/dev/dri');
    } catch {
      this.logger.debug('No devices found in /dev/dri.');
      return [];
    }
  }

  private async hasMaliOpenCL() {
    try {
      const [maliIcdStat, maliDeviceStat] = await Promise.all([
        this.storageRepository.stat('/etc/OpenCL/vendors/mali.icd'),
        this.storageRepository.stat('/dev/mali0'),
      ]);
      return maliIcdStat.isFile() && maliDeviceStat.isCharacterDevice();
    } catch {
      this.logger.debug('OpenCL not available for transcoding, so RKMPP acceleration will use CPU tonemapping');
      return false;
    }
  }
}
