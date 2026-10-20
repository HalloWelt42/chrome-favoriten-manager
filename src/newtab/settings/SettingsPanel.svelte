<script lang="ts">
  /** Einstellungen als feste Leiste rechts; das Raster bleibt sichtbar und zeigt jede Änderung sofort. */
  import { t, type MessageKey } from '../../i18n';
  import { app } from '../state.svelte';
  import AboutSection from './AboutSection.svelte';
  import AppearanceSection from './AppearanceSection.svelte';
  import BehaviorSection from './BehaviorSection.svelte';
  import DataSection from './DataSection.svelte';
  import GridSection from './GridSection.svelte';
  import IconsSection from './IconsSection.svelte';
  import LabelsSection from './LabelsSection.svelte';

  type Section = 'appearance' | 'grid' | 'labels' | 'behavior' | 'icons' | 'data' | 'about';

  const SECTIONS: { id: Section; label: MessageKey; icon: string }[] = [
    { id: 'appearance', label: 'sectionAppearance', icon: 'fa-solid fa-palette' },
    { id: 'grid', label: 'sectionGrid', icon: 'fa-solid fa-table-cells' },
    { id: 'labels', label: 'sectionLabels', icon: 'fa-solid fa-font' },
    { id: 'behavior', label: 'sectionBehavior', icon: 'fa-solid fa-hand-pointer' },
    { id: 'icons', label: 'sectionIcons', icon: 'fa-regular fa-image' },
    { id: 'data', label: 'sectionData', icon: 'fa-solid fa-database' },
    { id: 'about', label: 'sectionAbout', icon: 'fa-solid fa-circle-info' }
  ];

  let section = $state<Section>('appearance');

  async function close(): Promise<void> {
    await app.commitSettings();
    app.settingsOpen = false;
  }
</script>

<aside class="panel" aria-label={t('settings')}>
  <header>
    <i class="fa-solid fa-gear" aria-hidden="true"></i>
    <h2>{t('settings')}</h2>
    <button type="button" class="close" title={t('close')} aria-label={t('close')} onclick={close}>
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  </header>
  <nav class="tabs">
    {#each SECTIONS as s (s.id)}
      <button type="button" class:active={section === s.id} onclick={() => (section = s.id)}>
        <i class={s.icon} aria-hidden="true"></i>
        <span>{t(s.label)}</span>
      </button>
    {/each}
  </nav>
  <div class="content">
    {#if section === 'appearance'}<AppearanceSection />
    {:else if section === 'grid'}<GridSection />
    {:else if section === 'labels'}<LabelsSection />
    {:else if section === 'behavior'}<BehaviorSection />
    {:else if section === 'icons'}<IconsSection />
    {:else if section === 'data'}<DataSection />
    {:else}<AboutSection />{/if}
  </div>
</aside>

<style>
  .panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    width: min(480px, 45vw);
    background: var(--surface-solid);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    animation: slide var(--t-med);
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px 10px;
  }

  header > i {
    color: var(--accent);
  }

  h2 {
    flex: 1;
    margin: 0;
    font-size: var(--fs-large);
    font-weight: 600;
  }

  .close {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text-muted);
    font-size: 18px;
  }

  .close:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 18px 12px;
    border-bottom: 1px solid var(--line);
  }

  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-muted);
  }

  .tabs button:hover {
    color: var(--text);
    background: var(--surface-hover);
  }

  .tabs button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-contrast);
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px 18px 24px;
  }

  @keyframes slide {
    from { transform: translateX(30px); opacity: 0; }
  }
</style>
