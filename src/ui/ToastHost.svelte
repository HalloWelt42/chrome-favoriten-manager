<script lang="ts">
  import { t } from '../i18n';
  import { toasts } from './toasts.svelte';

  const ICONS = {
    success: 'fa-solid fa-circle-check',
    info: 'fa-solid fa-circle-info',
    warning: 'fa-solid fa-triangle-exclamation',
    error: 'fa-solid fa-circle-exclamation'
  } as const;
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <div class="toast {toast.kind}" role="status">
      <i class={ICONS[toast.kind]} aria-hidden="true"></i>
      <span class="text">{toast.text}</span>
      {#if toast.action}
        {@const action = toast.action}
        <button type="button"
          class="action"
          onclick={() => {
            toasts.dismiss(toast.id);
            void action.run();
          }}>{action.label}</button
        >
      {/if}
      <button type="button" class="close" title={t('close')} aria-label={t('close')} onclick={() => toasts.dismiss(toast.id)}>
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: 28px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 280px;
    max-width: min(640px, 92vw);
    padding: 10px 10px 10px 16px;
    border-radius: var(--radius-m);
    background: var(--surface-solid);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow);
    pointer-events: auto;
    animation: rise var(--t-med);
  }

  .success i:first-child { color: var(--success); }
  .info i:first-child { color: var(--accent); }
  .warning i:first-child { color: var(--warning); }
  .error i:first-child { color: var(--danger); }

  .text {
    flex: 1;
  }

  .action {
    padding: 6px 12px;
    border-radius: var(--radius-s);
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    color: var(--text);
    font-weight: 600;
  }

  .action:hover {
    background: var(--accent);
    color: var(--accent-contrast);
  }

  .close {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-faint);
  }

  .close:hover {
    color: var(--text);
    background: var(--surface-hover);
  }

  @keyframes rise {
    from { transform: translateY(10px); opacity: 0; }
  }
</style>
