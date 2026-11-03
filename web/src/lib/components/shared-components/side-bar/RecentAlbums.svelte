<script lang="ts">
  import { Route } from '$lib/route';
  import { userInteraction } from '$lib/stores/user.svelte';
  import { getAssetMediaUrl } from '$lib/utils';
  import { handleError } from '$lib/utils/handle-error';
  import { getAllAlbums } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiFolderOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  let albums = $state(userInteraction.recentAlbums);

  const refreshAlbums = async () => {
    try {
      const allAlbums = await getAllAlbums({});
      albums = allAlbums.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
      userInteraction.recentAlbums = albums;
    } catch (error) {
      handleError(error, $t('failed_to_load_assets'));
    }
  };

  $effect(() => {
    if (!userInteraction.recentAlbums) {
      void refreshAlbums();
    }
  });
</script>

{#each albums as album (album.id)}
  <a
    href={Route.viewAlbum(album)}
    title={album.albumName}
    class="flex w-full place-items-center justify-between gap-4 rounded-e-full py-3 ps-10 transition-[padding] delay-100 duration-100 hover:cursor-pointer hover:bg-subtle hover:text-immich-primary group-hover:sm:px-10 md:px-10 dark:text-immich-dark-fg dark:hover:bg-immich-dark-gray dark:hover:text-immich-dark-primary"
  >
    <div>
      <div
        class="size-6 rounded-sm bg-gray-200 bg-cover dark:bg-gray-600"
        style={album.albumThumbnailAssetId
          ? `background-image:url('${getAssetMediaUrl({ id: album.albumThumbnailAssetId })}')`
          : ''}
      ></div>
    </div>
    <div class="flex min-w-0 grow items-center gap-1 text-sm font-medium">
      {#if album.folderAlbum}
        <Icon
          icon={mdiFolderOutline}
          size="16"
          class="shrink-0"
          title={$t(album.folderAlbum.enabled ? 'folder_album_marker_enabled' : 'folder_album_marker_retained')}
        />
      {/if}
      <span class="truncate">{album.albumName}</span>
    </div>
  </a>
{/each}
