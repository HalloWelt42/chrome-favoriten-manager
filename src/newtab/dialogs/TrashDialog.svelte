<script lang="ts">
  /**
   * Papierkorb: alles Gelöschte bleibt hier, bis es ausdrücklich endgültig entfernt wird.
   * Auch danach steckt es noch in den Sicherungsständen.
   */
  import * as commands from '../../app/commands';
  import { trashedFavoriteCount } from '../../domain/library';
  import type { TrashEntry } from '../../domain/types';
  import { favoriteName } from '../../domain/views';
  import { formatDateTime, t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import FavIcon from '../../ui/FavIcon.svelte';
  import ListPager from '../../ui/ListPager.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';

  const PAGE_SIZE = 50;

  let filter = $state('');
  let page = $state(0);
  let selected = $state(new Set<string>());
  let confirmPurge = $state<'selected' | 'all' | null>(null);

  const entries = $derived(app.library?.trash ?? []);
  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => entryText(e).toLowerCase().includes(q));
  });
  const visible = $derived(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
  /** Nur gewählte Einträge, die der Filter gerade zeigt, werden bearbeitet. */
  const selectedShown = $derived(filtered.filter((e) => selected.has(e.id)).map((e) => e.id));
  const groupNames = $derived(new Map(app.groups.map((g) => [g.id, `${g.icon} ${g.name}`])));

  $effect(() => {
    void filter;
    page = 0;
  });

  function entryText(entry: TrashEntry): string {
    return entry.kind === 'favorite' ? `${favoriteName(entry.favorite)} ${entry.favorite.url}` : entry.group.name;
  }

  function toggle(id: string): void {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function selectVisible(): void {
    const allSelected = visible.every((e) => selected.has(e.id));
    const next = new Set(selected);
    for (const e of visible) {
      if (allSelected) next.delete(e.id);
      else next.add(e.id);
    }
    selected = next;
  }

  async function restore(ids: string[]): Promise<void> {
    const count = await app.run(() => commands.restoreFromTrash(ids));
    if (count !== undefined) {
      selected = new Set([...selected].filter((id) => !ids.includes(id)));
      toasts.show(t('toastRestoredCount', count));
    }
  }

  async function purge(): Promise<void> {
    const shown = new Set(filtered.map((e) => e.id));
    const target = confirmPurge === 'all' ? 'all' : [...selected].filter((id) => shown.has(id));
    confirmPurge = null;
    const removed = await app.run(() => commands.purgeTrash(target));
    if (removed !== undefined) {
      selected = new Set();
      toasts.show(t('toastPurged', removed));
    }
  }
</script>

<Dialog title={t('trashTitle')} icon="fa-regular fa-trash-can" width="l" onclose={() => app.closeDialog()}>
  {#snippet headerExtra()}
    <Button icon="fa-solid fa-clock-rotate-left" title={t('snapshotsOpenTitle')} onclick={() => (app.dialog = { kind: 'snapshots' })}>{t('snapshotsTitle')}</Button>
  {/snippet}

  <p class="intro">{t('trashIntro')}</p>

  {#if entries.length === 0}
    <div class="empty">
      <i class="fa-regular fa-face-smile" aria-hidden="true"></i>
      <p>{t('trashEmpty')}</p>
    </div>
  {:else}
    <div class="toolbar">
      <input class="input" type="search" placeholder={t('filterPlaceholder')} bind:value={filter} />
      <Button icon="fa-regular fa-square-check" onclick={selectVisible}>{t('selectPage')}</Button>
    </div>
    <ul class="list">
      {#each visible as entry (entry.id)}
        <li class:selected={selected.has(entry.id)}>
          <label class="check">
            <input type="checkbox" checked={selected.has(entry.id)} onchange={() => toggle(entry.id)} />
          </label>
          {#if entry.kind === 'favorite'}
            <span class="thumb"><FavIcon iconRef={entry.favorite.icon.ref} name={favoriteName(entry.favorite)} seed={entry.favorite.url} /></span>
            <span class="main">
              <span class="name">{favoriteName(entry.favorite)}</span>
              <span class="sub">{entry.favorite.url}</span>
            </span>
            <span class="where">{groupNames.get(entry.favorite.groupId) ?? t('trashGroupGone')}</span>
          {:else}
            <span class="thumb group" style:background={entry.group.color}>{entry.group.icon}</span>
            <span class="main">
              <span class="name">{t('trashGroupEntry', entry.group.name)}</span>
              <span class="sub">{t('trashGroupCount', trashedFavoriteCount(entry))}</span>
            </span>
            <span class="where"></span>
          {/if}
          <span class="date">{formatDateTime(entry.deletedAt)}</span>
          <Button icon="fa-solid fa-rotate-left" title={t('restoreTitle')} onclick={() => restore([entry.id])}>{t('restore')}</Button>
        </li>
      {/each}
    </ul>
    <ListPager {page} total={filtered.length} pageSize={PAGE_SIZE} onpage={(p) => (page = p)} />
  {/if}

  {#if confirmPurge}
    <div class="confirm" role="alert">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <span>{confirmPurge === 'all' ? t('purgeAllConfirm', entries.length) : t('purgeSelectedConfirm', selectedShown.length)}</span>
      <Button variant="ghost" onclick={() => (confirmPurge = null)}>{t('cancel')}</Button>
      <Button variant="danger" onclick={purge}>{t('purgeConfirmButton')}</Button>
    </div>
  {/if}

  {#snippet footer()}
    {#if entries.length > 0}
      <Button variant="danger" icon="fa-solid fa-fire" title={t('purgeAllTitle')} onclick={() => (confirmPurge = 'all')}>{t('purgeAll')}</Button>
      <Button variant="danger" icon="fa-solid fa-xmark" disabled={selectedShown.length === 0} title={t('purgeSelectedTitle')} onclick={() => (confirmPurge = 'selected')}>{t('purgeSelected')}</Button>
      <span class="spacer"></span>
      <Button variant="primary" icon="fa-solid fa-rotate-left" disabled={selectedShown.length === 0} onclick={() => restore(selectedShown)}>{t('restoreSelected', selectedShown.length)}</Button>
    {:else}
      <Button variant="primary" onclick={() => app.closeDialog()}>{t('close')}</Button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .intro {
    margin: 0 0 14px;
    color: var(--text-muted);
  }

  .toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  li {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) minmax(0, 0.6fr) auto auto;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    border-radius: var(--radius-s);
    border: 1px solid transparent;
  }

  li:hover {
    background: var(--surface-hover);
  }

  li.selected {
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .check input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .thumb {
    width: 32px;
    height: 32px;
    --fav-icon-size: 32px;
  }

  .thumb.group {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-s);
    font-size: 18px;
  }

  .main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name,
  .sub,
  .where {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub,
  .where,
  .date {
    color: var(--text-faint);
    font-size: var(--fs-small);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 30px;
    color: var(--text-muted);
  }

  .empty i {
    font-size: 34px;
  }

  .confirm {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-m);
    background: color-mix(in srgb, var(--danger) 16%, var(--surface-solid));
    border: 1px solid var(--danger);
  }

  .confirm i {
    color: var(--danger);
  }

  .confirm span {
    flex: 1;
  }

  .spacer {
    flex: 1;
  }
</style>
