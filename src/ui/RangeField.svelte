<script lang="ts">
  import type { Range } from '../domain/settingsSpec';
  import Field from './Field.svelte';

  interface Props {
    label: string;
    title?: string;
    value: number;
    range: Range;
    unit?: string;
    oninput: (value: number) => void;
  }

  let { label, title, value, range, unit = '', oninput }: Props = $props();
</script>

<Field {label} {title} value={`${value}${unit}`}>
  <input
    type="range"
    min={range.min}
    max={range.max}
    step={range.step}
    {value}
    aria-label={label}
    oninput={(e) => oninput(Number(e.currentTarget.value))}
  />
</Field>

<style>
  input {
    width: 100%;
    accent-color: var(--accent);
    cursor: pointer;
  }
</style>
