<script lang="ts">
  /** Eine Spalte der Gruppenverwaltung: Gruppe wählen, filtern, auswählen, ziehen. */
  import type { Favorite } from '../../domain/types';
  import { favoriteName } from '../../domain/views';
  import { t } from '../../i18n';
  import FavIcon from '../../ui/FavIcon.svelte';
  import ListPager from '../../ui/ListPager.svelte';
  import { app } from '../state.svelte';

  const PAGE_SIZE = 100;

  interface Props {
    groupId: string;
    items: Favorite[];
    selected: Set<string>;
    onselect: (ids: Set<string>) => void;
    ongroup: (groupId: string) => void;
    ondrop: (ids: string[]) => void;
  }

  let { groupId, items, selected, onselect, ongroup, ondrop }: Props = $props();
  let filter = $state('');
  let page = $state(0);
  let lastClicked = $state<string | null>(null);
  let dropping = $state(false);

  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    return q ? items.filter((f) => `${favoriteName(f)} ${f.url}`.toLowerCase().includes(q)) : items;
  });
  const visible = $derived(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));

  $effect(() => {
    void groupId;
    void filter;
    page = 0;
  });

  function click(event: MouseEvent, fav: Favorite): void {
    const next = new Set(selected);
    if (event.shiftKey && lastClicked) {
      const a = filtered.findIndex((f) => f.id === lastClicked);
      const b = filtered.findIndex((f) => f.id === fav.id);
      const [from, to] = a < b ? [a, b] : [b, a];
      for (const f of filtered.slice(from, to + 1)) next.add(f.id);
    } else if (next.has(fav.id)) next.delete(fav.id);
    else next.add(fav.id);
    lastClicked = fav.id;
    onselect(next);
  }

  function selectAll(): void {
    const all = filtered.every((f) => selected.has(f.id));
    onselect(all ? new Set() : new Set(filtered.map((f) => f.id)));
  }

  function dragStart(event: DragEvent, fav: Favorite): void {
    const ids = selected.has(fav.id) ? [...selected] : [fav.id];
    event.dataTransfer?.setData('application/x-favgrid-ids', JSON.stringify({ ids, from: groupId }));
  }

  function drop(event: DragEvent): void {
    event.preventDefault();
    dropping = false;
    const raw = event.dataTransfer?.getData('application/x-favgrid-ids');
    if (!raw) return;
    const { ids, from } = JSON.parse(raw) as { ids: string[]; from: string };
    if (from !== groupId) ondrop(ids);
  }
</script>

<section
  class="panel"
  class:dropping
  aria-label={t('managerPanel')}
  ondragover={(e) => { e.preventDefault(); dropping = true; }}
  ondragleave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && (dropping = false)}
  ondrop={drop}
>
  <header>
    <select class="input" value={groupId} onchange={(e) => ongroup(e.currentTarget.value)}>
      {#each app.groups as group (group.id)}
        <option value={group.id}>{group.icon} {group.name} ({app.counts.get(group.id) ?? 0})</option>
      {/each}
    </select>
    <div class="tools">
      <input class="input" type="search" placeholder={t('filterPlaceholder')} bind:value={filter} />
      <button type="button" class="all" title={t('selectAllTitle')} onclick={selectAll}>
        <i class="fa-regular fa-square-check" aria-hidden="true"></i>
        <span>{selected.size > 0 ? t('selectedCount', selected.size) : t('selectAll')}</span>
      </button>
    </div>
  </header>
  <ul class="items">
    {#each visible as fav (fav.id)}
      <li>
        <button type="button" class="item" class:selected={selected.has(fav.id)} draggable="true" title={fav.url} onclick={(e) => click(e, fav)} ondragstart={(e) => dragStart(e, fav)}>
          <span class="thumb"><FavIcon iconRef={fav.icon.ref} name={favoriteName(fav)} seed={fav.url} /></span>
          <span class="main">
            <span class="name">{favoriteName(fav)}</span>
            <span class="sub">{fav.url}</span>
          </span>
        </button>
      </li>
    {:else}
      <li class="empty">{t('managerEmpty')}</li>
    {/each}
  </ul>
  <ListPager {page} total={filtered.length} pageSize={PAGE_SIZE} onpage={(p) => (page = p)} />
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    min-height: 0;
    padding: 10px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-solid) 60%, var(--bg-page));
  }

  .panel.dropping {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 50%, transparent);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tools {
    display: flex;
    gap: 8px;
  }

  .all {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    padding: 0 12px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line-strong);
    background: var(--surface-raised);
    white-space: nowrap;
  }

  .items {
    flex: 1;
    min-height: 200px;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: auto;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border-radius: var(--radius-s);
    border: 1px solid transparent;
    background: transparent;
    text-align: left;
  }

  .item:hover {
    background: var(--surface-hover);
  }

  .item.selected {
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .thumb {
    flex: none;
    width: 28px;
    height: 28px;
    --fav-icon-size: 28px;
  }

  .main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name,
  .sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub {
    color: var(--text-faint);
    font-size: var(--fs-small);
  }

  .empty {
    padding: 24px;
    text-align: center;
    color: var(--text-faint);
  }
</style>
