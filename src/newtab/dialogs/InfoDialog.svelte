<script lang="ts">
  import { favoriteName } from '../../domain/views';
  import { formatDateTime, t, type MessageKey } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import FavIcon from '../../ui/FavIcon.svelte';
  import { editFavorite } from '../menus';
  import { app } from '../state.svelte';

  interface Props {
    favoriteId: string;
  }

  let { favoriteId }: Props = $props();
  const fav = $derived(app.library?.favorites.find((f) => f.id === favoriteId));
  const group = $derived(fav ? app.groups.find((g) => g.id === fav.groupId) : undefined);

  const SOURCE_LABELS: Record<string, MessageKey> = { manual: 'sourceManual', browser: 'sourceBrowser', import: 'sourceImport' };
</script>

<Dialog title={t('infoTitle')} icon="fa-solid fa-circle-info" width="m" onclose={() => app.closeDialog()}>
  {#if fav}
    <div class="head">
      <span class="icon"><FavIcon iconRef={fav.icon.ref} name={favoriteName(fav)} seed={fav.url} /></span>
      <div>
        <h3>{favoriteName(fav)}</h3>
        <a href={fav.url} target="_blank" rel="noreferrer">{fav.url}</a>
      </div>
    </div>
    <dl>
      {#if fav.description}<dt>{t('fieldDescription')}</dt><dd>{fav.description}</dd>{/if}
      {#if fav.tags.length}<dt>{t('fieldTags')}</dt><dd>{fav.tags.join(', ')}</dd>{/if}
      <dt>{t('fieldGroup')}</dt><dd>{group ? `${group.icon} ${group.name}` : '-'}</dd>
      <dt>{t('infoAdded')}</dt><dd>{formatDateTime(fav.createdAt)}</dd>
      <dt>{t('infoChanged')}</dt><dd>{formatDateTime(fav.updatedAt)}</dd>
      <dt>{t('infoVisits')}</dt><dd>{fav.visitCount}</dd>
      <dt>{t('infoLastVisit')}</dt><dd>{fav.lastVisited ? formatDateTime(fav.lastVisited) : '-'}</dd>
      <dt>{t('infoSource')}</dt><dd>{t(SOURCE_LABELS[fav.source] ?? 'sourceManual')}</dd>
    </dl>
  {/if}
  {#snippet footer()}
    {#if fav}<Button icon="fa-solid fa-pen" onclick={() => editFavorite(fav)}>{t('menuEdit')}</Button>{/if}
    <Button variant="primary" onclick={() => app.closeDialog()}>{t('close')}</Button>
  {/snippet}
</Dialog>

<style>
  .head {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
  }

  .icon {
    flex: none;
    width: 56px;
    height: 56px;
    --fav-icon-size: 56px;
  }

  h3 {
    margin: 0 0 4px;
    font-size: var(--fs-large);
  }

  a {
    color: var(--accent);
    word-break: break-all;
  }

  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 18px;
    margin: 0;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    word-break: break-word;
  }
</style>
