<script lang="ts">
  import { assetStore } from '../../data/assets';
  import { GRADIENT_PRESETS, RANGES } from '../../domain/settingsSpec';
  import type { BackgroundType, ImageSource, ThemeMode, UiScale } from '../../domain/types';
  import { t } from '../../i18n';
  import Button from '../../ui/Button.svelte';
  import ColorPicker from '../../ui/ColorPicker.svelte';
  import Field from '../../ui/Field.svelte';
  import RangeField from '../../ui/RangeField.svelte';
  import Segmented from '../../ui/Segmented.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { assetUrls } from '../../ui/assetUrls.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';

  const s = $derived(app.settings);
  const bg = $derived(app.settings.background);
  let uploadFor = $state<'dark' | 'light'>('dark');
  let fileInput: HTMLInputElement | undefined = $state();
  let urlDark = $state(app.settings.background.imageDark?.kind === 'url' ? app.settings.background.imageDark.url : '');
  let urlLight = $state(app.settings.background.imageLight?.kind === 'url' ? app.settings.background.imageLight.url : '');

  function previewUrl(source: ImageSource): string | null {
    if (!source) return null;
    return source.kind === 'asset' ? assetUrls.url(source.ref) || null : source.url;
  }

  function upload(target: 'dark' | 'light'): void {
    uploadFor = target;
    fileInput?.click();
  }

  async function onFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toasts.error(t('errorNotAnImage'));
      return;
    }
    const ref = await assetStore.putBlob(file);
    const source: ImageSource = { kind: 'asset', ref };
    app.patchSettings({ background: uploadFor === 'dark' ? { type: 'image', imageDark: source } : { type: 'image', imageLight: source } });
  }

  function setUrl(target: 'dark' | 'light', value: string): void {
    const trimmed = value.trim();
    const source: ImageSource = trimmed ? { kind: 'url', url: trimmed } : null;
    app.patchSettings({ background: target === 'dark' ? { imageDark: source } : { imageLight: source } });
  }

  function customGradient(color1: string, color2: string): void {
    app.patchSettings({
      background: { type: 'gradient', customGradient: { color1, color2 }, gradient: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)` }
    });
  }
</script>

<h3 class="settings-heading">{t('headingTheme')}</h3>
<Field label={t('settingTheme')} stacked>
  <Segmented
    label={t('settingTheme')}
    value={s.theme}
    options={[
      { value: 'dark' as ThemeMode, label: t('themeDark'), icon: 'fa-regular fa-moon' },
      { value: 'light' as ThemeMode, label: t('themeLight'), icon: 'fa-regular fa-sun' },
      { value: 'system' as ThemeMode, label: t('themeSystem'), icon: 'fa-solid fa-circle-half-stroke', title: t('themeSystemTitle') }
    ]}
    onchange={(v) => app.patchSettings({ theme: v })}
  />
</Field>
<Field label={t('settingUiScale')} title={t('settingUiScaleTitle')} stacked>
  <Segmented
    label={t('settingUiScale')}
    value={s.uiScale}
    options={[
      { value: 'normal' as UiScale, label: t('uiScaleNormal') },
      { value: 'large' as UiScale, label: t('uiScaleLarge') },
      { value: 'xlarge' as UiScale, label: t('uiScaleXLarge') }
    ]}
    onchange={(v) => app.patchSettings({ uiScale: v })}
  />
</Field>
<Field label={t('settingAccent')} title={t('settingAccentTitle')} stacked>
  <ColorPicker value={s.accentColor} label={t('settingAccent')} onpick={(c) => app.patchSettings({ accentColor: c })} />
</Field>

<h3 class="settings-heading">{t('headingBackground')}</h3>
<Field label={t('settingBackgroundType')} stacked>
  <Segmented
    label={t('settingBackgroundType')}
    value={bg.type}
    options={[
      { value: 'gradient' as BackgroundType, label: t('bgGradient'), icon: 'fa-solid fa-fill-drip' },
      { value: 'color' as BackgroundType, label: t('bgColor'), icon: 'fa-solid fa-square' },
      { value: 'image' as BackgroundType, label: t('bgImage'), icon: 'fa-regular fa-image' }
    ]}
    onchange={(v) => app.patchSettings({ background: { type: v } })}
  />
</Field>

{#if bg.type === 'gradient'}
  <div class="gradients">
    {#each GRADIENT_PRESETS as gradient (gradient)}
      <button class="gradient" class:active={bg.gradient === gradient} style:background={gradient} aria-label={gradient} onclick={() => app.patchSettings({ background: { gradient } })}></button>
    {/each}
  </div>
  <Field label={t('bgCustomGradient1')} stacked>
    <ColorPicker value={bg.customGradient.color1} label={t('bgCustomGradient1')} onpick={(c) => customGradient(c, bg.customGradient.color2)} />
  </Field>
  <Field label={t('bgCustomGradient2')} stacked>
    <ColorPicker value={bg.customGradient.color2} label={t('bgCustomGradient2')} onpick={(c) => customGradient(bg.customGradient.color1, c)} />
  </Field>
{:else if bg.type === 'color'}
  <Field label={t('bgColor')} stacked>
    <ColorPicker value={bg.color} label={t('bgColor')} onpick={(c) => app.patchSettings({ background: { color: c } })} />
  </Field>
{:else}
  {#each [{ key: 'dark' as const, label: t('bgImageDark'), source: bg.imageDark }, { key: 'light' as const, label: t('bgImageLight'), source: bg.imageLight }] as entry (entry.key)}
    <div class="image-row">
      <div class="thumb" style:background-image={previewUrl(entry.source) ? `url("${previewUrl(entry.source)}")` : 'none'}>
        {#if !entry.source}<i class="fa-regular fa-image" aria-hidden="true"></i>{/if}
      </div>
      <div class="image-meta">
        <span>{entry.label}</span>
        <div class="settings-actions">
          <Button icon="fa-solid fa-upload" onclick={() => upload(entry.key)}>{t('bgUpload')}</Button>
          {#if entry.source}
            <Button variant="ghost" icon="fa-solid fa-xmark" onclick={() => app.patchSettings({ background: entry.key === 'dark' ? { imageDark: null } : { imageLight: null } })}>{t('remove')}</Button>
          {/if}
        </div>
        {#if entry.key === 'dark'}
          <input class="input" type="url" placeholder={t('bgImageUrl')} bind:value={urlDark} onchange={() => setUrl('dark', urlDark)} />
        {:else}
          <input class="input" type="url" placeholder={t('bgImageUrl')} bind:value={urlLight} onchange={() => setUrl('light', urlLight)} />
        {/if}
      </div>
    </div>
  {/each}
  <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onFile} />
  <Toggle checked={bg.useDarkForLight} label={t('bgUseDarkForLight')} title={t('bgUseDarkForLightTitle')} onchange={(v) => app.patchSettings({ background: { useDarkForLight: v } })} />
  <RangeField label={t('bgBlur')} value={bg.blur} range={RANGES.backgroundBlur} unit=" px" oninput={(v) => app.patchSettings({ background: { blur: v } })} />
  <RangeField label={t('bgBrightness')} value={bg.brightness} range={RANGES.backgroundBrightness} unit=" %" oninput={(v) => app.patchSettings({ background: { brightness: v } })} />
{/if}

<style>
  .gradients {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 6px;
    padding: 6px 0 10px;
  }

  .gradient {
    aspect-ratio: 1;
    border-radius: var(--radius-s);
    border: 2px solid transparent;
  }

  .gradient.active {
    border-color: var(--text);
    box-shadow: 0 0 0 2px var(--accent);
  }

  .image-row {
    display: flex;
    gap: 12px;
    padding: 10px 0;
  }

  .thumb {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 110px;
    height: 74px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background-size: cover;
    background-position: center;
    color: var(--text-faint);
    font-size: 22px;
  }

  .image-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
</style>
