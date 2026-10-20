<script lang="ts">
  import { menu, type MenuItem } from './menu.svelte';

  let element: HTMLDivElement | undefined = $state();
  let position = $state({ left: 0, top: 0 });
  let openSub = $state<number | null>(null);
  let subLeft = $state(true);

  $effect(() => {
    const current = menu.current;
    openSub = null;
    if (!current || !element) return;
    const rect = element.getBoundingClientRect();
    position = {
      left: Math.max(8, Math.min(current.x, innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(current.y, innerHeight - rect.height - 8))
    };
    subLeft = position.left + rect.width * 2 + 16 > innerWidth;
  });

  $effect(() => {
    if (!menu.current) return;
    const close = (event: Event): void => {
      if (event instanceof MouseEvent && element?.contains(event.target as Node)) return;
      menu.close();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') menu.close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  });

  function activate(item: MenuItem, index: number): void {
    if (item.submenu) {
      openSub = openSub === index ? null : index;
      return;
    }
    menu.close();
    void item.run?.();
  }
</script>

{#if menu.current}
  <div class="menu" role="menu" bind:this={element} style:left="{position.left}px" style:top="{position.top}px">
    {#each menu.current.items as item, index (index)}
      {#if item.separatorBefore}<div class="sep" role="separator"></div>{/if}
      <div class="entry" role="none" onmouseenter={() => item.submenu && (openSub = index)}>
        <button role="menuitem" class:danger={item.danger} title={item.title} onclick={() => activate(item, index)}>
          <i class={item.icon} aria-hidden="true"></i>
          <span>{item.label}</span>
          {#if item.submenu}<i class="fa-solid fa-chevron-right arrow" aria-hidden="true"></i>{/if}
        </button>
        {#if item.submenu && openSub === index}
          <div class="menu sub" class:left={subLeft} role="menu">
            {#each item.submenu as sub, s (s)}
              <button role="menuitem" onclick={() => activate(sub, s)}>
                <i class={sub.icon} aria-hidden="true"></i>
                <span>{sub.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .menu {
    position: fixed;
    z-index: 150;
    min-width: 240px;
    padding: 6px;
    border-radius: var(--radius-m);
    background: var(--surface-solid);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow);
  }

  .sub {
    position: absolute;
    top: -6px;
    left: calc(100% + 4px);
    max-height: 60vh;
    overflow: auto;
  }

  .sub.left {
    left: auto;
    right: calc(100% + 4px);
  }

  .entry {
    position: relative;
  }

  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 12px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text);
    text-align: left;
  }

  button:hover {
    background: var(--surface-hover);
  }

  button i:first-child {
    width: 18px;
    color: var(--text-muted);
    text-align: center;
  }

  .arrow {
    margin-left: auto;
    color: var(--text-faint);
    font-size: 13px;
  }

  .danger,
  .danger i:first-child {
    color: var(--danger);
  }

  .sep {
    height: 1px;
    margin: 5px 6px;
    background: var(--line);
  }
</style>
