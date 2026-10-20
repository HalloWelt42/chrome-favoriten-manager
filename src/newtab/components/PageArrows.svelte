<script lang="ts">
  /** Blätterpfeile am linken und rechten Rand der Rasterfläche. */
  import { t } from '../../i18n';
  import IconButton from '../../ui/IconButton.svelte';
  import { app } from '../state.svelte';

  const page = $derived(app.pageSlice.page);
  const count = $derived(app.pageSlice.pageCount);
</script>

{#if app.settings.navigation.showArrows && count > 1}
  <div class="arrow left" class:hidden={page === 0}>
    <IconButton icon="fa-solid fa-chevron-left" size="l" title={t('prevPage')} onclick={() => app.prevPage()} />
  </div>
  <div class="arrow right" class:hidden={page >= count - 1}>
    <IconButton icon="fa-solid fa-chevron-right" size="l" title={t('nextPage')} onclick={() => app.nextPage()} />
  </div>
{/if}

<style>
  .arrow {
    position: absolute;
    top: 50%;
    z-index: 5;
    transform: translateY(-50%);
    transition: opacity var(--t-fast);
  }

  .left {
    left: -8px;
  }

  .right {
    right: -8px;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
