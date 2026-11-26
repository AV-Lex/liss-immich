import { mdiFolderOutline, mdiFolderOffOutline } from '@mdi/js';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import RecentAlbums from '$lib/components/shared-components/side-bar/RecentAlbums.svelte';
import { eventManager } from '$lib/managers/event-manager.svelte';
import { userInteraction } from '$lib/stores/user.svelte';
import { albumFactory } from '@test-data/factories/album-factory';

describe('RecentAlbums component', () => {
  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    userInteraction.recentAlbums = undefined;
  });

  it('sorts albums by most recently updated', async () => {
    const albums = [
      albumFactory.build({ updatedAt: '2024-01-01T00:00:00Z' }),
      albumFactory.build({ updatedAt: '2024-01-09T00:00:01Z' }),
      albumFactory.build({ updatedAt: '2024-01-10T00:00:00Z' }),
      albumFactory.build({ updatedAt: '2024-01-09T00:00:00Z' }),
    ];

    sdkMock.getAllAlbums.mockResolvedValueOnce([...albums]);
    render(RecentAlbums);

    expect(sdkMock.getAllAlbums).toHaveBeenCalledOnce();

    // wtf
    await tick();
    await tick();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', `/albums/${albums[2].id}`);
    expect(links[1]).toHaveAttribute('href', `/albums/${albums[1].id}`);
    expect(links[2]).toHaveAttribute('href', `/albums/${albums[3].id}`);
  });

  it.each([
    [true, 'Folder album (placement enabled)'],
    [false, 'Folder album (placement paused; existing files stay in their folder)'],
  ])('marks folder bindings with enabled=%s without changing navigation', (enabled, label) => {
    const album = albumFactory.build({ folderAlbum: { enabled, path: '/library/owner/folder-albums/Camera' } });
    userInteraction.recentAlbums = [album];
    render(RecentAlbums);

    const marker = screen.getByRole('img', { name: label });
    expect(marker.querySelector('path')).toHaveAttribute('d', enabled ? mdiFolderOutline : mdiFolderOffOutline);
    expect(marker.closest('a')).toHaveAttribute('href', `/albums/${album.id}`);
    expect(marker.closest('a')).toHaveTextContent(album.albumName);
  });

  it('updates cached markers from actual album responses without another fetch', async () => {
    const album = albumFactory.build({ folderAlbum: { enabled: true, path: '/library/owner/folder-albums/Camera' } });
    userInteraction.recentAlbums = [album];
    render(RecentAlbums);
    for (const enabled of [false, true]) {
      const response = { ...album, folderAlbum: { ...album.folderAlbum!, enabled } };
      eventManager.emit('AlbumUpdate', response);
      await tick();
      const label = enabled
        ? 'Folder album (placement enabled)'
        : 'Folder album (placement paused; existing files stay in their folder)';
      expect(screen.getByRole('img', { name: label }).querySelector('path')).toHaveAttribute(
        'd',
        enabled ? mdiFolderOutline : mdiFolderOffOutline,
      );
      expect(userInteraction.recentAlbums?.[0]).toEqual(response);
    }
    expect(sdkMock.getAllAlbums).not.toHaveBeenCalled();
  });

  it('does not mark ordinary albums', () => {
    userInteraction.recentAlbums = [albumFactory.build()];
    render(RecentAlbums);

    expect(screen.queryByRole('img', { name: /Folder album/ })).not.toBeInTheDocument();
  });
});
