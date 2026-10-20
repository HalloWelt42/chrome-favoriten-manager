<script lang="ts">
  import { untrack } from 'svelte';
  import * as commands from '../../app/commands';
  import { favoritesOfGroup } from '../../domain/library';
  import { t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import Segmented from '../../ui/Segmented.svelte';
  import { app } from '../state.svelte';
  import DuplicatesView from './DuplicatesView.svelte';
  import ManagerPanel from './ManagerPanel.svelte';

  interface Props {
    tab: 'move' | 'duplicates';
  }

  let { tab: initialTab }: Props = $props();
  let tab = $state(untrack(() => initialTab));

  let leftId = $state(app.currentGroup?.id ?? app.groups[0]?.id ?? '');
  let rightId = $state(untrack(() => app.groups.find((g) => g.id !== leftId)?.id ?? leftId));
  let leftSel = $state(new Set<string>());
  let rightSel = $state(new Set<string>());

  const leftItems = $derived(app.library ? favoritesOfGroup(app.library, leftId) : []);
  const rightItems = $derived(app.library ? favoritesOfGroup(app.library, rightId) : []);
  const leftName = $derived(app.groups.find((g) => g.id === leftId)?.name ?? '');
  const rightName = $derived(app.groups.find((g) => g.id === rightId)?.name ?? '');

  async function move(ids: string[], to: string, toName: string): Promise<void> {
    if (ids.length === 0) return;
    await app.run(() => commands.moveFavorites(ids, to), t('toastMovedManyTo', ids.length, toName));
    leftSel = new Set();
    rightSel = new Set();
  }

  async function trashSelected(): Promise<void> {
    const ids = [...leftSel, ...rightSel];
    leftSel = new Set();
    rightSel = new Set();
    await app.trashFavorites(ids);
  }
</script>

<Dialog title={t('managerTitle')} icon="fa-solid fa-right-left" width="xl" onclose={() => app.closeDialog()}>
  {#snippet headerExtra()}
    <Segmented
      label={t('managerTitle')}
      value={tab}
      options={[
        { value: 'move', label: t('managerTabMove'), icon: 'fa-solid fa-right-left' },
        { value: 'duplicates', label: t('managerTabDuplicates'), icon: 'fa-regular fa-clone' }
      ]}
      onchange={(v) => (tab = v)}
    />
  {/snippet}

  {#if tab === 'move'}
    <p class="intro">{t('managerIntro')}</p>
    <div class="columns">
      <ManagerPanel groupId={leftId} items={leftItems} selected={leftSel} onselect={(s) => (leftSel = s)} ongroup={(id) => { leftId = id; leftSel = new Set(); }} ondrop={(ids) => move(ids, leftId, leftName)} />
      <div class="middle">
        <Button icon="fa-solid fa-arrow-right" disabled={leftSel.size === 0 || leftId === rightId} title={t('moveSelectedRight')} onclick={() => move([...leftSel], rightId, rightName)}>{leftSel.size || ''}</Button>
        <Button icon="fa-solid fa-arrow-left" disabled={rightSel.size === 0 || leftId === rightId} title={t('moveSelectedLeft')} onclick={() => move([...rightSel], leftId, leftName)}>{rightSel.size || ''}</Button>
      </div>
      <ManagerPanel groupId={rightId} items={rightItems} selected={rightSel} onselect={(s) => (rightSel = s)} ongroup={(id) => { rightId = id; rightSel = new Set(); }} ondrop={(ids) => move(ids, rightId, rightName)} />
    </div>
  {:else}
    <DuplicatesView />
  {/if}

  {#snippet footer()}
    {#if tab === 'move'}
      <Button variant="danger" icon="fa-regular fa-trash-can" disabled={leftSel.size + rightSel.size === 0} onclick={trashSelected}>
        {t('trashSelected', leftSel.size + rightSel.size)}
      </Button>
      <span class="spacer"></span>
    {/if}
    <Button variant="primary" onclick={() => app.closeDialog()}>{t('close')}</Button>
  {/snippet}
</Dialog>

<style>
  .intro {
    margin: 0 0 12px;
    color: var(--text-muted);
  }

  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 12px;
    height: min(62vh, 640px);
  }

  .middle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  .spacer {
    flex: 1;
  }
</style>
