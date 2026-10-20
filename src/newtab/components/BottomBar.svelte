<script lang="ts">
  import { appVersion } from '../../app/services';
  import { SORT_MODES } from '../../domain/settingsSpec';
  import type { SortMode } from '../../domain/types';
  import { t, type MessageKey } from '../../i18n';
  import IconButton from '../../ui/IconButton.svelte';
  import { menu } from '../../ui/menu.svelte';
  import { app } from '../state.svelte';

  const SORT_LABELS: Record<SortMode, MessageKey> = {
    manual: 'sortManual',
    'name-asc': 'sortNameAsc',
    'name-desc': 'sortNameDesc',
    'date-desc': 'sortNewest',
    'date-asc': 'sortOldest',
    'visits-desc': 'sortVisits'
  };

  function openSortMenu(event: MouseEvent): void {
    menu.open(
      event,
      SORT_MODES.map((mode) => ({
        label: t(SORT_LABELS[mode]),
        icon: mode === app.settings.view.sort ? 'fa-solid fa-check' : 'fa-regular fa-circle',
        run: () => {
          app.patchSettings({ view: { sort: mode } });
          app.page = 0;
        }
      }))
    );
  }

  function toggleTheme(): void {
    app.patchSettings({ theme: app.theme === 'dark' ? 'light' : 'dark' });
  }

  function toggleSettings(): void {
    if (app.settingsOpen) void app.commitSettings();
    app.settingsOpen = !app.settingsOpen;
  }
</script>

<footer class="bottombar">
  <div class="tools">
    <IconButton icon="fa-solid fa-gear" title={t('settings')} active={app.settingsOpen} onclick={toggleSettings} />
    <IconButton
      icon="fa-solid fa-arrow-down-wide-short"
      title={t('sortTitle', t(SORT_LABELS[app.settings.view.sort]))}
      active={app.settings.view.sort !== 'manual'}
      onclick={openSortMenu}
    />
    <IconButton icon={app.theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon'} title={t('themeToggle')} onclick={toggleTheme} />
    <IconButton icon="fa-solid fa-right-left" title={t('managerTitle')} onclick={() => (app.dialog = { kind: 'manager', tab: 'move' })} />
    <IconButton icon="fa-regular fa-trash-can" title={t('trashTitle')} badge={app.trashCount} onclick={() => (app.dialog = { kind: 'trash' })} />
  </div>
  <div class="status">
    {#if app.autoIconPending > 0}
      <span class="progress" title={t('iconSearchRunningTitle')}>
        <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
        {t('iconSearchRunning', app.autoIconPending)}
      </span>
    {/if}
    <span class="version" title={t('versionTitle')}>{appVersion()}</span>
  </div>
</footer>

<style>
  .bottombar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding-top: 6px;
  }

  .tools {
    display: flex;
    gap: 8px;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--label-color);
    font-size: var(--fs-small);
  }

  .progress,
  .version {
    padding: 4px 10px;
    border-radius: var(--radius-s);
    background: var(--surface);
    backdrop-filter: var(--glass);
    color: var(--text-muted);
  }

  .progress i {
    color: var(--accent);
    margin-right: 4px;
  }
</style>
