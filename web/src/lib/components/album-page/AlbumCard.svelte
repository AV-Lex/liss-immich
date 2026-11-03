<script lang="ts">
  import AlbumCover from '$lib/components/album-page/AlbumCover.svelte';
  import { Route } from '$lib/route';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { getShortDateRange } from '$lib/utils/date-time';
  import { type AlbumResponseDto } from '@immich/sdk';
  import { ContextMenuButton, Icon, type MenuItems } from '@immich/ui';
  import { mdiFolderOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    album: AlbumResponseDto;
    showOwner?: boolean;
    showDateRange?: boolean;
    showItemCount?: boolean;
    preload?: boolean;
    contextMenuItems?: MenuItems;
  };

  const {
    album,
    showOwner = false,
    showDateRange = false,
    showItemCount = false,
    preload = false,
    contextMenuItems,
  }: Props = $props();
</script>

<div
  class="group relative rounded-2xl border border-transparent p-5 hover:border-gray-200 hover:bg-gray-100 dark:hover:border-gray-800 dark:hover:bg-gray-900"
  data-testid="album-card"
>
  {#if contextMenuItems}
    <div
      id="icon-{album.id}"
      class="absolute inset-e-6 top-6 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      data-testid="context-button-parent"
    >
      <ContextMenuButton
        translations={{ open_menu: $t('show_album_options') }}
        position="top-left"
        variant="filled"
        class="icon-white-drop-shadow"
        items={contextMenuItems}
      />
    </div>
  {/if}

  <div class="relative">
    <AlbumCover {album} {preload} class="transition-all duration-300 group-hover:shadow-lg" />
    {#if album.folderAlbum}
      <Icon
        icon={mdiFolderOutline}
        size="28"
        class="absolute start-2 top-2 rounded-md bg-white/90 p-1 text-black dark:bg-gray-900/90 dark:text-white"
        title={$t(album.folderAlbum.enabled ? 'folder_album_marker_enabled' : 'folder_album_marker_retained')}
      />
    {/if}
  </div>

  <div class="mt-4">
    <p
      class="line-clamp-2 w-full text-lg/6 font-semibold wrap-break-word text-black group-hover:text-primary dark:text-white"
      data-testid="album-name"
      title={album.albumName}
    >
      <a
        href={Route.viewAlbum(album)}
        aria-label={album.albumName || $t('unnamed_album')}
        class="after:absolute after:inset-0 after:rounded-2xl">{album.albumName}</a
      >
    </p>

    {#if album.folderAlbum?.relativePath}
      <a
        class="relative z-10 block truncate text-sm text-primary underline"
        href={Route.folders({ path: album.folderAlbum.path })}
        aria-label={$t('folder_album_open_folder', { values: { path: `~/${album.folderAlbum.relativePath}` } })}
        title={`~/${album.folderAlbum.relativePath}`}
      >
        ~/{album.folderAlbum.relativePath}
      </a>
    {/if}

    {#if showDateRange && album.startDate && album.endDate}
      <p class="flex text-sm capitalize dark:text-immich-dark-fg">
        {getShortDateRange(album.startDate, album.endDate)}
      </p>
    {/if}

    <span class="flex gap-2 text-sm dark:text-immich-dark-fg" data-testid="album-details">
      {#if showItemCount}
        <p>
          {$t('items_count', { values: { count: album.assetCount } })}
        </p>
      {/if}

      {#if (showOwner || album.shared) && showItemCount}
        <p>•</p>
      {/if}

      {#if showOwner}
        {@const owner = album.albumUsers[0].user}
        {#if owner.id === authManager.user.id}
          <p>{$t('owned')}</p>
        {:else}
          <p>
            {$t('shared_by_user', { values: { user: owner.name } })}
          </p>
        {/if}
      {:else if album.shared}
        <p>{$t('shared')}</p>
      {/if}
    </span>
  </div>
</div>
