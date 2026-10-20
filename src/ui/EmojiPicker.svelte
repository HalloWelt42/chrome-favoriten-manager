<script lang="ts">
  import { t } from '../i18n';
  import { EMOJIS, QUICK_EMOJIS } from './emojis';

  interface Props {
    value: string;
    onpick: (emoji: string) => void;
  }

  let { value, onpick }: Props = $props();
  let expanded = $state(false);
</script>

<div class="emoji-picker">
  <div class="quick">
    {#each QUICK_EMOJIS as emoji (emoji)}
      <button class:selected={emoji === value} onclick={() => onpick(emoji)} aria-label={emoji}>{emoji}</button>
    {/each}
    <button class="more" class:open={expanded} title={t('emojiMoreTitle')} onclick={() => (expanded = !expanded)}>
      <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
    </button>
  </div>
  {#if expanded}
    <div class="all">
      {#each EMOJIS as emoji (emoji)}
        <button class:selected={emoji === value} onclick={() => onpick(emoji)} aria-label={emoji}>{emoji}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .emoji-picker {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quick,
  .all {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .all {
    max-height: 220px;
    overflow: auto;
    padding: 8px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-solid) 70%, var(--bg-page));
  }

  button {
    width: 38px;
    height: 38px;
    border: 1px solid transparent;
    border-radius: var(--radius-s);
    background: transparent;
    font-size: 21px;
    line-height: 1;
  }

  button:hover {
    background: var(--surface-hover);
  }

  .selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .more {
    color: var(--text-muted);
    font-size: 16px;
    border-color: var(--line-strong);
  }

  .more.open {
    border-color: var(--accent);
  }
</style>
