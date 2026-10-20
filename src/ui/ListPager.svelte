<script lang="ts">
  /** Blättern in langen Listen: "51-100 von 1176" mit Vor/Zurück. */
  import { t } from '../i18n';
  import IconButton from './IconButton.svelte';

  interface Props {
    page: number;
    total: number;
    pageSize: number;
    onpage: (page: number) => void;
  }

  let { page, total, pageSize, onpage }: Props = $props();
  const pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
</script>

{#if total > pageSize}
  <div class="pager">
    <IconButton icon="fa-solid fa-chevron-left" size="s" title={t('prevPage')} disabled={page === 0} onclick={() => onpage(page - 1)} />
    <span>{t('listRange', page * pageSize + 1, Math.min(total, (page + 1) * pageSize), total)}</span>
    <IconButton icon="fa-solid fa-chevron-right" size="s" title={t('nextPage')} disabled={page >= pages - 1} onclick={() => onpage(page + 1)} />
  </div>
{/if}

<style>
  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 10px 0 0;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
