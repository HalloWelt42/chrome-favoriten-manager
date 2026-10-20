<script lang="ts">
  /** Einmaliger Hinweis: ohne Zugriff auf Webseiten findet die Icon-Suche viel weniger. */
  import { t } from '../../i18n';
  import { requestSiteAccess } from '../../icons/permissions';
  import Button from '../../ui/Button.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';

  const dismissed = $derived(app.settings.icons.hintDismissed);

  async function allow(): Promise<void> {
    // Das Nachsuchen stößt der Berechtigungs-Empfänger im Seitenzustand an.
    if (await requestSiteAccess()) toasts.show(t('toastSiteAccessGranted'));
  }
</script>

{#if !dismissed}
  <div class="hint-bar" role="note">
    <i class="fa-regular fa-image" aria-hidden="true"></i>
    <span>{t('accessHintText')}</span>
    <Button variant="primary" icon="fa-solid fa-unlock" title={t('accessHintAllowTitle')} onclick={allow}>{t('accessHintAllow')}</Button>
    <Button variant="ghost" onclick={() => app.patchSettings({ icons: { hintDismissed: true } })}>{t('accessHintDismiss')}</Button>
  </div>
{/if}

<style>
  .hint-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    align-self: center;
    max-width: 900px;
    margin: 0 auto 8px;
    padding: 8px 10px 8px 16px;
    border-radius: var(--radius-m);
    background: var(--surface);
    backdrop-filter: var(--glass);
    border: 1px solid var(--line);
  }

  i {
    color: var(--accent);
  }

  span {
    flex: 1;
    color: var(--text-muted);
  }
</style>
