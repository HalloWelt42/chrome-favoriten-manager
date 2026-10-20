<script lang="ts">
  /**
   * Eine Kachel. Klick öffnet, Mittelklick öffnet im Hintergrund, Rechtsklick zeigt das Menü.
   * Beim Überfahren erscheinen Bearbeiten und Papierkorb; Löschen ist immer rückgängig machbar.
   */
  import type { Favorite } from '../../domain/types';
  import { favoriteName, truncate } from '../../domain/views';
  import { t } from '../../i18n';
  import FavIcon from '../../ui/FavIcon.svelte';
  import { menu } from '../../ui/menu.svelte';
  import { DRAG_FAVORITE, dragState } from '../drag.svelte';
  import { editFavorite, favoriteMenu } from '../menus';
  import { app } from '../state.svelte';

  interface Props {
    favorite: Favorite;
    reorderable: boolean;
    ondropon: (draggedId: string, target: Favorite) => void;
  }

  let { favorite, reorderable, ondropon }: Props = $props();
  let dropping = $state(false);

  const name = $derived(favoriteName(favorite));
  const labels = $derived(app.settings.labels);
  const shadow = $derived(app.settings.grid.showShadow);
  const tooltip = $derived(favorite.description ? `${name}\n${favorite.url}\n${favorite.description}` : `${name}\n${favorite.url}`);

  function onclick(event: MouseEvent): void {
    event.preventDefault();
    app.openFavorite(favorite, event);
  }

  function onauxclick(event: MouseEvent): void {
    if (event.button !== 1) return;
    event.preventDefault();
    app.openInBackground(favorite);
  }

  function onDragStart(event: DragEvent): void {
    event.dataTransfer?.setData(DRAG_FAVORITE, favorite.id);
    event.dataTransfer?.setData('text/uri-list', favorite.url);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove';
    dragState.favoriteId = favorite.id;
  }

  function onDragOver(event: DragEvent): void {
    if (!reorderable || !dragState.favoriteId || dragState.favoriteId === favorite.id) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dropping = true;
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    dropping = false;
    const dragged = event.dataTransfer?.getData(DRAG_FAVORITE);
    if (dragged && dragged !== favorite.id) ondropon(dragged, favorite);
    dragState.reset();
  }

  function stop(event: Event, action: () => void): void {
    event.preventDefault();
    event.stopPropagation();
    action();
  }
</script>

<a
  class="tile"
  class:label-above={labels.position === 'above'}
  class:dropping
  class:dragging={dragState.favoriteId === favorite.id}
  href={favorite.url}
  draggable="true"
  title={tooltip}
  {onclick}
  {onauxclick}
  oncontextmenu={(e) => menu.open(e, favoriteMenu(favorite))}
  ondragstart={onDragStart}
  ondragend={() => { dragState.reset(); dropping = false; }}
  ondragover={onDragOver}
  ondragleave={() => (dropping = false)}
  ondrop={onDrop}
>
  <span class="icon" class:shadow>
    <span class="image">
      <FavIcon iconRef={favorite.icon.ref} {name} seed={favorite.url} rounded={app.settings.grid.imageRadius} />
    </span>
    <span class="actions">
      <button class="action edit" title={t('menuEdit')} aria-label={t('menuEdit')} onclick={(e) => stop(e, () => editFavorite(favorite))}>
        <i class="fa-solid fa-pen" aria-hidden="true"></i>
      </button>
      <button class="action trash" title={t('tileTrashTitle')} aria-label={t('menuTrash')} onclick={(e) => stop(e, () => void app.trashFavorites([favorite.id]))}>
        <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
      </button>
    </span>
  </span>
  {#if labels.show}
    <span class="label">{truncate(name, labels.maxLength)}</span>
  {/if}
</a>

<style>
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: var(--icon-size);
    text-decoration: none;
    color: inherit;
    border-radius: var(--tile-radius);
    transition: transform var(--t-fast), opacity var(--t-fast);
  }

  .tile.label-above {
    flex-direction: column-reverse;
  }

  .tile:hover {
    transform: translateY(-3px);
  }

  .tile.dragging {
    opacity: 0.35;
  }

  .icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size);
    height: var(--icon-size);
    border-radius: var(--tile-radius);
    background: var(--tile-bg);
    backdrop-filter: blur(var(--tile-blur));
    border: 1px solid rgba(255, 255, 255, var(--tile-border));
    box-shadow: 0 8px 32px rgba(0, 0, 0, var(--tile-shadow));
    transition: border-color var(--t-fast), box-shadow var(--t-fast);
  }

  .icon.shadow {
    box-shadow: 0 8px 32px rgba(0, 0, 0, var(--tile-shadow)), 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .tile:hover .icon {
    border-color: color-mix(in srgb, var(--accent) 70%, transparent);
    box-shadow: 0 10px 34px rgba(0, 0, 0, var(--tile-shadow)), 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
  }

  .dropping .icon {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 60%, transparent);
    transform: scale(1.06);
  }

  .image {
    width: 70%;
    height: 70%;
    display: flex;
    --fav-icon-size: calc(var(--icon-size) * 0.7);
  }

  .actions {
    position: absolute;
    inset: -8px -8px auto -8px;
    display: flex;
    justify-content: space-between;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--t-fast);
  }

  .tile:hover .actions,
  .tile:focus-visible .actions {
    opacity: 1;
    pointer-events: auto;
  }

  .action {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--line-strong);
    background: var(--surface-solid);
    color: var(--text-muted);
    font-size: 13px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .action.edit:hover {
    color: var(--accent-contrast);
    background: var(--accent);
    border-color: var(--accent);
  }

  .action.trash:hover {
    color: #fff;
    background: var(--danger);
    border-color: var(--danger);
  }

  .label {
    max-width: calc(var(--icon-size) + var(--grid-gap) - 4px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--label-font);
    font-size: var(--label-size);
    font-weight: var(--label-weight);
    color: var(--label-color);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  }

  :global([data-theme='light']) .label {
    text-shadow: none;
  }
</style>
