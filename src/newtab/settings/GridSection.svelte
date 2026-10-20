<script lang="ts">
  import { RANGES } from '../../domain/settingsSpec';
  import { t } from '../../i18n';
  import ColorPicker from '../../ui/ColorPicker.svelte';
  import Field from '../../ui/Field.svelte';
  import RangeField from '../../ui/RangeField.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { app } from '../state.svelte';

  const grid = $derived(app.settings.grid);
  const tiles = $derived(app.settings.tiles);
</script>

<h3 class="settings-heading">{t('headingLayout')}</h3>
<RangeField label={t('gridColumns')} title={t('gridColumnsTitle')} value={grid.columns} range={RANGES.columns} oninput={(v) => app.patchSettings({ grid: { columns: v } })} />
<RangeField label={t('gridRows')} title={t('gridRowsTitle')} value={grid.rows} range={RANGES.rows} oninput={(v) => app.patchSettings({ grid: { rows: v } })} />
<RangeField label={t('gridIconSize')} value={grid.iconSize} range={RANGES.iconSize} unit=" px" oninput={(v) => app.patchSettings({ grid: { iconSize: v } })} />
<RangeField label={t('gridGap')} value={grid.gap} range={RANGES.gap} unit=" px" oninput={(v) => app.patchSettings({ grid: { gap: v } })} />

<h3 class="settings-heading">{t('headingTiles')}</h3>
<RangeField label={t('gridRadius')} title={t('gridRadiusTitle')} value={grid.borderRadius} range={RANGES.borderRadius} unit=" %" oninput={(v) => app.patchSettings({ grid: { borderRadius: v } })} />
<RangeField label={t('gridImageRadius')} title={t('gridImageRadiusTitle')} value={grid.imageRadius} range={RANGES.imageRadius} unit=" %" oninput={(v) => app.patchSettings({ grid: { imageRadius: v } })} />
<RangeField label={t('tileOpacity')} title={t('tileOpacityTitle')} value={tiles.opacity} range={RANGES.tileOpacity} unit=" %" oninput={(v) => app.patchSettings({ tiles: { opacity: v } })} />
<RangeField label={t('tileBlur')} title={t('tileBlurTitle')} value={tiles.glassBlur} range={RANGES.glassBlur} unit=" px" oninput={(v) => app.patchSettings({ tiles: { glassBlur: v } })} />
<RangeField label={t('tileBorder')} title={t('tileBorderTitle')} value={tiles.glassBorder} range={RANGES.glassBorder} unit=" %" oninput={(v) => app.patchSettings({ tiles: { glassBorder: v } })} />
<RangeField label={t('tileShadow')} value={tiles.glassShadow} range={RANGES.glassShadow} unit=" %" oninput={(v) => app.patchSettings({ tiles: { glassShadow: v } })} />
<Toggle checked={grid.showShadow} label={t('gridShadow')} title={t('gridShadowTitle')} onchange={(v) => app.patchSettings({ grid: { showShadow: v } })} />
<Field label={t('tileColorDark')} stacked>
  <ColorPicker value={tiles.bgDark} label={t('tileColorDark')} onpick={(c) => app.patchSettings({ tiles: { bgDark: c } })} />
</Field>
<Field label={t('tileColorLight')} stacked>
  <ColorPicker value={tiles.bgLight} label={t('tileColorLight')} onpick={(c) => app.patchSettings({ tiles: { bgLight: c } })} />
</Field>
