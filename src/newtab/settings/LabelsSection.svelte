<script lang="ts">
  import { FONT_WEIGHTS, RANGES } from '../../domain/settingsSpec';
  import type { FontWeight, LabelFont, LabelPosition } from '../../domain/types';
  import { t } from '../../i18n';
  import ColorPicker from '../../ui/ColorPicker.svelte';
  import Field from '../../ui/Field.svelte';
  import RangeField from '../../ui/RangeField.svelte';
  import Segmented from '../../ui/Segmented.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { app } from '../state.svelte';

  const labels = $derived(app.settings.labels);
  let customFont = $state(app.settings.labels.customFont);
</script>

<Toggle checked={labels.show} label={t('labelsShow')} onchange={(v) => app.patchSettings({ labels: { show: v } })} />
{#if labels.show}
  <Field label={t('labelsPosition')} stacked>
    <Segmented
      label={t('labelsPosition')}
      value={labels.position}
      options={[
        { value: 'below' as LabelPosition, label: t('labelsBelow'), icon: 'fa-solid fa-arrow-down' },
        { value: 'above' as LabelPosition, label: t('labelsAbove'), icon: 'fa-solid fa-arrow-up' }
      ]}
      onchange={(v) => app.patchSettings({ labels: { position: v } })}
    />
  </Field>
  <RangeField label={t('labelsSize')} value={labels.fontSize} range={RANGES.labelFontSize} unit=" px" oninput={(v) => app.patchSettings({ labels: { fontSize: v } })} />
  <RangeField label={t('labelsMaxLength')} title={t('labelsMaxLengthTitle')} value={labels.maxLength} range={RANGES.labelMaxLength} oninput={(v) => app.patchSettings({ labels: { maxLength: v } })} />
  <Field label={t('labelsFont')} stacked>
    <Segmented
      label={t('labelsFont')}
      value={labels.font}
      options={[
        { value: 'barlow' as LabelFont, label: 'Barlow' },
        { value: 'system' as LabelFont, label: t('fontSystem'), title: t('fontSystemTitle') },
        { value: 'custom' as LabelFont, label: t('fontCustom'), title: t('fontCustomTitle') }
      ]}
      onchange={(v) => app.patchSettings({ labels: { font: v } })}
    />
  </Field>
  {#if labels.font === 'custom'}
    <Field label={t('fontCustomName')} title={t('fontCustomTitle')} stacked>
      <input class="input" type="text" bind:value={customFont} placeholder="DIN Alternate" onchange={() => app.patchSettings({ labels: { customFont: customFont.trim() } })} />
    </Field>
  {/if}
  <Field label={t('labelsWeight')} stacked>
    <Segmented
      label={t('labelsWeight')}
      value={labels.fontWeight}
      options={FONT_WEIGHTS.map((w) => ({ value: w as FontWeight, label: w }))}
      onchange={(v) => app.patchSettings({ labels: { fontWeight: v } })}
    />
  </Field>
  <Field label={t('labelsColorDark')} stacked>
    <ColorPicker value={labels.colorDark} label={t('labelsColorDark')} onpick={(c) => app.patchSettings({ labels: { colorDark: c } })} />
  </Field>
  <Field label={t('labelsColorLight')} stacked>
    <ColorPicker value={labels.colorLight} label={t('labelsColorLight')} onpick={(c) => app.patchSettings({ labels: { colorLight: c } })} />
  </Field>
{/if}
