<script lang="ts">
  /**
   * Fenster über der Seite. Schließt mit Escape (unabhängig vom Fokus), Klick daneben oder dem Kreuz.
   * Der Kopf bleibt stehen, nur der Inhalt rollt.
   */
  import type { Snippet } from 'svelte';
  import { t } from '../i18n';

  interface Props {
    title: string;
    icon?: string;
    width?: 's' | 'm' | 'l' | 'xl';
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
    headerExtra?: Snippet;
  }

  let { title, icon, width = 'm', onclose, children, footer, headerExtra }: Props = $props();
  let panel: HTMLDivElement | undefined = $state();

  $effect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button:not(.close)');
    first?.focus();
    return () => previous?.focus?.();
  });

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onclose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:window {onkeydown} />

<div class="backdrop" role="presentation" onmousedown={(e) => e.target === e.currentTarget && onclose()}>
  <div class="dialog {width}" role="dialog" aria-modal="true" aria-label={title} bind:this={panel}>
    <header>
      {#if icon}<i class={icon} aria-hidden="true"></i>{/if}
      <h2>{title}</h2>
      {#if headerExtra}<div class="extra">{@render headerExtra()}</div>{/if}
      <button type="button" class="close" title={t('close')} aria-label={t('close')} onclick={onclose}>
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </header>
    <div class="body">{@render children()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    animation: fade var(--t-med);
  }

  .dialog {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100vh - 48px);
    background: var(--surface-solid);
    border: 1px solid var(--line);
    border-radius: var(--radius-l);
    box-shadow: var(--shadow);
    animation: pop var(--t-med);
  }

  .s { max-width: 440px; }
  .m { max-width: 600px; }
  .l { max-width: 820px; }
  .xl { max-width: 1100px; }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--line);
  }

  header > i {
    color: var(--accent);
    font-size: var(--fs-large);
  }

  h2 {
    flex: 1;
    margin: 0;
    font-size: var(--fs-large);
    font-weight: 600;
  }

  .extra {
    display: flex;
    gap: 8px;
  }

  .close {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-muted);
    font-size: 18px;
  }

  .close:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 18px 20px;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 20px 18px;
    border-top: 1px solid var(--line);
  }

  @keyframes fade {
    from { opacity: 0; }
  }

  @keyframes pop {
    from { transform: translateY(8px) scale(0.98); opacity: 0; }
  }
</style>
