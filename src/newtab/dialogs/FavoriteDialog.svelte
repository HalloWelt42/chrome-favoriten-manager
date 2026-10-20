<script lang="ts">
  import { untrack } from 'svelte';
  import * as commands from '../../app/commands';
  import { fetchPageInfo } from '../../app/pageInfo';
  import type { Favorite } from '../../domain/types';
  import { duplicateKey, normalizeInputUrl } from '../../domain/urls';
  import { favoriteName } from '../../domain/views';
  import { t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';
  import IconEditor from './IconEditor.svelte';
  import { persistIconDraft, type IconDraft } from './iconDraft';

  interface Props {
    favoriteId: string | null;
    groupId: string;
    focusIcons?: boolean;
  }

  let { favoriteId, groupId, focusIcons = false }: Props = $props();

  const existing: Favorite | null = app.library?.favorites.find((f) => f.id === favoriteId) ?? null;

  let url = $state(existing?.url ?? '');
  let alias = $state(existing?.alias ?? '');
  let description = $state(existing?.description ?? '');
  let tags = $state(existing?.tags.join(', ') ?? '');
  let targetGroup = $state(existing?.groupId ?? untrack(() => groupId));
  let draft = $state<IconDraft>({ kind: 'keep' });
  let saving = $state(false);
  let titleLoading = $state(false);

  const normalizedUrl = $derived(normalizeInputUrl(url));
  const duplicate = $derived.by(() => {
    if (!normalizedUrl || !app.library) return null;
    const key = duplicateKey(normalizedUrl);
    return app.library.favorites.find((f) => f.id !== favoriteId && duplicateKey(f.url) === key) ?? null;
  });
  const duplicateGroup = $derived(duplicate ? app.groups.find((g) => g.id === duplicate.groupId) : undefined);

  async function fillFromPage(): Promise<void> {
    if (!normalizedUrl || !app.siteAccess || alias.trim()) return;
    titleLoading = true;
    try {
      const info = await fetchPageInfo(normalizedUrl, new AbortController().signal);
      if (info && !alias.trim()) alias = info.title;
      if (info && !description.trim()) description = info.description;
    } finally {
      titleLoading = false;
    }
  }

  async function save(): Promise<void> {
    if (!normalizedUrl) {
      toasts.error(t('errorInvalidUrl'));
      return;
    }
    saving = true;
    try {
      // Neue Adresse mit automatischem Icon: das alte Icon gehört zur alten Seite.
      const urlChanged = !!existing && duplicateKey(existing.url) !== duplicateKey(normalizedUrl);
      const effectiveDraft: IconDraft = urlChanged && draft.kind === 'keep' && existing?.icon.mode === 'auto' ? { kind: 'auto' } : draft;
      const icon = await persistIconDraft(effectiveDraft);
      const fields = {
        url: normalizedUrl,
        alias: alias.trim(),
        description: description.trim(),
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        groupId: targetGroup
      };
      if (existing) {
        await commands.updateFavorite(existing.id, icon ? { ...fields, icon } : fields);
        toasts.show(t('toastFavoriteSaved'));
      } else {
        const created = await commands.addFavorite(icon ? { ...fields, icon } : fields);
        toasts.show(t('toastFavoriteAdded'));
        if (!icon) app.autoIcons.enqueue([created], true);
      }
      if (existing && effectiveDraft.kind === 'auto') {
        const updated = app.library?.favorites.find((f) => f.id === existing.id);
        if (updated) app.autoIcons.enqueue([{ ...updated, icon: { mode: 'auto', ref: null, origin: null, checkedAt: null } }], true);
      }
      app.closeDialog();
    } catch (error) {
      console.warn('[FavGrid]', error);
      toasts.error(t('errorGeneric'));
    } finally {
      saving = false;
    }
  }

  function onsubmit(event: SubmitEvent): void {
    event.preventDefault();
    void save();
  }
</script>

<Dialog
  title={existing ? t('editFavorite') : t('addFavorite')}
  icon={existing ? 'fa-solid fa-pen' : 'fa-solid fa-plus'}
  width="l"
  onclose={() => app.closeDialog()}
>
  <form id="favorite-form" class="form" {onsubmit}>
    <label class="row">
      <span>{t('fieldUrl')}</span>
      <input class="input" type="text" bind:value={url} onblur={fillFromPage} placeholder="https://" data-autofocus={!focusIcons || undefined} required />
    </label>
    {#if duplicate}
      <p class="warning">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        {t('duplicateWarning', favoriteName(duplicate), duplicateGroup?.name ?? '?')}
      </p>
    {/if}
    <label class="row">
      <span>{t('fieldName')}{#if titleLoading}<i class="fa-solid fa-spinner fa-spin loading" aria-hidden="true"></i>{/if}</span>
      <input class="input" type="text" bind:value={alias} placeholder={normalizedUrl ? favoriteName({ alias: '', url: normalizedUrl } as Favorite) : ''} />
    </label>
    <div class="two">
      <label class="row">
        <span>{t('fieldGroup')}</span>
        <select class="input" bind:value={targetGroup}>
          {#each app.groups as group (group.id)}
            <option value={group.id}>{group.icon} {group.name}</option>
          {/each}
        </select>
      </label>
      <label class="row" title={t('fieldTagsTitle')}>
        <span>{t('fieldTags')}</span>
        <input class="input" type="text" bind:value={tags} placeholder={t('fieldTagsPlaceholder')} />
      </label>
    </div>
    <label class="row">
      <span>{t('fieldDescription')}</span>
      <textarea class="input" rows="2" bind:value={description}></textarea>
    </label>
    <div class="row">
      <span>{t('fieldIcon')}</span>
      <IconEditor url={url} name={alias || (normalizedUrl ?? url)} current={existing?.icon ?? null} bind:draft autoScan={focusIcons} />
    </div>
  </form>

  {#snippet footer()}
    {#if existing}
      <Button variant="danger" icon="fa-regular fa-trash-can" onclick={() => { app.closeDialog(); void app.trashFavorites([existing.id]); }}>{t('menuTrash')}</Button>
      <span class="spacer"></span>
    {/if}
    <Button variant="ghost" onclick={() => app.closeDialog()}>{t('cancel')}</Button>
    <Button variant="primary" icon="fa-solid fa-check" busy={saving} onclick={save}>{t('save')}</Button>
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .row > span {
    color: var(--text-muted);
  }

  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 14px;
  }

  .warning {
    margin: -4px 0 0;
    padding: 8px 12px;
    border-radius: var(--radius-s);
    background: color-mix(in srgb, var(--warning) 14%, transparent);
    color: var(--text);
  }

  .warning i {
    color: var(--warning);
    margin-right: 6px;
  }

  .loading {
    margin-left: 8px;
    color: var(--accent);
  }

  .spacer {
    flex: 1;
  }
</style>
