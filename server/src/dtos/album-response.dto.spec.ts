import { mapAlbum } from 'src/dtos/album.dto.js';
import { StorageCore } from 'src/cores/storage.core.js';
import { AlbumFactory } from 'test/factories/album.factory.js';
import { getForAlbum } from 'test/mappers.js';

describe('mapAlbum', () => {
  it('should set start and end dates', () => {
    const startDate = new Date('2023-02-22T05:06:29.716Z');
    const endDate = new Date('2025-01-01T01:02:03.456Z');
    const album = AlbumFactory.from()
      .asset({ localDateTime: endDate }, (builder) => builder.exif())
      .asset({ localDateTime: startDate }, (builder) => builder.exif())
      .build();
    const dto = mapAlbum(getForAlbum(album));
    expect(dto.startDate).toEqual(startDate.toISOString());
    expect(dto.endDate).toEqual(endDate.toISOString());
  });

  it('should not set start and end dates for empty assets', () => {
    const dto = mapAlbum(getForAlbum(AlbumFactory.create()));
    expect(dto.startDate).toBeUndefined();
    expect(dto.endDate).toBeUndefined();
  });

  it.each([null, 'custom-owner-label'])(
    'maps the actual bound folder relative to its owner root (%s)',
    (storageLabel) => {
      StorageCore.setMediaLocation('/synthetic');
      const album = getForAlbum(AlbumFactory.create());
      const ownerId = 'owner';
      const path = `/synthetic/library/${storageLabel || ownerId}/folder-albums/Trip (2)`;
      const dto = mapAlbum({ ...album, folderAlbum: { enabled: false, ownerId, storageLabel, path } });
      expect(dto.folderAlbum).toEqual({ enabled: false, path, relativePath: 'folder-albums/Trip (2)' });
    },
  );

  it('never represents an outside-root binding as a home-relative path', () => {
    StorageCore.setMediaLocation('/synthetic');
    const album = getForAlbum(AlbumFactory.create());
    const dto = mapAlbum({ ...album, folderAlbum: { enabled: true, ownerId: 'owner', path: '/other-root/Trip' } });
    expect(dto.folderAlbum).toEqual({ enabled: true, path: '/other-root/Trip' });
  });
});
