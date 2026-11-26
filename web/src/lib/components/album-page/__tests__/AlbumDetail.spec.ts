import { AlbumUserRole } from '@immich/sdk';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import { invalidate } from '$app/navigation';
import { sdkMock } from '$lib/__mocks__/sdk.mock';
import TestWrapper from '$lib/components/TestWrapper.svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { handleError } from '$lib/utils/handle-error';
import { albumFactory } from '@test-data/factories/album-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import Page from '../../../../routes/(user)/albums/[albumId=id]/[[photos=photos]]/[[assetId=id]]/+page.svelte';

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn(),
  onNavigate: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));
vi.mock('$app/state', () => ({
  navigating: { complete: Promise.resolve() },
  page: { url: new URL('http://localhost/albums/synthetic'), params: {}, route: { id: '/albums' } },
}));
vi.mock('$lib/managers/feature-flags-manager.svelte', () => ({ featureFlagsManager: { value: { map: false } } }));
vi.mock('$lib/actions/scroll-memory', () => ({ scrollMemoryClearer: () => ({ destroy() {} }) }));
vi.mock('$lib/components/timeline/Timeline.svelte', async () => ({
  default: (await import('./AlbumDetailTimelineFixture.svelte')).default,
}));
vi.mock('$lib/services/app.service', () => ({
  getGlobalActions: () => ({ Cast: { title: 'Cast', icon: '', $if: () => false, onAction() {} } }),
}));
vi.mock('$lib/managers/activity-manager.svelte', () => ({
  activityManager: { commentCount: 0, init: vi.fn().mockResolvedValue(undefined), reset: vi.fn() },
}));
vi.mock('$lib/managers/asset-viewer-manager.svelte', () => ({
  assetViewerManager: { isViewing: false, closeActivityPanel: vi.fn() },
}));
vi.mock('$lib/utils/handle-error', () => ({ handleError: vi.fn() }));

describe('Album detail folder placement actions', () => {
  beforeAll(async () => {
    register('en-US', () => import('$i18n/en.json'));
    await init({ fallbackLocale: 'en-US', initialLocale: 'en-US' });
    await waitLocale('en-US');
  });
  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => {
    cleanup();
    await new Promise((r) => setTimeout(r, 50));
  });
  it('refreshes actual detail menu and status from responses with ordinary PageData', async () => {
    const owner = userAdminFactory.build();
    authManager.setUser(owner);
    const album = albumFactory.build({
      albumName: 'Synthetic',
      assetCount: 0,
      albumUsers: [{ user: owner, role: AlbumUserRole.Owner }],
      folderAlbum: { enabled: true, path: '/library/owner/folder-albums/Synthetic' },
    });
    render(TestWrapper, { component: Page, componentProps: { data: { album } as never } });
    expect(screen.getByText('Folder placement enabled:')).toBeInTheDocument();
    for (const enabled of [false, true]) {
      await fireEvent.click(screen.getByRole('button', { name: 'Album options' }));
      await fireEvent.click(
        screen.getByRole('menuitem', { name: enabled ? 'Enable folder placement' : 'Disable folder placement' }),
      );
      await screen.findByRole('dialog');
      sdkMock.updateAlbumInfo.mockResolvedValueOnce({ ...album, folderAlbum: { ...album.folderAlbum!, enabled } });
      await fireEvent.click(screen.getByRole('button', { name: enabled ? 'Enable folder placement' : 'Yes, disable' }));
      await waitFor(() =>
        expect(sdkMock.updateAlbumInfo).toHaveBeenLastCalledWith({
          id: album.id,
          updateAlbumDto: { isFolderAlbum: enabled },
        }),
      );
      await waitFor(() =>
        expect(
          screen.getByText(
            enabled ? 'Folder placement enabled:' : 'Folder placement disabled; existing files stay in their folder:',
          ),
        ).toBeInTheDocument(),
      );
    }
    expect(invalidate).toHaveBeenCalledWith('album:data');
  });
  it('detail No/error/contradicting response leave enabled state and action accurate', async () => {
    const owner = userAdminFactory.build();
    authManager.setUser(owner);
    const album = albumFactory.build({
      albumName: 'Synthetic',
      assetCount: 0,
      albumUsers: [{ user: owner, role: AlbumUserRole.Owner }],
      folderAlbum: { enabled: true, path: '/library/owner/folder-albums/Synthetic' },
    });
    render(TestWrapper, { component: Page, componentProps: { data: { album } as never } });
    const open = async () => {
      await fireEvent.click(screen.getByRole('button', { name: 'Album options' }));
      await fireEvent.click(screen.getByRole('menuitem', { name: 'Disable folder placement' }));
      await screen.findByRole('dialog');
    };
    await open();
    await fireEvent.click(screen.getByRole('button', { name: 'No' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sdkMock.updateAlbumInfo).not.toHaveBeenCalled();
    const error = new Error('synthetic network failure');
    sdkMock.updateAlbumInfo.mockRejectedValueOnce(error);
    await open();
    await fireEvent.click(screen.getByRole('button', { name: 'Yes, disable' }));
    await waitFor(() => expect(handleError).toHaveBeenCalledWith(error, expect.any(String)));
    expect(screen.getByText('Folder placement enabled:')).toBeInTheDocument();
    sdkMock.updateAlbumInfo.mockResolvedValueOnce({ ...album, albumName: 'Authoritative title' });
    await open();
    await fireEvent.click(screen.getByRole('button', { name: 'Yes, disable' }));
    await waitFor(() => expect(screen.getAllByDisplayValue('Authoritative title').length).toBeGreaterThan(0));
    expect(screen.getByText('Folder placement enabled:')).toBeInTheDocument();
  });
  it.each([AlbumUserRole.Editor, AlbumUserRole.Viewer])(
    'real detail menu excludes folder action from %s',
    async (role) => {
      const owner = userAdminFactory.build();
      const collaborator = userAdminFactory.build();
      authManager.setUser(collaborator);
      const album = albumFactory.build({
        albumName: 'Synthetic',
        assetCount: 0,
        albumUsers: [
          { user: owner, role: AlbumUserRole.Owner },
          { user: collaborator, role },
        ],
        folderAlbum: { enabled: true, path: '/library/owner/folder-albums/Synthetic' },
      });
      render(TestWrapper, { component: Page, componentProps: { data: { album } as never } });
      await fireEvent.click(screen.getByRole('button', { name: 'Album options' }));
      expect(screen.queryByRole('menuitem', { name: /folder placement/i })).not.toBeInTheDocument();
      expect(sdkMock.updateAlbumInfo).not.toHaveBeenCalled();
    },
  );
});
