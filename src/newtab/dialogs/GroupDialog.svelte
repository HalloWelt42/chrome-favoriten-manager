<script lang="ts">
  import * as commands from '../../app/commands';
  import { t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import ColorPicker from '../../ui/ColorPicker.svelte';
  import Dialog from '../../ui/Dialog.svelte';
  import EmojiPicker from '../../ui/EmojiPicker.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { confirmTrashGroup } from '../menus';
  import { app } from '../state.svelte';

  interface Props {
    groupId: string | null;
  }

  let { groupId }: Props = $props();
  const existing = app.groups.find((g) => g.id === groupId) ?? null;

  let name = $state(existing?.name ?? '');
  let icon = $state(existing?.icon ?? '📁');
  let color = $state(existing?.color ?? app.settings.accentColor);
  let saving = $state(false);

  async function save(): Promise<void> {
    if (!name.trim()) {
      toasts.error(t('errorNameRequired'));
      return;
    }
    saving = true;
    if (existing) {
      await app.run(() => commands.updateGroup(existing.id, { name, icon, color }), t('toastGroupSaved'));
    } else {
      const created = await app.run(() => commands.addGroup({ name, icon, color }), t('toastGroupCreated'));
      if (created) app.selectGroup(created.id);
    }
    saving = false;
    app.closeDialog();
  }
</script>

<Dialog title={existing ? t('editGroup') : t('newGroup')} icon="fa-solid fa-folder" width="m" onclose={() => app.closeDialog()}>
  <form class="form" onsubmit={(e) => { e.preventDefault(); void save(); }}>
    <label class="row">
      <span>{t('fieldName')}</span>
      <div class="name">
        <span class="emoji" style:background={color}>{icon}</span>
        <input class="input" type="text" bind:value={name} data-autofocus required />
      </div>
    </label>
    <div class="row">
      <span>{t('fieldSymbol')}</span>
      <EmojiPicker value={icon} onpick={(e) => (icon = e)} />
    </div>
    <div class="row">
      <span>{t('fieldColor')}</span>
      <ColorPicker value={color} label={t('fieldColor')} onpick={(c) => (color = c)} />
    </div>
  </form>

  {#snippet footer()}
    {#if existing && !existing.isDefault}
      <Button variant="danger" icon="fa-regular fa-trash-can" onclick={() => { app.closeDialog(); confirmTrashGroup(existing); }}>{t('menuTrashGroup')}</Button>
      <span class="spacer"></span>
    {/if}
    <Button variant="ghost" onclick={() => app.closeDialog()}>{t('cancel')}</Button>
    <Button variant="primary" icon="fa-solid fa-check" busy={saving} onclick={save}>{t('save')}</Button>
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .row > span {
    color: var(--text-muted);
  }

  .name {
    display: flex;
    gap: 10px;
  }

  .emoji {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: var(--radius-s);
    font-size: 22px;
  }

  .spacer {
    flex: 1;
  }
</style>
