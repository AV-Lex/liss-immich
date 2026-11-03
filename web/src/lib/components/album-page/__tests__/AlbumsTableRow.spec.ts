import { render } from '@testing-library/svelte';
import { init, register, waitLocale } from 'svelte-i18n';
import { albumFactory } from '@test-data/factories/album-factory';
import AlbumsTableRow from '../AlbumsTableRow.svelte';

describe('AlbumsTableRow folder bindings', () => {
  beforeAll(async () => {
    await init({ fallbackLocale: 'en-US' });
    register('en-US', () => import('$i18n/en.json'));
    await waitLocale('en-US');
  });

  it.each([
    [true, 'Folder album (new assignments enabled)'],
    [false, 'Folder album (new assignments disabled; existing folder retained)'],
  ])('marks folder bindings with enabled=%s beside the name', (enabled, label) => {
    const album = albumFactory.build({ folderAlbum: { enabled, path: '/library/owner/folder-albums/Camera' } });
    const sut = render(AlbumsTableRow, { album });

    const marker = sut.getByRole('img', { name: label });
    expect(marker.closest('td')).toHaveTextContent(album.albumName);
  });

  it('does not mark ordinary albums', () => {
    const sut = render(AlbumsTableRow, { album: albumFactory.build() });

    expect(sut.queryByRole('img', { name: /Folder album/ })).not.toBeInTheDocument();
  });
});
