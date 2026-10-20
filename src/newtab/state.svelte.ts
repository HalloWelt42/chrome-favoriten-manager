/**
 * Zustand der Neuer-Tab-Seite: die Bibliothek (live aus dem Speicher), Auswahl, Seite,
 * Suche und offene Fenster. Änderungen an Daten laufen immer über app/commands.
 */
import * as commands from '../app/commands';
import { AutoIconQueue } from '../app/autoIcons';
import { repository } from '../app/services';
import { applySettingsPatch, type SettingsPatch } from '../domain/settingsPatch';
import { countByGroup, defaultGroup, favoritesOfGroup, sortedGroups } from '../domain/library';
import type { Favorite, Group, Library, Settings, TrashEntry } from '../domain/types';
import { paginate, searchFavorites, sortFavorites, type SearchHit } from '../domain/views';
import { t } from '../i18n';
import { hasSiteAccess, onSiteAccessChange } from '../icons/permissions';
import { toasts } from '../ui/toasts.svelte';

export type Dialog =
  | { kind: 'favorite'; favoriteId: string | null; groupId: string; focusIcons?: boolean }
  | { kind: 'group'; groupId: string | null }
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string; danger: boolean; onConfirm: () => void | Promise<void> }
  | { kind: 'info'; favoriteId: string }
  | { kind: 'trash' }
  | { kind: 'snapshots' }
  | { kind: 'manager'; tab: 'move' | 'duplicates' };

const SETTINGS_COMMIT_DELAY_MS = 350;

export class NewtabState {
  library = $state<Library | null>(null);
  currentGroupId = $state('');
  page = $state(0);
  /** Text im Suchfeld; das Raster filtert nur bei Live-Suche danach. */
  searchText = $state('');
  dialog = $state<Dialog | null>(null);
  settingsOpen = $state(false);
  siteAccess = $state(false);
  autoIconPending = $state(0);
  systemDark = $state(matchMedia('(prefers-color-scheme: dark)').matches);

  readonly autoIcons = new AutoIconQueue(() => ({ allowServices: this.settings.icons.useExternalServices }));
  private pendingSettings: SettingsPatch = {};
  private settingsTimer: ReturnType<typeof setTimeout> | null = null;

  settings = $derived(this.library!.settings);
  groups = $derived(this.library ? sortedGroups(this.library) : []);
  counts = $derived(this.library ? countByGroup(this.library) : new Map<string, number>());
  currentGroup = $derived(this.groups.find((g) => g.id === this.currentGroupId) ?? this.groups[0]);
  theme = $derived<'dark' | 'light'>(
    this.settings.theme === 'system' ? (this.systemDark ? 'dark' : 'light') : this.settings.theme
  );
  perPage = $derived(this.settings.grid.columns * this.settings.grid.rows);
  query = $derived(this.library && this.settings.search.instantSearch ? this.searchText : '');
  searching = $derived(this.query.trim().length > 0);
  searchHits = $derived<SearchHit[]>(this.library && this.searching ? searchFavorites(this.library, this.query) : []);
  groupFavorites = $derived(
    this.library && this.currentGroup ? sortFavorites(favoritesOfGroup(this.library, this.currentGroup.id), this.settings.view.sort) : []
  );
  /** Was das Raster zeigt: Suchtreffer oder die aktuelle Gruppe. */
  visibleList = $derived<Favorite[]>(this.searching ? this.searchHits.map((h) => h.favorite) : this.groupFavorites);
  pageSlice = $derived(paginate(this.visibleList, this.page, this.perPage, !this.searching));
  trashCount = $derived(this.library?.trash.length ?? 0);

  async init(): Promise<void> {
    this.library = await repository.load();
    repository.subscribe((next) => {
      // Noch nicht gespeicherte Regler-Werte nicht von älteren Ständen überschreiben lassen.
      if (Object.keys(this.pendingSettings).length > 0) applySettingsPatch(next.settings, this.pendingSettings);
      this.library = next;
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => (this.systemDark = e.matches));
    this.siteAccess = await hasSiteAccess();
    onSiteAccessChange((granted) => {
      const newlyGranted = granted && !this.siteAccess;
      this.siteAccess = granted;
      if (newlyGranted) void commands.retryMissingAutoIcons();
    });
    this.autoIcons.onProgress((n) => (this.autoIconPending = n));
    this.selectGroup(this.startGroupId(), false);
  }

  private startGroupId(): string {
    const lib = this.library!;
    const { group, lastGroupId } = lib.settings.startup;
    const exists = (id: string | null | undefined): id is string => !!id && lib.groups.some((g) => g.id === id);
    if (group === 'last' && exists(lastGroupId)) return lastGroupId;
    if (typeof group === 'object' && exists(group.groupId)) return group.groupId;
    return defaultGroup(lib).id;
  }

  // -- Auswahl und Blättern ---------------------------------------------------

  selectGroup(groupId: string, remember = true): void {
    this.currentGroupId = groupId;
    this.page = 0;
    this.searchText = '';
    if (remember && this.settings.startup.lastGroupId !== groupId) void commands.rememberGroup(groupId);
  }

  goToPage(page: number): void {
    this.page = Math.max(0, Math.min(page, this.pageSlice.pageCount - 1));
  }

  nextPage(): void {
    this.goToPage(this.pageSlice.page + 1);
  }

  prevPage(): void {
    this.goToPage(this.pageSlice.page - 1);
  }

  // -- Einstellungen: sofort sichtbar, gesammelt gespeichert ------------------

  patchSettings(patch: SettingsPatch): void {
    if (!this.library) return;
    applySettingsPatch(this.library.settings, patch);
    applySettingsPatch(this.pendingSettings as Partial<Settings>, patch);
    if (this.settingsTimer) clearTimeout(this.settingsTimer);
    this.settingsTimer = setTimeout(() => void this.commitSettings(), SETTINGS_COMMIT_DELAY_MS);
  }

  async commitSettings(): Promise<void> {
    if (this.settingsTimer) clearTimeout(this.settingsTimer);
    this.settingsTimer = null;
    const patch = this.pendingSettings;
    this.pendingSettings = {};
    if (Object.keys(patch).length > 0) await this.run(() => commands.updateSettings(patch));
  }

  // -- Datenaktionen mit Rückmeldung -------------------------------------------

  /** Führt eine Aktion aus und meldet Fehler, statt sie zu verschlucken. */
  async run<T>(action: () => Promise<T>, success?: string): Promise<T | undefined> {
    try {
      const result = await action();
      if (success) toasts.show(success);
      return result;
    } catch (error) {
      console.warn('[FavGrid]', error);
      toasts.error(t('errorGeneric'));
      return undefined;
    }
  }

  /** Legt Favoriten in den Papierkorb und bietet Rückgängig an. */
  async trashFavorites(ids: string[]): Promise<void> {
    const entries = await this.run(() => commands.trashFavorites(ids));
    if (!entries || entries.length === 0) return;
    this.offerUndo(entries, ids.length === 1 ? t('toastMovedToTrash') : t('toastMovedToTrashMany', ids.length));
  }

  async trashGroup(group: Group): Promise<void> {
    const entry = await this.run(() => commands.trashGroup(group.id));
    if (!entry) return;
    if (this.currentGroupId === group.id) this.selectGroup(defaultGroup(this.library!).id);
    this.offerUndo([entry], t('toastGroupMovedToTrash', group.name));
  }

  private offerUndo(entries: TrashEntry[], text: string): void {
    toasts.show(text, 'info', {
      label: t('undo'),
      run: async () => {
        await this.run(() => commands.restoreFromTrash(entries.map((e) => e.id)), t('toastRestored'));
      }
    });
  }

  openFavorite(fav: Favorite, event: MouseEvent | KeyboardEvent): void {
    const newTabByDefault = this.settings.navigation.clickBehavior === 'newTab';
    const modifier = event.ctrlKey || event.metaKey;
    const inNewTab = newTabByDefault !== modifier;
    void commands.recordVisit(fav.id);
    if (inNewTab) void chrome.tabs.create({ url: fav.url, active: !event.shiftKey });
    else window.location.href = fav.url;
  }

  openInBackground(fav: Favorite): void {
    void commands.recordVisit(fav.id);
    void chrome.tabs.create({ url: fav.url, active: false });
  }

  confirm(dialog: Omit<Extract<Dialog, { kind: 'confirm' }>, 'kind'>): void {
    this.dialog = { kind: 'confirm', ...dialog };
  }

  closeDialog(): void {
    this.dialog = null;
  }
}

export const app = new NewtabState();
