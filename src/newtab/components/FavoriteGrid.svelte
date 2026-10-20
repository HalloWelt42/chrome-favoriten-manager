<script lang="ts">
  /**
   * Raster der aktuellen Seite. Auf Seite 1 einer Gruppe steht vorn die Hinzufügen-Kachel.
   * Umsortieren per Ziehen geht nur in der eigenen Reihenfolge (Sortierung "manuell").
   */
  import { fade, fly } from 'svelte/transition';
  import * as commands from '../../app/commands';
  import type { Favorite } from '../../domain/types';
  import { t } from '../../i18n';
  import { app } from '../state.svelte';
  import FavoriteTile from './FavoriteTile.svelte';

  const WHEEL_COOLDOWN_MS = 350;
  const SWIPE_MIN_PX = 60;

  let lastPage = 0;
  let direction = $state(1);
  let lastWheel = 0;
  let touchStart: { x: number; y: number } | null = null;
  let viewport: HTMLDivElement | undefined = $state();
  let grid: HTMLDivElement | undefined = $state();
  /** Verkleinerung, damit das eingestellte Raster in kleine Fenster passt (nie Vergrößerung). */
  let scale = $state(1);

  function fit(): void {
    if (!viewport || !grid) return;
    const width = grid.offsetWidth;
    const height = grid.offsetHeight;
    if (!width || !height) return;
    scale = Math.min(1, viewport.clientWidth / width, viewport.clientHeight / height);
  }

  $effect(() => {
    const el = viewport;
    const inner = grid;
    if (!el || !inner) return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  });

  // Mausrad braucht einen nicht-passiven Empfänger, sonst rollt die Seite mit.
  $effect(() => {
    const el = viewport;
    if (!el) return;
    el.addEventListener('wheel', onwheel, { passive: false });
    return () => el.removeEventListener('wheel', onwheel);
  });

  const slice = $derived(app.pageSlice);
  const showAdd = $derived(!app.searching && slice.page === 0);
  const reorderable = $derived(!app.searching && app.settings.view.sort === 'manual');
  const transition = $derived(app.settings.animations.pageTransition);

  $effect(() => {
    const page = slice.page;
    direction = page >= lastPage ? 1 : -1;
    lastPage = page;
  });

  // Fehlende Icons der sichtbaren Seite suchen, danach die nächste Seite vorbereiten.
  $effect(() => {
    if (!app.settings.icons.autoDetect) return;
    app.autoIcons.enqueue(slice.items);
    const start = (slice.page + 1) * app.perPage - (app.searching ? 0 : 1);
    app.autoIcons.enqueue(app.visibleList.slice(start, start + app.perPage));
  });

  function pageIn(node: Element) {
    if (transition === 'slide') return fly(node, { x: direction * 60, duration: 220 });
    if (transition === 'fade') return fade(node, { duration: 200 });
    return { duration: 0 };
  }

  function onwheel(event: WheelEvent): void {
    if (!app.settings.navigation.mousewheel || app.dialog) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheel < WHEEL_COOLDOWN_MS) return;
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(delta) < 4) return;
    lastWheel = now;
    if (delta > 0) app.nextPage();
    else app.prevPage();
  }

  function ontouchstart(event: TouchEvent): void {
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function ontouchend(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (!touchStart || !touch || !app.settings.navigation.swipe) return;
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) app.nextPage();
    else app.prevPage();
  }

  async function dropOn(draggedId: string, target: Favorite): Promise<void> {
    const dragged = app.library?.favorites.find((f) => f.id === draggedId);
    if (!dragged) return;
    if (dragged.groupId !== target.groupId) {
      await app.run(() => commands.moveFavorites([draggedId], target.groupId, target.position));
    } else {
      await app.run(() => commands.moveFavoriteWithinGroup(draggedId, target.position));
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="viewport" bind:this={viewport} {ontouchstart} {ontouchend}>
  {#key `${app.currentGroup?.id}:${slice.page}:${app.searching}`}
    <div class="grid" bind:this={grid} style:transform={scale < 1 ? `scale(${scale})` : null} in:pageIn>
      {#if showAdd}
        <button type="button" class="add" title={t('addFavoriteTitle')} onclick={() => (app.dialog = { kind: 'favorite', favoriteId: null, groupId: app.currentGroup!.id })}>
          <span class="icon"><i class="fa-solid fa-plus" aria-hidden="true"></i></span>
          {#if app.settings.labels.show}<span class="label">{t('add')}</span>{/if}
        </button>
      {/if}
      {#each slice.items as favorite (favorite.id)}
        <FavoriteTile {favorite} {reorderable} ondropon={dropOn} />
      {/each}
    </div>
  {/key}
  {#if app.searching && slice.items.length === 0}
    <div class="empty">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <p>{t('searchNoResults')}</p>
    </div>
  {:else if !app.searching && app.groupFavorites.length === 0}
    <p class="empty-hint">{t('groupEmpty')}</p>
  {/if}
</div>

<style>
  .viewport {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .grid {
    flex: none;
    transform-origin: center center;
    display: grid;
    grid-template-columns: repeat(var(--cols), var(--icon-size));
    gap: var(--grid-gap);
    justify-content: center;
    align-content: center;
  }

  .add {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: var(--icon-size);
    padding: 0;
    border: none;
    background: none;
  }

  .add .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size);
    height: var(--icon-size);
    border-radius: var(--tile-radius);
    border: 2px dashed color-mix(in srgb, var(--accent) 70%, transparent);
    background: color-mix(in srgb, var(--accent) 10%, var(--tile-bg));
    backdrop-filter: blur(var(--tile-blur));
    color: var(--accent);
    font-size: calc(var(--icon-size) * 0.32);
    transition: background var(--t-fast), transform var(--t-fast);
  }

  .add:hover .icon {
    background: color-mix(in srgb, var(--accent) 25%, var(--tile-bg));
    transform: translateY(-3px);
  }

  .add .label {
    font-family: var(--label-font);
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    color: var(--accent);
  }

  .empty {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: var(--fs-large);
  }

  .empty i {
    font-size: 36px;
    opacity: 0.6;
  }

  .empty-hint {
    margin: 18px 0 0;
    color: var(--label-color);
    opacity: 0.75;
  }
</style>
