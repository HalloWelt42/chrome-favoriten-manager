<script lang="ts">
  /**
   * Gruppenleiste: Klick wählt, Doppelklick bearbeitet, Rechtsklick öffnet das Menü.
   * Gruppen lassen sich per Ziehen ordnen; Favoriten lassen sich auf eine Gruppe ziehen.
   */
  import * as commands from '../../app/commands';
  import { t } from '../../i18n';
  import IconButton from '../../ui/IconButton.svelte';
  import { menu } from '../../ui/menu.svelte';
  import { DRAG_FAVORITE, DRAG_GROUP, dragState } from '../drag.svelte';
  import { groupMenu } from '../menus';
  import { app } from '../state.svelte';

  let strip: HTMLDivElement | undefined = $state();
  let canLeft = $state(false);
  let canRight = $state(false);
  let dropTarget = $state<string | null>(null);

  function updateArrows(): void {
    if (!strip) return;
    canLeft = strip.scrollLeft > 4;
    canRight = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4;
  }

  $effect(() => {
    void app.groups.length;
    void app.settingsOpen;
    requestAnimationFrame(updateArrows);
  });

  $effect(() => {
    // Aktive Gruppe sichtbar halten.
    const id = app.currentGroup?.id;
    if (!strip || !id) return;
    strip.querySelector<HTMLElement>(`[data-group="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  function onDragStart(event: DragEvent, groupId: string): void {
    event.dataTransfer?.setData(DRAG_GROUP, groupId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    dragState.groupId = groupId;
  }

  function onDragOver(event: DragEvent, groupId: string): void {
    const dragsFavorite = dragState.favoriteId !== null;
    const dragsGroup = dragState.groupId !== null && dragState.groupId !== groupId;
    if (!dragsFavorite && !dragsGroup) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dropTarget = groupId;
  }

  async function onDrop(event: DragEvent, groupId: string): Promise<void> {
    event.preventDefault();
    dropTarget = null;
    const favoriteId = event.dataTransfer?.getData(DRAG_FAVORITE);
    const draggedGroup = event.dataTransfer?.getData(DRAG_GROUP);
    if (favoriteId) {
      const fav = app.library?.favorites.find((f) => f.id === favoriteId);
      const group = app.groups.find((g) => g.id === groupId);
      if (fav && group && fav.groupId !== groupId) {
        await app.run(() => commands.moveFavorites([favoriteId], groupId), t('toastMovedTo', group.name));
      }
    } else if (draggedGroup && draggedGroup !== groupId) {
      const index = app.groups.findIndex((g) => g.id === groupId);
      await app.run(() => commands.moveGroup(draggedGroup, index));
    }
    dragState.reset();
  }
</script>

<nav class="groupbar" aria-label={t('groupsLabel')}>
  {#if canLeft}
    <IconButton icon="fa-solid fa-chevron-left" size="s" title={t('scrollLeft')} onclick={() => strip?.scrollBy({ left: -300, behavior: 'smooth' })} />
  {/if}
  <div class="strip" bind:this={strip} onscroll={updateArrows} role="tablist">
    {#each app.groups as group (group.id)}
      <button type="button"
        role="tab"
        aria-selected={group.id === app.currentGroup?.id}
        class="tab"
        class:active={group.id === app.currentGroup?.id && !app.searching}
        class:drop={dropTarget === group.id}
        data-group={group.id}
        style:--group-color={group.color}
        draggable="true"
        title={t('groupTabTitle')}
        onclick={() => app.selectGroup(group.id)}
        ondblclick={() => (app.dialog = { kind: 'group', groupId: group.id })}
        oncontextmenu={(e) => menu.open(e, groupMenu(group))}
        ondragstart={(e) => onDragStart(e, group.id)}
        ondragend={() => { dragState.reset(); dropTarget = null; }}
        ondragover={(e) => onDragOver(e, group.id)}
        ondragleave={() => dropTarget === group.id && (dropTarget = null)}
        ondrop={(e) => onDrop(e, group.id)}
      >
        <span class="emoji">{group.icon}</span>
        <span class="name">{group.name}</span>
        <span class="count">{app.counts.get(group.id) ?? 0}</span>
      </button>
    {/each}
  </div>
  {#if canRight}
    <IconButton icon="fa-solid fa-chevron-right" size="s" title={t('scrollRight')} onclick={() => strip?.scrollBy({ left: 300, behavior: 'smooth' })} />
  {/if}
  <IconButton icon="fa-solid fa-plus" size="m" title={t('newGroup')} onclick={() => (app.dialog = { kind: 'group', groupId: null })} />
</nav>

<svelte:window onresize={updateArrows} />

<style>
  .groupbar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding-bottom: 12px;
    min-width: 0;
  }

  .strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 4px 2px;
    min-width: 0;
  }

  .strip::-webkit-scrollbar {
    display: none;
  }

  .tab {
    --group-color: var(--accent);
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--surface);
    backdrop-filter: var(--glass);
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
    transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
  }

  .tab:hover {
    color: var(--text);
    border-color: color-mix(in srgb, var(--group-color) 60%, transparent);
  }

  .tab.active {
    background: var(--group-color);
    border-color: var(--group-color);
    color: #fff;
    box-shadow: 0 0 18px color-mix(in srgb, var(--group-color) 45%, transparent);
  }

  .tab.drop {
    border-color: var(--group-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--group-color) 55%, transparent);
    transform: scale(1.04);
  }

  .emoji {
    font-size: 18px;
  }

  .count {
    min-width: 26px;
    padding: 1px 7px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.22);
    color: inherit;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
</style>
