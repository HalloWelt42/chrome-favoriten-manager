<script lang="ts">
  import { onMount } from 'svelte';
  import { UI_SCALE_PX } from '../domain/settingsSpec';
  import { t } from '../i18n';
  import ContextMenu from '../ui/ContextMenu.svelte';
  import { menu } from '../ui/menu.svelte';
  import ToastHost from '../ui/ToastHost.svelte';
  import AccessHint from './components/AccessHint.svelte';
  import Background from './components/Background.svelte';
  import BottomBar from './components/BottomBar.svelte';
  import DialogHost from './components/DialogHost.svelte';
  import FavoriteGrid from './components/FavoriteGrid.svelte';
  import GroupBar from './components/GroupBar.svelte';
  import PageNav from './components/PageNav.svelte';
  import SearchBox from './components/SearchBox.svelte';
  import SettingsPanel from './settings/SettingsPanel.svelte';
  import { useKeyboard } from './keyboard';
  import { app } from './state.svelte';

  let failed = $state(false);

  onMount(() => {
    app.init().catch((error: unknown) => {
      console.warn('[FavGrid]', error);
      failed = true;
    });
    return useKeyboard();
  });

  function contrastText(hex: string): string {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    return lum > 0.6 ? '#111111' : '#ffffff';
  }

  function hexToRgba(hex: string, alpha: number): string {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const LABEL_FONTS = {
    barlow: "'Barlow', system-ui, sans-serif",
    system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  } as const;

  // Einstellungen als CSS-Variablen an die Wurzel; alles Weitere liest nur Variablen.
  $effect(() => {
    if (!app.library) return;
    const s = app.settings;
    const root = document.documentElement;
    const light = app.theme === 'light';
    root.dataset.theme = app.theme;
    const vars: Record<string, string> = {
      '--accent': s.accentColor,
      '--accent-contrast': contrastText(s.accentColor),
      '--fs-base': `${UI_SCALE_PX[s.uiScale]}px`,
      '--cols': String(s.grid.columns),
      '--rows': String(s.grid.rows),
      '--icon-size': `${s.grid.iconSize}px`,
      '--fav-icon-size': `${s.grid.iconSize}px`,
      '--grid-gap': `${s.grid.gap}px`,
      '--tile-radius': `${s.grid.borderRadius}%`,
      '--tile-bg': hexToRgba(light ? s.tiles.bgLight : s.tiles.bgDark, s.tiles.opacity / 100),
      '--tile-blur': `${s.tiles.glassBlur}px`,
      '--tile-border': String(s.tiles.glassBorder / 100),
      '--tile-shadow': String(s.tiles.glassShadow / 100),
      '--label-size': `${s.labels.fontSize}px`,
      '--label-weight': s.labels.fontWeight,
      '--label-color': light ? s.labels.colorLight : s.labels.colorDark,
      '--label-font': s.labels.font === 'custom' ? `${s.labels.customFont || 'inherit'}, system-ui, sans-serif` : LABEL_FONTS[s.labels.font]
    };
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  });
</script>

{#if app.library}
  <Background />
  <div class="app" class:with-panel={app.settingsOpen}>
    <header class="top">
      <SearchBox />
    </header>
    <GroupBar />
    {#if !app.siteAccess && app.settings.icons.autoDetect}<AccessHint />{/if}
    <main class="stage" aria-label={t('gridLabel')}>
      <FavoriteGrid />
    </main>
    <PageNav />
    <BottomBar />
  </div>
  {#if app.settingsOpen}<SettingsPanel />{/if}
  <DialogHost />
{:else if failed}
  <div class="failed">
    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
    <p>{t('errorLoading')}</p>
  </div>
{/if}
<ContextMenu />
<ToastHost />

<svelte:window onscroll={() => menu.close()} />

<style>
  .app {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 20px 28px 16px;
    transition: padding-right var(--t-med);
  }

  .app.with-panel {
    padding-right: min(480px, 45vw);
  }

  .top {
    display: flex;
    justify-content: center;
    padding-bottom: 18px;
  }

  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .failed {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100vh;
    color: var(--text-muted);
    font-size: var(--fs-large);
  }

  .failed i {
    color: var(--warning);
    font-size: 40px;
  }
</style>
