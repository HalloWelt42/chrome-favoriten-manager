<script lang="ts">
  import type { ImageSource } from '../../domain/types';
  import { assetUrls } from '../../ui/assetUrls.svelte';
  import { app } from '../state.svelte';

  const bg = $derived(app.settings.background);

  function imageFor(theme: 'dark' | 'light'): ImageSource {
    if (theme === 'light') return bg.imageLight ?? (bg.useDarkForLight ? bg.imageDark : null);
    return bg.imageDark;
  }

  const image = $derived(bg.type === 'image' ? imageFor(app.theme) : null);
  const imageUrl = $derived(image ? (image.kind === 'asset' ? assetUrls.url(image.ref) || null : image.url) : null);
  const style = $derived.by(() => {
    if (bg.type === 'gradient') return `background: ${bg.gradient}`;
    if (bg.type === 'color') return `background: ${bg.color}`;
    if (!imageUrl) return 'background: var(--bg-page)';
    const filters = [bg.blur > 0 ? `blur(${bg.blur}px)` : '', bg.brightness !== 100 ? `brightness(${bg.brightness / 100})` : '']
      .filter(Boolean)
      .join(' ');
    return `background-image: url("${imageUrl.replace(/"/g, '%22')}"); filter: ${filters || 'none'}`;
  });
</script>

<div class="background" class:blurred={bg.type === 'image' && bg.blur > 0} {style} aria-hidden="true"></div>

<style>
  .background {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-size: cover;
    background-position: center;
    transition: filter var(--t-med);
  }

  /* Weichzeichnen lässt sonst helle Ränder durchscheinen. */
  .blurred {
    inset: -40px;
  }
</style>
