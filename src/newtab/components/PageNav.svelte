<script lang="ts">
  /**
   * Seitenwahl: Punkte bei wenigen Seiten, nummerierte Knöpfe mit Lücken bei vielen.
   */
  import { t } from '../../i18n';
  import { app } from '../state.svelte';

  const MAX_DOTS = 12;

  const page = $derived(app.pageSlice.page);
  const count = $derived(app.pageSlice.pageCount);

  /** Seitenliste mit null als Lücke: 1 2 ... 6 [7] 8 ... 40 */
  const compact = $derived.by<(number | null)[]>(() => {
    const wanted = new Set([0, 1, count - 2, count - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < count));
    const sorted = [...wanted].sort((a, b) => a - b);
    const out: (number | null)[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1]! > 1) out.push(null);
      out.push(p);
    });
    return out;
  });
</script>

<div class="pages" aria-label={t('pagesLabel')}>
  {#if count > 1 && count <= MAX_DOTS}
    {#each { length: count } as _, index (index)}
      <button type="button" class="dot" class:active={index === page} title={t('pageN', index + 1)} aria-label={t('pageN', index + 1)} onclick={() => app.goToPage(index)}></button>
    {/each}
  {:else if count > MAX_DOTS}
    {#each compact as entry, index (index)}
      {#if entry === null}
        <span class="gap">...</span>
      {:else}
        <button type="button" class="num" class:active={entry === page} title={t('pageN', entry + 1)} onclick={() => app.goToPage(entry)}>{entry + 1}</button>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .pages {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 6px 0;
  }

  .dot {
    width: 12px;
    height: 12px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: color-mix(in srgb, var(--label-color) 40%, transparent);
    transition: width var(--t-med), background var(--t-fast);
  }

  .dot:hover {
    background: color-mix(in srgb, var(--label-color) 70%, transparent);
  }

  .dot.active {
    width: 32px;
    background: var(--accent);
  }

  .num {
    min-width: 36px;
    height: 34px;
    padding: 0 8px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: var(--surface);
    backdrop-filter: var(--glass);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .num:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .num.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-contrast);
  }

  .gap {
    color: var(--label-color);
    opacity: 0.7;
  }

</style>
