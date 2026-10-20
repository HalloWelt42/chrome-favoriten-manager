<script lang="ts">
  /**
   * Zeigt das Icon eines Favoriten aus dem Bildspeicher. Ohne Icon erscheint eine
   * Buchstabenkachel aus dem Namen (nicht aus der Adresse, sonst wird jede IP zur "1").
   */
  import type { AssetRef } from '../domain/types';
  import { assetUrls } from './assetUrls.svelte';

  interface Props {
    iconRef: AssetRef | null;
    name: string;
    seed: string;
    rounded?: number;
  }

  let { iconRef, name, seed, rounded = 0 }: Props = $props();
  let broken = $state(false);
  const src = $derived(assetUrls.url(iconRef));

  $effect(() => {
    void iconRef;
    broken = false;
  });

  const FALLBACK_COLORS = ['#7e57c2', '#26a69a', '#ef5350', '#29b6f6', '#66bb6a', '#ffa726', '#ec407a', '#5c6bc0', '#8d6e63', '#26c6da'];

  function initials(text: string): string {
    const words = text
      .replace(/^https?:\/\//, '')
      .split(/[\s\-_.:/|]+/)
      .filter((w) => /\p{L}/u.test(w));
    const letters = words.slice(0, 2).map((w) => [...w].find((c) => /\p{L}/u.test(c)) ?? '');
    return (letters.join('') || [...text].find((c) => /[\p{L}\p{N}]/u.test(c)) || '?').toUpperCase();
  }

  function colorFor(text: string): string {
    let hash = 0;
    for (const char of text) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
    return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]!;
  }
</script>

{#if src && !broken}
  <img {src} alt="" draggable="false" style:border-radius="{rounded}%" onerror={() => (broken = true)} />
{:else if src === null}
  <span class="loading" aria-hidden="true"></span>
{:else}
  <span class="fallback" style:background={colorFor(seed)} style:border-radius="{Math.max(rounded, 18)}%" aria-hidden="true">
    {initials(name)}
  </span>
{/if}

<style>
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #fff;
    font-weight: 600;
    font-size: calc(var(--fav-icon-size, 48px) * 0.36);
    letter-spacing: 0.02em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }

  .loading {
    width: 100%;
    height: 100%;
  }
</style>
