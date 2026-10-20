<script lang="ts">
  /**
   * Sichern, Einspielen, Ausgeben. Einspielen zeigt immer erst, was passieren wird;
   * vor dem Ersetzen entsteht automatisch ein Sicherungsstand.
   */
  import * as commands from '../../app/commands';
  import { appVersion, assetStore, repository } from '../../app/services';
  import { createBackup, ImportError, parseImportFile, parseUrlList, planMerge, type ImportCandidate } from '../../data/backup';
  import { EXPORT_FORMATS, exportLibrary, type ExportFormat } from '../../data/exporters';
  import { formatNumber, t, type MessageKey } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { downloadText } from '../../ui/download';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';

  const FORMAT_LABELS: Record<ExportFormat, MessageKey> = {
    html: 'exportHtml',
    csv: 'exportCsv',
    markdown: 'exportMarkdown',
    opml: 'exportOpml',
    text: 'exportText'
  };

  let fileInput: HTMLInputElement | undefined = $state();
  let pending = $state<ImportCandidate | null>(null);
  let urlText = $state('');
  let targetGroup = $state(app.currentGroup?.id ?? '');
  let useFolders = $state(true);
  let busy = $state(false);
  let confirmReset = $state(false);

  const plan = $derived(
    pending?.kind === 'bookmarks' && app.library ? planMerge(app.library, pending.items, targetGroup, useFolders) : null
  );
  const hasFolders = $derived(pending?.kind === 'bookmarks' && pending.items.some((i) => i.folder.length > 0));
  const newGroups = $derived(plan ? plan.targets.filter((tg) => tg.createName).length : 0);

  async function saveBackup(): Promise<void> {
    busy = true;
    try {
      await app.commitSettings();
      const backup = await createBackup(await repository.load(), assetStore, appVersion());
      downloadText(JSON.stringify(backup), `favgrid-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      toasts.show(t('toastBackupSaved'));
    } catch (error) {
      console.warn('[FavGrid]', error);
      toasts.error(t('errorGeneric'));
    } finally {
      busy = false;
    }
  }

  async function onFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      pending = parseImportFile(await file.text(), file.name);
      if (pending.kind === 'bookmarks' && pending.items.length === 0) {
        pending = null;
        toasts.error(t('importNothingFound'));
      }
    } catch (error) {
      pending = null;
      const code = error instanceof ImportError ? error.code : 'unknown-format';
      toasts.error(code === 'invalid-json' ? t('importInvalidJson') : code === 'empty' ? t('importEmpty') : t('importUnknown'));
    }
  }

  function previewUrls(): void {
    const items = parseUrlList(urlText);
    if (items.length === 0) {
      toasts.error(t('importNothingFound'));
      return;
    }
    pending = { kind: 'bookmarks', items };
  }

  async function applyImport(): Promise<void> {
    if (!pending) return;
    busy = true;
    try {
      if (pending.kind === 'bookmarks' && plan) {
        await commands.mergeBookmarks(plan);
        toasts.show(t('toastImported', formatNumber(plan.added), formatNumber(plan.skipped)));
        urlText = '';
      } else if (pending.kind !== 'bookmarks') {
        await commands.replaceFromBackup(pending);
        app.selectGroup(app.groups[0]?.id ?? '', false);
        toasts.show(t('toastBackupRestored'));
      }
      pending = null;
    } catch (error) {
      console.warn('[FavGrid]', error);
      toasts.error(t('errorGeneric'));
    } finally {
      busy = false;
    }
  }

  async function exportAs(format: ExportFormat): Promise<void> {
    const file = exportLibrary(await repository.load(), format);
    downloadText(file.content, file.fileName, file.mimeType);
  }

  async function reset(): Promise<void> {
    confirmReset = false;
    await app.run(() => commands.resetEverything(), t('toastResetDone'));
    app.selectGroup(app.groups[0]?.id ?? '', false);
  }
</script>

<h3 class="settings-heading">{t('headingBackup')}</h3>
<p class="hint">{t('backupIntro')}</p>
<div class="settings-actions">
  <Button variant="primary" icon="fa-solid fa-download" {busy} title={t('backupSaveTitle')} onclick={saveBackup}>{t('backupSave')}</Button>
  <Button icon="fa-solid fa-upload" title={t('importFileTitle')} onclick={() => fileInput?.click()}>{t('importFile')}</Button>
  <Button variant="ghost" icon="fa-solid fa-clock-rotate-left" onclick={() => (app.dialog = { kind: 'snapshots' })}>{t('snapshotsTitle')}</Button>
</div>
<input bind:this={fileInput} type="file" accept=".json,.html,.htm,.txt" hidden onchange={onFile} />

{#if pending}
  <div class="preview" role="region" aria-label={t('importPreview')}>
    {#if pending.kind === 'bookmarks' && plan}
      <p><strong>{t('importBookmarksTitle')}</strong></p>
      <p>{t('importBookmarksSummary', formatNumber(pending.items.length), formatNumber(plan.added), formatNumber(plan.skipped))}</p>
      {#if hasFolders}
        <Toggle checked={useFolders} label={t('importUseFolders')} title={t('importUseFoldersTitle')} onchange={(v) => (useFolders = v)} />
        {#if useFolders && newGroups > 0}<p class="hint">{t('importNewGroups', newGroups)}</p>{/if}
      {/if}
      {#if !useFolders || !hasFolders}
        <label class="target">
          <span>{t('importTarget')}</span>
          <select class="input" bind:value={targetGroup}>
            {#each app.groups as group (group.id)}<option value={group.id}>{group.icon} {group.name}</option>{/each}
          </select>
        </label>
      {/if}
    {:else if pending.kind !== 'bookmarks'}
      <p><strong>{t('importBackupTitle')}</strong></p>
      <p>{t('importBackupSummary', formatNumber(pending.favoriteCount), pending.groupCount)}</p>
      <p class="hint">{t('importBackupReplaceHint')}</p>
    {/if}
    <div class="settings-actions">
      <Button variant="ghost" onclick={() => (pending = null)}>{t('cancel')}</Button>
      <Button variant="primary" icon="fa-solid fa-check" {busy} disabled={pending.kind === 'bookmarks' && plan?.added === 0} onclick={applyImport}>
        {pending.kind === 'bookmarks' ? t('importApplyMerge') : t('importApplyReplace')}
      </Button>
    </div>
  </div>
{/if}

<h3 class="settings-heading">{t('headingUrlList')}</h3>
<textarea class="input" rows="4" bind:value={urlText} placeholder={t('urlListPlaceholder')}></textarea>
<div class="settings-actions">
  <Button icon="fa-solid fa-list-check" disabled={!urlText.trim()} onclick={previewUrls}>{t('urlListCheck')}</Button>
</div>

<h3 class="settings-heading">{t('headingExport')}</h3>
<p class="hint">{t('exportIntro')}</p>
<div class="settings-actions">
  {#each EXPORT_FORMATS as format (format)}
    <Button icon="fa-solid fa-file-export" onclick={() => exportAs(format)}>{t(FORMAT_LABELS[format])}</Button>
  {/each}
</div>

<h3 class="settings-heading">{t('headingDanger')}</h3>
{#if confirmReset}
  <div class="preview danger">
    <p>{t('resetConfirm')}</p>
    <div class="settings-actions">
      <Button variant="ghost" onclick={() => (confirmReset = false)}>{t('cancel')}</Button>
      <Button variant="danger" onclick={reset}>{t('resetConfirmButton')}</Button>
    </div>
  </div>
{:else}
  <div class="settings-actions">
    <Button variant="danger" icon="fa-solid fa-rotate-left" title={t('resetTitle')} onclick={() => (confirmReset = true)}>{t('reset')}</Button>
  </div>
{/if}

<style>
  .preview {
    margin: 8px 0;
    padding: 12px 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .preview.danger {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 8%, transparent);
  }

  .preview p {
    margin: 0 0 8px;
  }

  .target {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 6px 0;
  }

  textarea {
    font-family: ui-monospace, monospace;
    font-size: var(--fs-small);
  }
</style>
