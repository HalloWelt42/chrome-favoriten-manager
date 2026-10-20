<script lang="ts">
  /**
   * Icon-Auswahl im Favoriten-Dialog. Zeigt das aktuelle Icon, alle gefundenen Kandidaten
   * nebeneinander und Werkzeuge. Nichts wird gespeichert, bevor der Dialog gespeichert wird;
   * der Dialog liest das Ergebnis über draft.
   */
  import type { AssetRef, IconChoice, IconOrigin } from '../../domain/types';
  import { normalizeInputUrl } from '../../domain/urls';
  import { t, type MessageKey } from '../../i18n';
  import { removeWhite } from '../../icons/imageOps';
  import { requestSiteAccess } from '../../icons/permissions';
  import { iconScore } from '../../icons/probe';
  import { discoverIcons } from '../../icons/resolver';
  import type { ProbedIcon } from '../../icons/types';
  import { assetStore } from '../../data/assets';
  import Button from '../../ui/Button.svelte';
  import FavIcon from '../../ui/FavIcon.svelte';
  import { toasts } from '../../ui/toasts.svelte';
  import { app } from '../state.svelte';
  import type { IconDraft } from './iconDraft';

  interface Props {
    url: string;
    name: string;
    current: IconChoice | null;
    draft: IconDraft;
    autoScan?: boolean;
  }

  let { url, name, current, draft = $bindable(), autoScan = false }: Props = $props();

  const ORIGIN_LABELS: Record<IconOrigin, MessageKey> = {
    page: 'iconOriginPage',
    manifest: 'iconOriginManifest',
    'well-known': 'iconOriginWellKnown',
    browser: 'iconOriginBrowser',
    service: 'iconOriginService',
    upload: 'iconOriginUpload',
    edited: 'iconOriginEdited',
    legacy: 'iconOriginLegacy'
  };

  let candidates = $state<ProbedIcon[]>([]);
  let scanning = $state(false);
  let scanned = $state(false);
  let threshold = $state(245);
  let fileInput: HTMLInputElement | undefined = $state();
  let previewUrl = $state<string | null>(null);
  let candidateUrls = $state<string[]>([]);
  let scanAbort: AbortController | null = null;

  // Vorschau für frisch gewählte Bilder.
  $effect(() => {
    if (draft.kind !== 'blob') {
      previewUrl = null;
      return;
    }
    const objectUrl = URL.createObjectURL(draft.blob);
    previewUrl = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  });

  $effect(() => {
    const urls = candidates.map((c) => URL.createObjectURL(c.blob));
    candidateUrls = urls;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  });

  $effect(() => {
    if (autoScan) void scan();
    return () => scanAbort?.abort();
  });

  const shownRef = $derived(draft.kind === 'keep' ? (current?.ref ?? null) : null);
  const status = $derived.by(() => {
    if (draft.kind === 'auto') return t('iconStatusAutoPending');
    if (draft.kind === 'blob') return t(ORIGIN_LABELS[draft.origin]);
    if (!current) return t('iconStatusAutoPending');
    if (current.mode === 'auto') return current.origin ? `${t('iconStatusAuto')} - ${t(ORIGIN_LABELS[current.origin])}` : t('iconStatusAutoNone');
    return `${t('iconStatusCustom')} - ${t(ORIGIN_LABELS[current.origin])}`;
  });
  const originalAvailable = $derived(
    (draft.kind === 'blob' && draft.original !== null) || (draft.kind === 'keep' && current?.mode === 'custom' && current.originalRef !== null)
  );

  async function scan(): Promise<void> {
    const pageUrl = normalizeInputUrl(url);
    if (!pageUrl) {
      toasts.error(t('errorUrlFirst'));
      return;
    }
    if (!app.siteAccess) {
      // Nur aus dem Klick heraus erlaubt; beim automatischen Start überspringen.
      if (!autoScan || scanned) app.siteAccess = await requestSiteAccess();
    }
    scanAbort?.abort();
    scanAbort = new AbortController();
    scanning = true;
    try {
      candidates = await discoverIcons({
        pageUrl,
        canFetchSites: app.siteAccess,
        allowServices: app.settings.icons.useExternalServices,
        signal: scanAbort.signal
      });
    } finally {
      scanning = false;
      scanned = true;
    }
  }

  function choose(icon: ProbedIcon): void {
    draft = { kind: 'blob', blob: icon.blob, vector: icon.vector, origin: icon.candidate.origin, original: null };
  }

  function onFile(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toasts.error(t('errorNotAnImage'));
      return;
    }
    draft = { kind: 'blob', blob: file, vector: file.type.includes('svg'), origin: 'upload', original: null };
    (event.currentTarget as HTMLInputElement).value = '';
  }

  async function sourceBlob(): Promise<{ blob: Blob; ref: AssetRef | null } | null> {
    if (draft.kind === 'blob') return { blob: draft.blob, ref: null };
    if (draft.kind === 'keep' && current?.ref) {
      const blob = await assetStore.get(current.ref);
      return blob ? { blob, ref: current.ref } : null;
    }
    return null;
  }

  async function whiteToTransparent(): Promise<void> {
    // Immer vom unbearbeiteten Bild ausgehen, damit man mehrere Schwellen probieren kann.
    let base: Blob | AssetRef | null = null;
    if (draft.kind === 'blob' && draft.original) base = draft.original;
    else if (draft.kind === 'keep' && current?.mode === 'custom' && current.originalRef) base = current.originalRef;
    let source: Blob | null = null;
    let original: Blob | AssetRef | null = base;
    if (typeof base === 'string') source = await assetStore.get(base);
    else if (base) source = base;
    if (!source) {
      const fromCurrent = await sourceBlob();
      if (!fromCurrent) {
        toasts.error(t('errorNoIcon'));
        return;
      }
      source = fromCurrent.blob;
      original = fromCurrent.ref ?? fromCurrent.blob;
    }
    try {
      const edited = await removeWhite(source, threshold);
      draft = { kind: 'blob', blob: edited, vector: false, origin: 'edited', original };
    } catch {
      toasts.error(t('errorImageEdit'));
    }
  }

  async function restoreOriginal(): Promise<void> {
    const original = draft.kind === 'blob' ? draft.original : current?.mode === 'custom' ? current.originalRef : null;
    const blob = typeof original === 'string' ? await assetStore.get(original) : original;
    if (!blob) return;
    draft = { kind: 'blob', blob, vector: blob.type.includes('svg'), origin: 'upload', original: null };
  }

  function sizeLabel(icon: ProbedIcon): string {
    return icon.vector ? 'SVG' : `${icon.width}x${icon.height}`;
  }
</script>

<section class="icon-editor">
  <div class="current">
    <div class="preview">
      {#if previewUrl}
        <img src={previewUrl} alt="" />
      {:else if draft.kind === 'auto'}
        <FavIcon iconRef={null} {name} seed={url} />
      {:else}
        <FavIcon iconRef={shownRef} {name} seed={url} />
      {/if}
    </div>
    <div class="meta">
      <span class="status">{status}</span>
      <div class="buttons">
        <Button icon="fa-solid fa-magnifying-glass" busy={scanning} title={t('iconScanTitle')} onclick={scan}>{t('iconScan')}</Button>
        <Button icon="fa-solid fa-upload" title={t('iconUploadTitle')} onclick={() => fileInput?.click()}>{t('iconUpload')}</Button>
        {#if current?.mode === 'custom' || draft.kind === 'blob'}
          <Button icon="fa-solid fa-wand-magic-sparkles" title={t('iconAutoTitle')} onclick={() => (draft = { kind: 'auto' })}>{t('iconAuto')}</Button>
        {/if}
        {#if draft.kind !== 'keep'}
          <Button variant="ghost" icon="fa-solid fa-rotate-left" title={t('iconUndoTitle')} onclick={() => (draft = { kind: 'keep' })}>{t('iconUndo')}</Button>
        {/if}
      </div>
      <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onFile} />
    </div>
  </div>

  {#if candidates.length > 0}
    <div class="gallery" role="listbox" aria-label={t('iconCandidates')}>
      {#each candidates as icon, index (icon.candidate.url)}
        <button
          class="candidate"
          role="option"
          aria-selected={draft.kind === 'blob' && draft.blob === icon.blob}
          class:selected={draft.kind === 'blob' && draft.blob === icon.blob}
          title={`${icon.candidate.url}\n${t('iconScore', Math.round(iconScore(icon)))}`}
          onclick={() => choose(icon)}
        >
          <span class="thumb">{#if candidateUrls[index]}<img src={candidateUrls[index]} alt="" />{/if}</span>
          <span class="origin">{t(ORIGIN_LABELS[icon.candidate.origin])}</span>
          <span class="size">{sizeLabel(icon)}</span>
        </button>
      {/each}
    </div>
  {:else if scanned && !scanning}
    <p class="hint">{app.siteAccess ? t('iconNoneFound') : t('iconNoneFoundNoAccess')}</p>
  {/if}

  <div class="tools">
    <label class="threshold" title={t('iconWhiteThresholdTitle')}>
      <span>{t('iconWhiteThreshold')}</span>
      <input type="range" min="200" max="255" bind:value={threshold} />
      <span class="value">{threshold}</span>
    </label>
    <Button icon="fa-solid fa-droplet-slash" title={t('iconRemoveWhiteTitle')} onclick={whiteToTransparent}>{t('iconRemoveWhite')}</Button>
    {#if originalAvailable}
      <Button variant="ghost" icon="fa-solid fa-clock-rotate-left" title={t('iconOriginalTitle')} onclick={restoreOriginal}>{t('iconOriginal')}</Button>
    {/if}
  </div>
</section>

<style>
  .icon-editor {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-solid) 60%, var(--bg-page));
  }

  .current {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .preview {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    padding: 14px;
    border-radius: 22%;
    background: repeating-conic-gradient(var(--surface-hover) 0% 25%, transparent 0% 50%) 50% / 16px 16px;
    border: 1px solid var(--line);
    --fav-icon-size: 68px;
  }

  .preview img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .status {
    color: var(--text-muted);
  }

  .buttons,
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 8px;
  }

  .candidate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px 8px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: var(--surface-raised);
    color: var(--text);
  }

  .candidate:hover {
    border-color: var(--accent);
  }

  .candidate.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent);
  }

  .thumb {
    display: flex;
    width: 52px;
    height: 52px;
    background: repeating-conic-gradient(var(--surface-hover) 0% 25%, transparent 0% 50%) 50% / 12px 12px;
    border-radius: 8px;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .origin {
    font-size: var(--fs-small);
    color: var(--text-muted);
    text-align: center;
  }

  .size {
    font-size: var(--fs-small);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .threshold {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 220px;
  }

  .threshold input {
    flex: 1;
    accent-color: var(--accent);
  }

  .value {
    min-width: 32px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
