/** Ungespeicherte Icon-Wahl im Favoriten-Dialog und ihre Übernahme in den Bildspeicher. */
import { assetStore } from '../../data/assets';
import type { AssetRef, IconChoice, IconOrigin } from '../../domain/types';
import { shrinkForStorage } from '../../icons/imageOps';

export type IconDraft =
  | { kind: 'keep' }
  | { kind: 'auto' }
  | { kind: 'blob'; blob: Blob; vector: boolean; origin: IconOrigin; original: Blob | AssetRef | null };

/**
 * Speichert die Wahl. null heißt: Icon bleibt wie es ist.
 * Ein gewähltes Bild gilt als eigenes Icon und wird nie automatisch ersetzt.
 */
export async function persistIconDraft(draft: IconDraft): Promise<IconChoice | null> {
  if (draft.kind === 'keep') return null;
  if (draft.kind === 'auto') return { mode: 'auto', ref: null, origin: null, checkedAt: null };
  const ref = await assetStore.putBlob(await shrinkForStorage(draft.blob, draft.vector));
  let originalRef: AssetRef | null = null;
  if (typeof draft.original === 'string') originalRef = draft.original;
  else if (draft.original) originalRef = await assetStore.putBlob(draft.original);
  return { mode: 'custom', ref, origin: draft.origin, originalRef };
}
