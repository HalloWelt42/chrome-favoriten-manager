<script lang="ts">
  import { t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import { app } from '../state.svelte';

  interface Props {
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    onConfirm: () => void | Promise<void>;
  }

  let { title, message, confirmLabel, danger, onConfirm }: Props = $props();
  let busy = $state(false);

  const own = app.dialog;

  async function confirm(): Promise<void> {
    busy = true;
    try {
      await onConfirm();
    } finally {
      busy = false;
      // Hat die Aktion ein anderes Fenster geöffnet, bleibt dieses offen.
      if (app.dialog === own) app.closeDialog();
    }
  }
</script>

<Dialog {title} icon={danger ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-question'} width="s" onclose={() => app.closeDialog()}>
  <p class="message">{message}</p>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => app.closeDialog()}>{t('cancel')}</Button>
    <Button variant={danger ? 'danger' : 'primary'} {busy} onclick={confirm}>{confirmLabel}</Button>
  {/snippet}
</Dialog>

<style>
  .message {
    margin: 0;
    white-space: pre-line;
    line-height: 1.5;
  }
</style>
