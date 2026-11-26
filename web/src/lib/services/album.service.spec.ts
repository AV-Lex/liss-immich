import { AlbumUserRole } from '@immich/sdk';
import { modalManager } from '@immich/ui';
import { init, register, waitLocale, t } from 'svelte-i18n';
import { get } from 'svelte/store';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { eventManager } from '$lib/managers/event-manager.svelte';
import { getAlbumActions, handleToggleFolderAlbum } from '$lib/services/album.service';
import { handleError } from '$lib/utils/handle-error';
import { albumFactory } from '@test-data/factories/album-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';

vi.mock('$lib/utils/handle-error', () => ({ handleError: vi.fn() }));

describe('folder placement action', () => {
  const owner = userAdminFactory.build();
  const folder = { enabled: true, path: '/library/owner/folder-albums/Camera' };
  const buildAlbum = (enabled?: boolean) =>
    albumFactory.build({
      albumUsers: [{ user: owner, role: AlbumUserRole.Owner }],
      folderAlbum: enabled === undefined ? undefined : { ...folder, enabled },
    });

  beforeAll(async () => {
    register('en-US', () => import('$i18n/en.json'));
    await init({ fallbackLocale: 'en-US', initialLocale: 'en-US' });
    await waitLocale('en-US');
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    authManager.setUser(owner);
  });

  it.each([true, false, undefined])('confirms and emits the actual returned state from enabled=%s', async (enabled) => {
    const album = buildAlbum(enabled);
    // Use the returned value, even if it differs from the requested state.
    const response = { ...album, folderAlbum: { ...folder, enabled: !!enabled } };
    const dialog = vi.spyOn(modalManager, 'show').mockResolvedValue(true as never);
    const emit = vi.spyOn(eventManager, 'emit');
    sdkMock.updateAlbumInfo.mockResolvedValue(response);

    await handleToggleFolderAlbum(album);

    expect(dialog).toHaveBeenCalledWith(expect.anything(), { enabled: !enabled });
    expect(sdkMock.updateAlbumInfo).toHaveBeenCalledWith({ id: album.id, updateAlbumDto: { isFolderAlbum: !enabled } });
    expect(emit).toHaveBeenCalledWith('AlbumUpdate', response);
    expect(album.folderAlbum?.enabled).toBe(enabled);
  });

  it.each([true, false])('cancelling enabled=%s does not call the API or emit an update', async (enabled) => {
    vi.spyOn(modalManager, 'show').mockResolvedValue(false as never);
    const emit = vi.spyOn(eventManager, 'emit');
    await handleToggleFolderAlbum(buildAlbum(enabled));
    expect(sdkMock.updateAlbumInfo).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('reports failure without emitting a successful update or changing the album', async () => {
    const album = buildAlbum(true);
    vi.spyOn(modalManager, 'show').mockResolvedValue(true as never);
    const emit = vi.spyOn(eventManager, 'emit');
    const error = new Error('network unavailable');
    sdkMock.updateAlbumInfo.mockRejectedValue(error);
    await handleToggleFolderAlbum(album);
    expect(handleError).toHaveBeenCalledWith(error, get(t)('errors.unable_to_update_album_info'));
    expect(emit).not.toHaveBeenCalled();
    expect(album.folderAlbum?.enabled).toBe(true);
  });

  it('hides the action from a non-owner and refuses a direct call', async () => {
    const album = buildAlbum(true);
    authManager.setUser(userAdminFactory.build());
    expect(getAlbumActions(get(t), album).Folder.$if?.()).toBe(false);
    const dialog = vi.spyOn(modalManager, 'show');
    await handleToggleFolderAlbum(album);
    expect(dialog).not.toHaveBeenCalled();
    expect(sdkMock.updateAlbumInfo).not.toHaveBeenCalled();
  });

  it('changes the menu action after the returned enabled → retained → enabled states', () => {
    expect(getAlbumActions(get(t), buildAlbum(true)).Folder.title).toBe('Disable folder placement');
    expect(getAlbumActions(get(t), buildAlbum(false)).Folder.title).toBe('Enable folder placement');
    expect(getAlbumActions(get(t), buildAlbum(true)).Folder.title).toBe('Disable folder placement');
    expect(getAlbumActions(get(t), buildAlbum()).Folder.$if?.()).toBe(true);
  });
});
