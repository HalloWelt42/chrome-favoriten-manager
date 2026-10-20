<script lang="ts">
  interface Props {
    icon: string;
    title: string;
    active?: boolean;
    badge?: number;
    size?: 's' | 'm' | 'l';
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
  }

  let { icon, title, active = false, badge = 0, size = 'm', disabled = false, onclick }: Props = $props();
</script>

<button class="icon-btn {size}" class:active {title} aria-label={title} {disabled} {onclick}>
  <i class={icon} aria-hidden="true"></i>
  {#if badge > 0}<span class="badge">{badge > 999 ? '999+' : badge}</span>{/if}
</button>

<style>
  .icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    background: var(--surface);
    backdrop-filter: var(--glass);
    color: var(--text-muted);
    border-radius: var(--radius-m);
    transition: color var(--t-fast), background var(--t-fast), border-color var(--t-fast);
  }

  .s {
    width: 32px;
    height: 32px;
    font-size: 14px;
    border-radius: var(--radius-s);
  }

  .m {
    width: 44px;
    height: 44px;
    font-size: 17px;
  }

  .l {
    width: 52px;
    height: 52px;
    font-size: 20px;
  }

  .icon-btn:hover:not(:disabled),
  .active {
    color: var(--text);
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
  }
</style>
