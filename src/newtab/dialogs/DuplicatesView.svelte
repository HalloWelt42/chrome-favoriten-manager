<script lang="ts">
  /**
   * Doppelte Adressen finden. Vorausgewählt ist jeweils alles außer dem wertvollsten Eintrag
   * (eigenes Icon, Beschreibung, Besuche). Entfernen heißt: in den Papierkorb.
   */
  import { untrack } from 'svelte';
  import { favoriteName, findDuplicates } from '../../domain/views';
  import { formatNumber, t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import FavIcon from '../../ui/FavIcon.svelte';
  import ListPager from '../../ui/ListPager.svelte';
  import { app } from '../state.svelte';

  const PAGE_SIZE = 25;

  let page = $state(0);
  // Feste Momentaufnahme: Live-Änderungen dürfen die Rangfolge nicht unbemerkt verschieben.
  let sets = $state(untrack(() => (app.library ? findDuplicates(app.library) : [])));
  const visible = $derived(sets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
  const groupNames = $derived(new Map(app.groups.map((g) => [g.id, `${g.icon} ${g.name}`])));
  const extraCount = $derived(sets.reduce((n, s) => n + s.favorites.length - 1, 0));

  /** Abgewählte Einträge; alles andere außer dem ersten je Satz gilt als ausgewählt. */
  let kept = $state(new Set<string>());
  let busy = $state(false);

  const marked = $derived(sets.flatMap((s) => s.favorites.slice(1).filter((f) => !kept.has(f.id)).map((f) => f.id)));

  function toggle(id: string, isFirst: boolean): void {
    if (isFirst) return;
    const next = new Set(kept);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    kept = next;
  }

  async function trashMarked(): Promise<void> {
    busy = true;
    await app.trashFavorites(marked);
    kept = new Set();
    sets = app.library ? findDuplicates(app.library) : [];
    busy = false;
  }
</script>

{#if sets.length === 0}
  <div class="empty">
    <i class="fa-regular fa-circle-check" aria-hidden="true"></i>
    <p>{t('duplicatesNone')}</p>
  </div>
{:else}
  <div class="summary">
    <p>{t('duplicatesSummary', formatNumber(sets.length), formatNumber(extraCount))}</p>
    <Button variant="primary" icon="fa-regular fa-trash-can" {busy} disabled={marked.length === 0} title={t('duplicatesTrashTitle')} onclick={trashMarked}>
      {t('duplicatesTrash', formatNumber(marked.length))}
    </Button>
  </div>
  <ul class="sets">
    {#each visible as set (set.key)}
      <li class="set">
        <div class="key">{set.key}</div>
        {#each set.favorites as fav, index (fav.id)}
          {@const isFirst = index === 0}
          {@const isMarked = !isFirst && !kept.has(fav.id)}
          <label class="row" class:marked={isMarked} class:keep={!isMarked}>
            <input type="checkbox" checked={isMarked} disabled={isFirst} onchange={() => toggle(fav.id, isFirst)} title={isFirst ? t('duplicatesKeepTitle') : t('duplicatesMarkTitle')} />
            <span class="thumb"><FavIcon iconRef={fav.icon.ref} name={favoriteName(fav)} seed={fav.url} /></span>
            <span class="name">{favoriteName(fav)}</span>
            <span class="group">{groupNames.get(fav.groupId) ?? ''}</span>
            <span class="badge">{isMarked ? t('duplicatesWillTrash') : t('duplicatesKeep')}</span>
          </label>
        {/each}
      </li>
    {/each}
  </ul>
  <ListPager {page} total={sets.length} pageSize={PAGE_SIZE} onpage={(p) => (page = p)} />
{/if}

<style>
  .summary {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }

  .summary p {
    flex: 1;
    margin: 0;
    color: var(--text-muted);
  }

  .sets {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .set {
    padding: 8px 10px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
  }

  .key {
    margin-bottom: 4px;
    color: var(--text-faint);
    font-size: var(--fs-small);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) minmax(0, 0.7fr) auto;
    align-items: center;
    gap: 10px;
    padding: 4px 6px;
    border-radius: var(--radius-s);
    cursor: pointer;
  }

  .row input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .thumb {
    width: 26px;
    height: 26px;
    --fav-icon-size: 26px;
  }

  .name,
  .group {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .group {
    color: var(--text-muted);
    font-size: var(--fs-small);
  }

  .badge {
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 14px;
  }

  .keep .badge {
    background: color-mix(in srgb, var(--success) 22%, transparent);
  }

  .marked .badge {
    background: color-mix(in srgb, var(--danger) 22%, transparent);
  }

  .marked .name {
    color: var(--text-muted);
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
    color: var(--success);
  }
</style>
