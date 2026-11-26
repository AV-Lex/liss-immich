<script lang="ts">
  import { FormModal } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    enabled: boolean;
    onClose: (confirmed: boolean) => void;
  };

  const { enabled, onClose }: Props = $props();
</script>

<FormModal
  title={$t(enabled ? 'folder_album_enable' : 'folder_album_disable')}
  submitText={$t(enabled ? 'folder_album_enable' : 'folder_album_disable_confirm')}
  cancelText={$t('no')}
  submitColor="primary"
  onSubmit={() => onClose(true)}
  onClose={() => onClose(false)}
>
  <p>{$t(enabled ? 'folder_album_enable_prompt' : 'folder_album_disable_prompt')}</p>
</FormModal>
