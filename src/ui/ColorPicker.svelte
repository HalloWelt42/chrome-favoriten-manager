<script lang="ts">
  /**
   * Farbwahl aus fester Palette: Kurzauswahl direkt sichtbar, die volle Material-Palette
   * klappt darunter auf. Keine freie Farbwahl.
   */
  import { t } from '../i18n';
  import { MATERIAL_PALETTE, QUICK_COLORS } from './palette';

  interface Props {
    value: string;
    label: string;
    onpick: (color: string) => void;
  }

  let { value, label, onpick }: Props = $props();
  let expanded = $state(false);
</script>

<div class="picker" role="group" aria-label={label}>
  <div class="quick">
    {#each QUICK_COLORS as color (color)}
      <button
        class="swatch"
        class:selected={color === value}
        style:background={color}
        title={color}
        aria-label={color}
        onclick={() => onpick(color)}
      ></button>
    {/each}
    <button class="more" class:open={expanded} title={t('colorMoreTitle')} onclick={() => (expanded = !expanded)}>
      <span class="current" style:background={value}></span>
      <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
    </button>
  </div>
  {#if expanded}
    <div class="full">
      {#each MATERIAL_PALETTE as row, r (r)}
        <div class="row">
          {#each row as color (color)}
            <button
              class="cell"
              class:selected={color === value}
              style:background={color}
              title={color}
              aria-label={color}
              onclick={() => onpick(color)}
            ></button>
          {/each}
        </div>
      {/each}
      <div class="row">
        {#each ['#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#616161', '#424242', '#212121', '#121212', '#000000'] as color (color)}
          <button class="cell" class:selected={color === value} style:background={color} title={color} aria-label={color} onclick={() => onpick(color)}></button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quick {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .swatch {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid transparent;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  }

  .swatch.selected,
  .cell.selected {
    border-color: var(--text);
    box-shadow: 0 0 0 2px var(--surface-solid), 0 0 0 4px var(--text);
  }

  .more {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 8px 0 3px;
    border-radius: 13px;
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
  }

  .more.open i {
    transform: rotate(180deg);
  }

  .current {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  }

  .full {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-radius: var(--radius-s);
    background: color-mix(in srgb, var(--surface-solid) 70%, var(--bg-page));
    border: 1px solid var(--line);
  }

  .row {
    display: flex;
    gap: 2px;
  }

  .cell {
    flex: 1;
    min-width: 0;
    height: 20px;
    border: 2px solid transparent;
    border-radius: 3px;
  }
</style>
