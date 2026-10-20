<script lang="ts">
  import ConfirmDialog from '../dialogs/ConfirmDialog.svelte';
  import FavoriteDialog from '../dialogs/FavoriteDialog.svelte';
  import GroupDialog from '../dialogs/GroupDialog.svelte';
  import InfoDialog from '../dialogs/InfoDialog.svelte';
  import ManagerDialog from '../dialogs/ManagerDialog.svelte';
  import SnapshotsDialog from '../dialogs/SnapshotsDialog.svelte';
  import TrashDialog from '../dialogs/TrashDialog.svelte';
  import { app } from '../state.svelte';
</script>

{#if app.dialog}
  {@const d = app.dialog}
  {#key d}
    {#if d.kind === 'favorite'}
      <FavoriteDialog favoriteId={d.favoriteId} groupId={d.groupId} focusIcons={d.focusIcons} />
    {:else if d.kind === 'group'}
      <GroupDialog groupId={d.groupId} />
    {:else if d.kind === 'confirm'}
      <ConfirmDialog title={d.title} message={d.message} confirmLabel={d.confirmLabel} danger={d.danger} onConfirm={d.onConfirm} />
    {:else if d.kind === 'info'}
      <InfoDialog favoriteId={d.favoriteId} />
    {:else if d.kind === 'trash'}
      <TrashDialog />
    {:else if d.kind === 'snapshots'}
      <SnapshotsDialog />
    {:else if d.kind === 'manager'}
      <ManagerDialog tab={d.tab} />
    {/if}
  {/key}
{/if}
