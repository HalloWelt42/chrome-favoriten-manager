<script lang="ts">
  /**
   * Suche über alle Favoriten; zugleich Adresszeile und Websuche.
   * Live-Suche filtert das Raster und zeigt die besten Treffer darunter.
   */
  import { normalizeInputUrl } from '../../domain/urls';
  import { favoriteName } from '../../domain/views';
  import { t } from '../../i18n';
  import FavIcon from '../../ui/FavIcon.svelte';
  import { app } from '../state.svelte';

  const MAX_SUGGESTIONS = 8;

  let input: HTMLInputElement | undefined = $state();
  let focused = $state(false);
  let selected = $state(0);

  const instant = $derived(app.settings.search.instantSearch);
  const trimmed = $derived(app.searchText.trim());
  const looksLikeUrl = $derived(/^\S+\.\S+$/.test(trimmed) || /^[a-z]+:\/\//i.test(trimmed) || /^localhost(:\d+)?/i.test(trimmed));
  const hits = $derived(instant ? app.searchHits.slice(0, MAX_SUGGESTIONS) : []);

  interface Option {
    kind: 'favorite' | 'url' | 'web';
    run: (event: KeyboardEvent | MouseEvent) => void;
  }

  const options = $derived.by<Option[]>(() => {
    if (!trimmed) return [];
    const list: Option[] = [];
    const url = looksLikeUrl ? normalizeInputUrl(trimmed) : null;
    if (url) list.push({ kind: 'url', run: () => void (window.location.href = url) });
    for (const hit of hits) list.push({ kind: 'favorite', run: (e) => app.openFavorite(hit.favorite, e) });
    list.push({ kind: 'web', run: () => void chrome.search.query({ text: trimmed, disposition: 'CURRENT_TAB' }) });
    return list;
  });

  const open = $derived(focused && trimmed.length > 0);

  $effect(() => {
    void options.length;
    selected = 0;
  });

  $effect(() => {
    // Neue Suche beginnt auf der ersten Seite.
    void app.searchText;
    app.page = 0;
  });

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && open) {
      event.preventDefault();
      selected = Math.min(selected + 1, options.length - 1);
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      selected = Math.max(selected - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      options[selected]?.run(event);
    } else if (event.key === 'Escape') {
      app.searchText = '';
      input?.blur();
    }
  }
</script>

<div class="search" class:open>
  <i class="fa-solid fa-magnifying-glass lead" aria-hidden="true"></i>
  <input
    id="search-input"
    bind:this={input}
    bind:value={app.searchText}
    type="text"
    autocomplete="off"
    spellcheck="false"
    placeholder={t('searchPlaceholder')}
    aria-label={t('searchPlaceholder')}
    onfocus={() => (focused = true)}
    onblur={() => setTimeout(() => (focused = false), 150)}
    {onkeydown}
  />
  {#if app.searchText}
    <button class="clear" title={t('searchClear')} aria-label={t('searchClear')} onclick={() => { app.searchText = ''; input?.focus(); }}>
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  {/if}

  {#if open}
    <ul class="dropdown" role="listbox">
      {#each options as option, index (index)}
        <li role="option" aria-selected={index === selected}>
          <button class:selected={index === selected} onmouseenter={() => (selected = index)} onmousedown={(e) => { e.preventDefault(); option.run(e); }}>
            {#if option.kind === 'favorite'}
              {@const hit = hits[index - (options[0]?.kind === 'url' ? 1 : 0)]!}
              <span class="thumb"><FavIcon iconRef={hit.favorite.icon.ref} name={favoriteName(hit.favorite)} seed={hit.favorite.url} /></span>
              <span class="main">
                <span class="name">{favoriteName(hit.favorite)}</span>
                <span class="sub">{hit.favorite.url}</span>
              </span>
              {#if hit.group}<span class="group">{hit.group.icon} {hit.group.name}</span>{/if}
            {:else if option.kind === 'url'}
              <span class="thumb icon"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              <span class="main"><span class="name">{t('searchOpenUrl', trimmed)}</span></span>
            {:else}
              <span class="thumb icon"><i class="fa-solid fa-globe" aria-hidden="true"></i></span>
              <span class="main"><span class="name">{t('searchWeb', trimmed)}</span></span>
            {/if}
          </button>
        </li>
      {/each}
      {#if instant && app.searchHits.length > MAX_SUGGESTIONS}
        <li class="more">{t('searchMoreInGrid', app.searchHits.length)}</li>
      {/if}
    </ul>
  {/if}
</div>

<style>
  .search {
    position: relative;
    width: min(680px, 100%);
    z-index: 20;
  }

  .lead {
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-faint);
    pointer-events: none;
  }

  input {
    width: 100%;
    height: 52px;
    padding: 0 48px;
    border-radius: 26px;
    border: 1px solid var(--line);
    background: var(--surface);
    backdrop-filter: var(--glass);
    color: var(--text);
    font-size: var(--fs-large);
    transition: border-color var(--t-fast), box-shadow var(--t-fast);
  }

  input::placeholder {
    color: var(--text-faint);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
  }

  .clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-faint);
  }

  .clear:hover {
    color: var(--text);
    background: var(--surface-hover);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 6px;
    list-style: none;
    border-radius: var(--radius-l);
    background: var(--surface-solid);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow);
  }

  .dropdown button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: var(--radius-m);
    background: transparent;
    text-align: left;
  }

  .dropdown button.selected {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .thumb {
    flex: none;
    width: 32px;
    height: 32px;
    --fav-icon-size: 32px;
  }

  .thumb.icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
  }

  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
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

  .group {
    flex: none;
    max-width: 30%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 10px;
    border-radius: 12px;
    background: var(--surface-hover);
    color: var(--text-muted);
    font-size: var(--fs-small);
  }

  .more {
    padding: 8px 12px 4px;
    color: var(--text-faint);
    font-size: var(--fs-small);
  }
</style>
