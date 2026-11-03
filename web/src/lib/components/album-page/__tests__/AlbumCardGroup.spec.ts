import { AlbumUserRole } from '@immich/sdk';
import { menuManager } from '@immich/ui';
import { fireEvent, render } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import TestWrapper from '$lib/components/TestWrapper.svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { Route } from '$lib/route';
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
    expect(sut.container.querySelector('a button')).not.toBeInTheDocument();
    expect(sut.container.querySelector('a a')).not.toBeInTheDocument();

    await fireEvent.contextMenu(sut.getByTestId('album-image'));
    expect(showMenu).toHaveBeenCalledOnce();
    showMenu.mockRestore();
  });
});
