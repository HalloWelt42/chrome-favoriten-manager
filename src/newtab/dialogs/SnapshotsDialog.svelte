<script lang="ts">
  /**
   * Sicherungsstände: automatisch angelegte Kopien der ganzen Sammlung. Zurückholen ersetzt
   * den jetzigen Stand, der vorher selbst als Stand gesichert wird; es geht also nichts verloren.
   */
  import { onMount } from 'svelte';
  import * as commands from '../../app/commands';
  import { listSnapshots, type SnapshotInfo, type SnapshotReason } from '../../data/snapshots';
  import { formatDateTime, formatNumber, t, type MessageKey } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import ListPager from '../../ui/ListPager.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';

  const PAGE_SIZE = 25;
  const REASONS: Record<SnapshotReason, MessageKey> = {
    auto: 'snapshotAuto',
    migration: 'snapshotMigration',
    'before-import': 'snapshotBeforeImport',
    'before-restore': 'snapshotBeforeRestore',
    'before-purge': 'snapshotBeforePurge',
    'before-reset': 'snapshotBeforeReset',
    manual: 'snapshotManual'
  };

  let snapshots = $state<SnapshotInfo[]>([]);
  let loading = $state(true);
  let page = $state(0);
  let confirmId = $state<string | null>(null);
  let busy = $state(false);

  const visible = $derived(snapshots.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));

  async function reload(): Promise<void> {
    loading = true;
    snapshots = await listSnapshots();
    loading = false;
  }

  onMount(() => {
    void reload();
  });

  async function createNow(): Promise<void> {
    busy = true;
    await app.run(() => commands.createManualSnapshot(), t('toastSnapshotCreated'));
    busy = false;
    await reload();
  }

  async function restore(id: string): Promise<void> {
    busy = true;
    confirmId = null;
    const result = await app.run(() => commands.restoreSnapshot(id));
    busy = false;
    if (result) {
      toasts.show(t('toastSnapshotRestored'));
      app.selectGroup(app.groups[0]?.id ?? '', false);
      await reload();
    }
  }

  function size(bytes: number): string {
    return bytes > 1024 * 1024 ? `${formatNumber(Math.round(bytes / 104857.6) / 10)} MB` : `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;
  }
</script>

<Dialog title={t('snapshotsTitle')} icon="fa-solid fa-clock-rotate-left" width="l" onclose={() => app.closeDialog()}>
  <p class="intro">{t('snapshotsIntro')}</p>
  {#if loading}
    <p class="hint"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i></p>
  {:else if snapshots.length === 0}
    <p class="hint">{t('snapshotsEmpty')}</p>
  {:else}
    <ul class="list">
      {#each visible as snap (snap.id)}
        <li>
          <span class="when">{formatDateTime(snap.createdAt)}</span>
          <span class="reason" class:special={snap.reason !== 'auto'}>{t(REASONS[snap.reason])}</span>
          <span class="counts">{t('snapshotCounts', formatNumber(snap.favoriteCount), snap.groupCount)}</span>
          <span class="size">{size(snap.bytes)}</span>
          {#if confirmId === snap.id}
            <span class="confirm">
              <Button variant="ghost" onclick={() => (confirmId = null)}>{t('cancel')}</Button>
              <Button variant="primary" {busy} onclick={() => restore(snap.id)}>{t('snapshotRestoreConfirm')}</Button>
            </span>
          {:else}
            <Button icon="fa-solid fa-rotate-left" title={t('snapshotRestoreTitle')} disabled={busy} onclick={() => (confirmId = snap.id)}>{t('restore')}</Button>
          {/if}
        </li>
      {/each}
    </ul>
    <ListPager {page} total={snapshots.length} pageSize={PAGE_SIZE} onpage={(p) => (page = p)} />
  {/if}
  {#snippet footer()}
    <Button icon="fa-solid fa-camera" {busy} title={t('snapshotNowTitle')} onclick={createNow}>{t('snapshotNow')}</Button>
    <span class="spacer"></span>
    <Button variant="primary" onclick={() => app.closeDialog()}>{t('close')}</Button>
  {/snippet}
</Dialog>

<style>
  .intro {
    margin: 0 0 14px;
    color: var(--text-muted);
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: minmax(150px, auto) minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 14px;
    padding: 8px 10px;
    border-radius: var(--radius-s);
  }

  li:hover {
    background: var(--surface-hover);
  }

  .reason {
    color: var(--text-muted);
  }

  .reason.special {
    color: var(--text);
    font-weight: 500;
  }

  .counts,
  .size {
    color: var(--text-faint);
    font-size: var(--fs-small);
    font-variant-numeric: tabular-nums;
  }

  .confirm {
    display: flex;
    gap: 6px;
  }

  .spacer {
    flex: 1;
  }
</style>
