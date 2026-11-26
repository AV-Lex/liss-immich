import { AlbumUserRole } from '@immich/sdk';
import { modalManager, menuManager } from '@immich/ui';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import { get } from 'svelte/store';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import TestWrapper from '$lib/components/TestWrapper.svelte';
import AlbumsList from '$lib/components/album-page/AlbumsList.svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { Route } from '$lib/route';
import { albumViewSettings, AlbumViewMode } from '$lib/stores/preferences.store';
import { albumFactory } from '@test-data/factories/album-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import AlbumCardGroup from '../AlbumCardGroup.svelte';

describe('AlbumCardGroup navigation', () => {
  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  it('keeps album, folder and context menu controls independent', async () => {
    const user = userAdminFactory.build();
    authManager.setUser(user);
    const album = albumFactory.build({
      albumName: 'Camera',
      albumUsers: [{ user, role: AlbumUserRole.Owner }],
      folderAlbum: { enabled: true, path: '/library/owner/folder-albums/Camera', relativePath: 'folder-albums/Camera' },
    });
    const showMenu = vi.spyOn(menuManager, 'show').mockResolvedValue();
    const sut = render(TestWrapper, { component: AlbumCardGroup, componentProps: { albums: [album] } });

    expect(sut.getByRole('link', { name: 'Camera' })).toHaveAttribute('href', Route.viewAlbum(album));
    expect(sut.getByRole('link', { name: 'Open folder: ~/folder-albums/Camera' })).toHaveAttribute(
      'href',
      Route.folders({ path: album.folderAlbum!.path }),
    );
    expect(sut.getByRole('button', { name: 'Show album options' })).toBeInTheDocument();
    expect(sut.container.querySelector(':scope a button')).not.toBeInTheDocument();
    expect(sut.container.querySelector(':scope a a')).not.toBeInTheDocument();

    await fireEvent.contextMenu(sut.getByTestId('album-image'));
    expect(showMenu).toHaveBeenCalledOnce();
    showMenu.mockRestore();
  });

  it('refreshes the card menu and markers after enabled → retained → enabled', async () => {
    const user = userAdminFactory.build();
    authManager.setUser(user);
    const album = albumFactory.build({
      albumName: 'Camera',
      albumUsers: [{ user, role: AlbumUserRole.Owner }],
      folderAlbum: { enabled: true, path: '/library/owner/folder-albums/Camera' },
    });
    const settings = { ...get(albumViewSettings), view: AlbumViewMode.Cover };
    const sut = render(TestWrapper, {
      component: AlbumsList,
      componentProps: { ownedAlbums: [album], userSettings: settings },
    });
    const menu = vi.spyOn(menuManager, 'show').mockResolvedValue();
    const dialog = vi.spyOn(modalManager, 'show').mockResolvedValue(true as never);
    for (const enabled of [false, true]) {
      await fireEvent.contextMenu(sut.getByTestId('album-image'));
      const items = menu.mock.lastCall![0].items;
      const action = items.find(
        (item) =>
          typeof item === 'object' &&
          'title' in item &&
          item.title === (enabled ? 'Enable folder placement' : 'Disable folder placement'),
      );
      expect(action).toBeDefined();
      if (typeof action !== 'object' || !('onAction' in action)) {
        throw new Error('Missing folder action');
      }
      const response = { ...album, folderAlbum: { ...album.folderAlbum!, enabled } };
      sdkMock.updateAlbumInfo.mockResolvedValueOnce(response);
      await action.onAction({ action, event: new MouseEvent('click') });
      await waitFor(() =>
        expect(
          sut.getByRole('img', {
            name: enabled
              ? 'Folder album (placement enabled)'
              : 'Folder album (placement paused; existing files stay in their folder)',
          }),
        ).toBeInTheDocument(),
      );
    }
    dialog.mockRestore();
    menu.mockRestore();
  });
});
