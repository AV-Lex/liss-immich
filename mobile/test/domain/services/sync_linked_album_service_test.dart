import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/domain/services/sync_linked_album.service.dart';
import 'package:immich_mobile/domain/models/album/local_album.model.dart';
import 'package:immich_mobile/providers/infrastructure/db.provider.dart';
import 'package:immich_mobile/providers/infrastructure/store.provider.dart';
import 'package:immich_mobile/repositories/album_api_repository.dart';
import 'package:mocktail/mocktail.dart';

import '../../infrastructure/repository.mock.dart';
import '../../service.mocks.dart';
import '../../unit/factories/remote_album_factory.dart';

void main() {
  // A container with the service's deps overridden but cancellationProvider left
  // alone, i.e. the root (main) isolate, where cancellationProvider has no
  // override and throws if read. The UI reads this provider here.
  ProviderContainer rootContainer() {
    final drift = MockDrift();
    when(() => drift.localAlbumRepository).thenReturn(MockLocalAlbumRepository());
    when(() => drift.remoteAlbumRepository).thenReturn(MockRemoteAlbumRepository());
    final container = ProviderContainer(
      overrides: [
        driftProvider.overrideWithValue(drift),
        albumApiRepositoryProvider.overrideWithValue(MockAlbumApiRepository()),
        storeServiceProvider.overrideWithValue(MockStoreService()),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  // Regression for #29125 (Sync Albums toggle) and #29119 (can't leave the album
  // selection screen): #28694 made the provider watch cancellationProvider, so
  // reading it off the isolate threw. The cancellation now lives on the isolate
  // call path, not the provider, so the UI can build it.
  test('builds on the root isolate without a cancellationProvider override', () {
    final container = rootContainer();

    expect(() => container.read(syncLinkedAlbumServiceProvider), returnsNormally);
    expect(container.read(syncLinkedAlbumServiceProvider), isA<SyncLinkedAlbumService>());
  });

  test('manageLinkedAlbums runs from the UI without a cancellation signal', () {
    final service = rootContainer().read(syncLinkedAlbumServiceProvider);

    expect(service.manageLinkedAlbums(const [], 'user-1'), completes);
  });
  test('uploaded assets use ordinary Add and preserve linkedRemoteAlbumId across later sync', () async {
    final local = MockLocalAlbumRepository();
    final remote = MockRemoteAlbumRepository();
    final api = MockAlbumApiRepository();
    final album = RemoteAlbumFactory.create();
    final linked = LocalAlbum(id: 'local-album', name: 'Camera', updatedAt: DateTime.utc(2020),
      linkedRemoteAlbumId: album.id, backupSelection: BackupSelection.selected);
    when(() => local.getBackupAlbums()).thenAnswer((_) async => [linked]);
    when(() => remote.get(album.id)).thenAnswer((_) async => album);
    when(() => remote.getLinkedAssetIds('owner', linked.id, album.id)).thenAnswer((_) async => ['uploaded-1']);
    when(() => api.addAssets(album.id, ['uploaded-1'], abortTrigger: any(named: 'abortTrigger')))
      .thenAnswer((_) async => (added: ['uploaded-1'], failed: <String>[]));
    when(() => remote.addAssets(album.id, ['uploaded-1'])).thenAnswer((_) async => 1);
    final service = SyncLinkedAlbumService(local, remote, api, MockStoreService());
    await service.syncLinkedAlbums('owner');
    verify(() => api.addAssets(album.id, ['uploaded-1'], abortTrigger: any(named: 'abortTrigger'))).called(1);
    verify(() => remote.addAssets(album.id, ['uploaded-1'])).called(1);
    when(() => remote.getLinkedAssetIds('owner', linked.id, album.id)).thenAnswer((_) async => ['uploaded-2']);
    when(() => api.addAssets(album.id, ['uploaded-2'], abortTrigger: any(named: 'abortTrigger')))
      .thenAnswer((_) async => (added: ['uploaded-2'], failed: <String>[]));
    when(() => remote.addAssets(album.id, ['uploaded-2'])).thenAnswer((_) async => 1);
    await service.syncLinkedAlbums('owner');
    verify(() => api.addAssets(album.id, ['uploaded-2'], abortTrigger: any(named: 'abortTrigger'))).called(1);
    expect(linked.linkedRemoteAlbumId, album.id);
    verifyNever(() => local.linkRemoteAlbum(any(), any()));
    verifyNever(() => local.unlinkRemoteAlbum(any()));
  });

}
