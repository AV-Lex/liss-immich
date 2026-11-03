import '@testing-library/jest-dom';
import { render, waitFor, type RenderResult } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import { Route } from '$lib/route';
import { albumFactory } from '@test-data/factories/album-factory';
import AlbumCard from '../AlbumCard.svelte';

describe('AlbumCard component', () => {
  let sut: RenderResult<typeof AlbumCard>;

  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  it.each([
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: false, assetCount: 0 }),
      count: 0,
      shared: false,
    },
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: true, assetCount: 0 }),
      count: 0,
      shared: true,
    },
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: false, assetCount: 5 }),
      count: 5,
      shared: false,
    },
    {
      album: albumFactory.build({ albumThumbnailAssetId: null, shared: true, assetCount: 2 }),
      count: 2,
      shared: true,
    },
  ])('shows album data without thumbnail with count $count - shared: $shared', async ({ album, count, shared }) => {
    sut = render(AlbumCard, { album, showItemCount: true });

    const albumImgElement = sut.getByTestId('album-image');
    const albumNameElement = sut.getByTestId('album-name');
    const albumDetailsElement = sut.getByTestId('album-details');
    const detailsText = `${count} items` + (shared ? ' . Shared' : '');

    expect(albumImgElement).toHaveAttribute('src');
    expect(albumImgElement).toHaveAttribute('alt', album.albumName);

    await waitFor(() => expect(albumImgElement).toHaveAttribute('src'));

    expect(albumImgElement).toHaveAttribute('alt', album.albumName);
    expect(sdkMock.viewAsset).not.toHaveBeenCalled();

    expect(albumNameElement).toHaveTextContent(album.albumName);
    expect(albumDetailsElement).toHaveTextContent(new RegExp(detailsText));
  });

  it('shows album data', () => {
    const album = albumFactory.build({
      shared: false,
      albumName: 'some album name',
    });
    sut = render(AlbumCard, { album, showItemCount: true });

    const albumImgElement = sut.getByTestId('album-image');
    const albumNameElement = sut.getByTestId('album-name');
    const albumDetailsElement = sut.getByTestId('album-details');

    expect(albumImgElement).toHaveAttribute('alt', album.albumName);
    expect(albumImgElement).toHaveAttribute('src');

    expect(albumNameElement).toHaveTextContent('some album name');
    expect(albumDetailsElement).toHaveTextContent(`${album.assetCount} item`);
  });

  it('hides context menu when "contextMenuItems" is undefined', () => {
    const album = Object.freeze(albumFactory.build({ albumThumbnailAssetId: null }));
    sut = render(AlbumCard, { album });

    const contextButtonParent = sut.queryByTestId('context-button-parent');
    expect(contextButtonParent).not.toBeInTheDocument();
  });

  it.each([
    [true, 'Folder album (new assignments enabled)'],
    [false, 'Folder album (new assignments disabled; existing folder retained)'],
  ])('marks folder bindings with enabled=%s and links to the actual folder', (enabled, label) => {
    const album = albumFactory.build({
      albumName: 'Camera',
      folderAlbum: { enabled, path: '/library/owner/folder-albums/Camera', relativePath: 'folder-albums/Camera' },
    });
    sut = render(AlbumCard, { album });

    expect(sut.getByRole('img', { name: label })).toBeInTheDocument();
    expect(sut.getByRole('link', { name: 'Camera' })).toHaveAttribute('href', Route.viewAlbum(album));
    const folderLink = sut.getByRole('link', { name: 'Open folder: ~/folder-albums/Camera' });
    expect(folderLink).toHaveTextContent('~/folder-albums/Camera');
    expect(folderLink).toHaveAttribute('href', Route.folders({ path: album.folderAlbum!.path }));
    expect(sut.container.querySelector('a a')).not.toBeInTheDocument();
  });

  it('keeps ordinary albums free of folder markers and links', () => {
    sut = render(AlbumCard, { album: albumFactory.build() });

    expect(sut.queryByRole('img', { name: /Folder album/ })).not.toBeInTheDocument();
    expect(sut.queryByRole('link', { name: /Open folder/ })).not.toBeInTheDocument();
  });

  it('does not guess a display root when the relative path is unavailable', () => {
    const album = albumFactory.build({ folderAlbum: { enabled: true, path: '/outside/Camera' } });
    sut = render(AlbumCard, { album });

    expect(sut.getByRole('img', { name: 'Folder album (new assignments enabled)' })).toBeInTheDocument();
    expect(sut.queryByRole('link', { name: /Open folder/ })).not.toBeInTheDocument();
  });
});
