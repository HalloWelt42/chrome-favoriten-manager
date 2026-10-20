<script lang="ts">
  /** Popup: aktuelle Seite mit Namen in eine Gruppe übernehmen. */
  import { onMount } from 'svelte';
  import * as commands from '../app/commands';
  import { repository } from '../app/services';
  import { browserFaviconUrl } from '../icons/sources/otherSources';
  import { defaultGroup, sortedGroups } from '../domain/library';
  import type { Favorite, Group, Library } from '../domain/types';
  import { duplicateKey, isWebUrl } from '../domain/urls';
  import { favoriteName } from '../domain/views';
  import { formatNumber, t } from '../i18n';
  import Button from '../ui/Button.svelte';

  let library = $state<Library | null>(null);
  let url = $state('');
  let name = $state('');
  let groupId = $state('');
  let saving = $state(false);
  let added = $state(false);
  let error = $state('');

  const groups = $derived<Group[]>(library ? sortedGroups(library) : []);
  const existing = $derived<Favorite | null>(
    library && url ? (library.favorites.find((f) => duplicateKey(f.url) === duplicateKey(url)) ?? null) : null
  );
  const existingGroup = $derived(existing ? groups.find((g) => g.id === existing.groupId) : undefined);
  const addable = $derived(isWebUrl(url));

  onMount(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    url = tab?.url ?? '';
    name = tab?.title ?? '';
    library = await repository.load();
    const last = library.settings.startup.lastGroupId;
    groupId = last && library.groups.some((g) => g.id === last) ? last : defaultGroup(library).id;
    document.documentElement.dataset.theme =
      library.settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : library.settings.theme;
    document.documentElement.style.setProperty('--accent', library.settings.accentColor);
  });

  async function add(): Promise<void> {
    saving = true;
    error = '';
    try {
      const result = await commands.addFavoriteIfNew({ url, alias: name.trim(), groupId });
      if (result.added) {
        added = true;
        await commands.rememberGroup(groupId);
        setTimeout(() => window.close(), 900);
      }
    } catch {
      error = t('errorGeneric');
    } finally {
      saving = false;
    }
  }

  function openNewtab(): void {
    void chrome.tabs.create({ url: chrome.runtime.getURL('newtab/index.html') });
    window.close();
  }
</script>

<div class="popup">
  <header>
    <img src="../assets/icons/icon-32.png" alt="" />
    <span>FavGrid</span>
    {#if library}<span class="stats">{t('popupStats', formatNumber(library.favorites.length), library.groups.length)}</span>{/if}
  </header>

  {#if !library}
    <p class="hint"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i></p>
  {:else if !addable}
    <p class="note">{t('popupCannotAdd')}</p>
  {:else if added}
    <p class="done"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> {t('toastFavoriteAdded')}</p>
  {:else}
    <div class="page">
      <img class="favicon" src={browserFaviconUrl(url, 32)} alt="" />
      <span class="url" title={url}>{url}</span>
    </div>
    <label class="row">
      <span>{t('fieldName')}</span>
      <input class="input" type="text" bind:value={name} />
    </label>
    <label class="row">
      <span>{t('fieldGroup')}</span>
      <select class="input" bind:value={groupId}>
        {#each groups as group (group.id)}
          <option value={group.id}>{group.icon} {group.name}</option>
        {/each}
      </select>
    </label>
    {#if existing}
      <p class="note warn">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        {t('popupExists', favoriteName(existing), existingGroup?.name ?? '?')}
      </p>
    {:else}
      <Button variant="primary" icon="fa-solid fa-plus" busy={saving} onclick={add}>{t('popupAdd')}</Button>
    {/if}
    {#if error}<p class="note warn">{error}</p>{/if}
  {/if}

  <footer>
    <Button variant="ghost" icon="fa-solid fa-table-cells" onclick={openNewtab}>{t('popupOpen')}</Button>
    <Button variant="ghost" icon="fa-solid fa-heart" onclick={() => chrome.tabs.create({ url: chrome.runtime.getURL('donate/index.html') })}>{t('donate')}</Button>
  </footer>
</div>

<style>
  :global(body) {
    width: 380px;
  }

  .popup {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
  }

  header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: var(--fs-large);
  }

  header img {
    width: 24px;
    height: 24px;
  }

  .stats {
    margin-left: auto;
    color: var(--text-faint);
    font-size: var(--fs-small);
    font-weight: 400;
  }

  .page {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-s);
    background: var(--surface-hover);
  }

  .favicon {
    width: 20px;
    height: 20px;
  }

  .url {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
    font-size: var(--fs-small);
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row > span {
    color: var(--text-muted);
  }

  .note {
    margin: 0;
    color: var(--text-muted);
  }

  .warn i {
    color: var(--warning);
  }

  .done {
    margin: 8px 0;
    font-size: var(--fs-large);
  }

  .done i {
    color: var(--success);
  }

  footer {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--line);
    padding-top: 8px;
  }
</style>
