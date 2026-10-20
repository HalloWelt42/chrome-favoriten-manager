<script lang="ts">
  import { appVersion } from '../../app/services';
  import { t } from '../../i18n';
  import Button from '../../ui/Button.svelte';

  const SHORTCUTS: [string, Parameters<typeof t>[0]][] = [
    ['/', 'shortcutSearch'],
    ['← →', 'shortcutPages'],
    ['1 - 9', 'shortcutOpen'],
    ['Esc', 'shortcutEscape']
  ];
</script>

<h3 class="settings-heading">FavGrid</h3>
<p class="version">{t('aboutVersion', appVersion())}</p>
<p class="hint">{t('aboutPrivacy')}</p>

<h3 class="settings-heading">{t('headingShortcuts')}</h3>
<dl>
  {#each SHORTCUTS as [keys, label] (keys)}
    <dt><kbd>{keys}</kbd></dt>
    <dd>{t(label)}</dd>
  {/each}
  <dt><kbd>{t('mouseMiddle')}</kbd></dt>
  <dd>{t('shortcutMiddle')}</dd>
</dl>

<h3 class="settings-heading">{t('headingSupport')}</h3>
<p class="hint">{t('aboutDonate')}</p>
<div class="settings-actions">
  <Button icon="fa-solid fa-heart" onclick={() => chrome.tabs.create({ url: chrome.runtime.getURL('donate/index.html') })}>{t('donate')}</Button>
</div>

<style>
  .version {
    margin: 4px 0;
    font-variant-numeric: tabular-nums;
  }

  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 14px;
    margin: 6px 0;
    align-items: center;
  }

  dd {
    margin: 0;
    color: var(--text-muted);
  }

  kbd {
    display: inline-block;
    min-width: 30px;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid var(--line-strong);
    background: var(--surface-raised);
    font-family: inherit;
    text-align: center;
  }
</style>
