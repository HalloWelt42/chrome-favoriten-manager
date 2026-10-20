<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    icon?: string;
    title?: string;
    disabled?: boolean;
    busy?: boolean;
    type?: 'button' | 'submit';
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let { variant = 'secondary', icon, title, disabled = false, busy = false, type = 'button', onclick, children }: Props = $props();
</script>

<button class="btn {variant}" {type} {title} disabled={disabled || busy} {onclick}>
  {#if busy}
    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
  {:else if icon}
    <i class={icon} aria-hidden="true"></i>
  {/if}
  {#if children}<span>{@render children()}</span>{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 8px 16px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line-strong);
    background: var(--surface-raised);
    color: var(--text);
    font-weight: 500;
    white-space: nowrap;
    transition: background var(--t-fast), border-color var(--t-fast), opacity var(--t-fast);
  }

  .btn:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: var(--accent);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-contrast);
  }

  .primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 85%, white);
  }

  .ghost {
    background: transparent;
    border-color: transparent;
  }

  .danger {
    border-color: color-mix(in srgb, var(--danger) 60%, transparent);
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }

  .danger:hover:not(:disabled) {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }
</style>
