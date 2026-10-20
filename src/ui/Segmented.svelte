<script lang="ts" generics="T extends string">
  /** Umschalter mit wenigen festen Werten (statt Auswahlliste). */
  interface Option {
    value: T;
    label: string;
    icon?: string;
    title?: string;
  }

  interface Props {
    value: T;
    options: Option[];
    label: string;
    onchange: (value: T) => void;
  }

  let { value, options, label, onchange }: Props = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button type="button"
      role="radio"
      aria-checked={option.value === value}
      class:active={option.value === value}
      title={option.title}
      onclick={() => onchange(option.value)}
    >
      {#if option.icon}<i class={option.icon} aria-hidden="true"></i>{/if}
      <span>{option.label}</span>
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border-radius: var(--radius-s);
    background: color-mix(in srgb, var(--surface-solid) 70%, var(--bg-page));
    border: 1px solid var(--line);
  }

  button {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 34px;
    padding: 4px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    white-space: nowrap;
  }

  button:hover {
    color: var(--text);
    background: var(--surface-hover);
  }

  .active,
  .active:hover {
    background: var(--accent);
    color: var(--accent-contrast);
  }
</style>
