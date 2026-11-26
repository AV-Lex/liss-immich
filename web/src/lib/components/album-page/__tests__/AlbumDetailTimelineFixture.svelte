<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children, timelineManager = $bindable() }: { children?: Snippet; timelineManager?: unknown } = $props();
  timelineManager = { showAssetOwners: false, months: [] };
</script>

<div data-testid="album-detail-timeline" data-ready={!!timelineManager}>
  {@render children?.()}
</div>
