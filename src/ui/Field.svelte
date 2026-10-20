<script lang="ts">
  /** Beschriftete Zeile für ein Bedienelement; title erklärt die Wirkung beim Überfahren. */
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    title?: string;
    value?: string;
    stacked?: boolean;
    children: Snippet;
  }

  let { label, title, value, stacked = false, children }: Props = $props();
</script>

<div class="field" class:stacked {title}>
  <div class="head">
    <span class="label">{label}</span>
    {#if value !== undefined}<span class="value">{value}</span>{/if}
  </div>
  <div class="control">{@render children()}</div>
</div>

<style>
  .field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
    align-items: center;
    gap: 6px 16px;
    padding: 8px 0;
  }

  .stacked {
    grid-template-columns: minmax(0, 1fr);
  }

  .head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .label {
    color: var(--text);
  }

  .value {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .control {
    min-width: 0;
  }
</style>
