<script lang="ts">
  import { RETRY_AFTER_MS } from '../../app/autoIcons';
  import { formatNumber, t } from '../../i18n';
  import { requestSiteAccess } from '../../icons/permissions';
  import Button from '../../ui/Button.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';

  const icons = $derived(app.settings.icons);
  const stats = $derived.by(() => {
    const favs = app.library?.favorites ?? [];
    let custom = 0;
    let found = 0;
    let missing = 0;
    let open = 0;
    for (const f of favs) {
      if (f.icon.mode === 'custom') custom += 1;
      else if (f.icon.ref) found += 1;
      else if (f.icon.checkedAt) missing += 1;
      else open += 1;
    }
    return { custom, found, missing, open };
  });

  async function allow(): Promise<void> {
    app.siteAccess = await requestSiteAccess();
    if (app.siteAccess) toasts.show(t('toastSiteAccessGranted'));
  }

  async function revoke(): Promise<void> {
    await chrome.permissions.remove({ origins: ['http://*/*', 'https://*/*'] });
    app.siteAccess = false;
  }

  function searchAll(onlyMissing: boolean): void {
    const favs = (app.library?.favorites ?? []).filter((f) => f.icon.mode === 'auto' && (onlyMissing ? !f.icon.ref : true));
    // Aktuelle Gruppe zuerst, damit man das Ergebnis gleich sieht.
    favs.sort((a, b) => Number(b.groupId === app.currentGroup?.id) - Number(a.groupId === app.currentGroup?.id));
    app.autoIcons.enqueue(favs, true);
    toasts.show(t('toastIconSearchQueued', formatNumber(favs.length)), 'info');
  }
</script>

<h3 class="settings-heading">{t('headingIconSearch')}</h3>
<p class="hint">{t('iconsIntro')}</p>
<Toggle checked={icons.autoDetect} label={t('iconsAuto')} title={t('iconsAutoTitle')} onchange={(v) => app.patchSettings({ icons: { autoDetect: v } })} />
<Toggle checked={icons.useExternalServices} label={t('iconsServices')} title={t('iconsServicesTitle')} onchange={(v) => app.patchSettings({ icons: { useExternalServices: v } })} />

<div class="access" class:granted={app.siteAccess}>
  <i class={app.siteAccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-lock'} aria-hidden="true"></i>
  <span>{app.siteAccess ? t('iconsAccessGranted') : t('iconsAccessMissing')}</span>
  {#if app.siteAccess}
    <Button variant="ghost" title={t('iconsAccessRevokeTitle')} onclick={revoke}>{t('iconsAccessRevoke')}</Button>
  {:else}
    <Button variant="primary" icon="fa-solid fa-unlock" title={t('accessHintAllowTitle')} onclick={allow}>{t('accessHintAllow')}</Button>
  {/if}
</div>

<h3 class="settings-heading">{t('headingIconState')}</h3>
<dl class="stats">
  <dt>{t('iconsStatCustom')}</dt><dd>{formatNumber(stats.custom)}</dd>
  <dt>{t('iconsStatFound')}</dt><dd>{formatNumber(stats.found)}</dd>
  <dt title={t('iconsStatMissingTitle', Math.round(RETRY_AFTER_MS / 86400000))}>{t('iconsStatMissing')}</dt><dd>{formatNumber(stats.missing)}</dd>
  <dt>{t('iconsStatOpen')}</dt><dd>{formatNumber(stats.open)}</dd>
</dl>
<div class="settings-actions">
  <Button icon="fa-solid fa-magnifying-glass" title={t('iconsSearchMissingTitle')} onclick={() => searchAll(true)}>{t('iconsSearchMissing')}</Button>
  <Button variant="ghost" icon="fa-solid fa-rotate" title={t('iconsSearchAllTitle')} onclick={() => searchAll(false)}>{t('iconsSearchAll')}</Button>
</div>
{#if app.autoIconPending > 0}
  <p class="hint"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> {t('iconSearchRunning', app.autoIconPending)}</p>
{/if}

<style>
  .access {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0;
    padding: 10px 12px;
    border-radius: var(--radius-m);
    border: 1px solid color-mix(in srgb, var(--warning) 50%, transparent);
    background: color-mix(in srgb, var(--warning) 10%, transparent);
  }

  .access.granted {
    border-color: color-mix(in srgb, var(--success) 50%, transparent);
    background: color-mix(in srgb, var(--success) 10%, transparent);
  }

  .access i {
    color: var(--warning);
  }

  .access.granted i {
    color: var(--success);
  }

  .access span {
    flex: 1;
  }

  .stats {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px 12px;
    margin: 6px 0 10px;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
</style>
