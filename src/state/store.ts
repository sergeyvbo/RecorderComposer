import { createStore, type StoreApi } from 'zustand/vanilla';
import { deleteNotes, pasteNotes, type ClipboardNote } from '@/domain/commands';
import { apply, canRedo, canUndo, createHistory, redo, undo, type History } from '@/domain/history';
import {
  createEmptyMelody,
  type AdjustReason,
  type EditResult,
  type Melody,
  type RejectReason,
} from '@/domain/types';
import type { Preferences } from './prefs';

export type PlaybackStatus = 'stopped' | 'playing' | 'paused';
export type StorageStatus = 'ok' | 'saving' | 'unavailable' | 'quota';

export interface SelectionState {
  ids: ReadonlySet<string>;
  hoverId: string | null;
}

export interface ViewState {
  pxPerTick: number;
  /** Tick at the left edge of the time area (shared by all panels, FR-013a). */
  scrollTick: number;
}

export interface PlaybackState {
  status: PlaybackStatus;
  positionTicks: number;
  playingNoteId: string | null;
  /** Set when audio could not be started (spec edge case). */
  error: 'unavailable' | null;
}

export interface LastEdit {
  adjusted: AdjustReason[];
  reason: RejectReason | null;
  seq: number;
}

export interface LibraryEntry {
  id: string;
  title: string;
  updatedAt: string;
}

export type SelectMode = 'replace' | 'toggle' | 'add';

export interface AppActions {
  /** Run a command, record it in history (FR-007) and update `updatedAt`. */
  dispatch: (command: (m: Melody) => EditResult) => EditResult;
  /** Run a command on the committed melody without touching history; result shown as `draft`. */
  preview: (command: (m: Melody) => EditResult) => EditResult;
  endPreview: () => void;
  undo: () => void;
  redo: () => void;
  select: (ids: readonly string[], mode?: SelectMode) => void;
  clearSelection: () => void;
  setHover: (id: string | null) => void;
  copy: () => void;
  cut: () => void;
  paste: (atTick: number) => void;
  openMelody: (m: Melody) => void;
  setPrefs: (patch: Partial<Preferences>) => void;
  setView: (patch: Partial<ViewState>) => void;
  setPlayback: (patch: Partial<PlaybackState>) => void;
  setStorageStatus: (status: StorageStatus) => void;
  setLibrary: (entries: LibraryEntry[]) => void;
  upsertLibraryEntry: (entry: LibraryEntry) => void;
  removeLibraryEntry: (id: string) => void;
}

export interface AppState {
  melody: Melody;
  /** In-progress drag result (never in history); panels render `draft ?? melody`. */
  draft: Melody | null;
  history: History;
  selection: SelectionState;
  clipboard: ClipboardNote[];
  view: ViewState;
  playback: PlaybackState;
  storage: { status: StorageStatus };
  library: LibraryEntry[];
  prefs: Preferences;
  lastEdit: LastEdit;
  actions: AppActions;
}

export interface StoreDeps {
  now: () => string;
  newId: () => string;
}

export const defaultDeps: StoreDeps = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};

export const selectMelody = (s: AppState): Melody => s.draft ?? s.melody;

const sortLibrary = (entries: LibraryEntry[]) =>
  [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const selectCanUndo = (s: AppState) => canUndo(s.history);
export const selectCanRedo = (s: AppState) => canRedo(s.history);

export function createAppStore(initialPrefs: Preferences, deps: StoreDeps = defaultDeps, initialMelody?: Melody) {
  const melody = initialMelody ?? createEmptyMelody(deps.now(), deps.newId());
  return createStore<AppState>()((set, get) => {
    const noteRecord = (r: EditResult) =>
      set((s) => ({
        lastEdit: {
          adjusted: r.ok ? (r.adjusted ?? []) : [],
          reason: r.ok ? null : r.reason,
          seq: s.lastEdit.seq + 1,
        },
      }));

    const commit = (r: EditResult) => {
      if (!r.ok) return;
      const stamped = r.melody === get().melody ? r.melody : { ...r.melody, updatedAt: deps.now() };
      const history = apply(get().history, { ...r, melody: stamped });
      set({ history, melody: history.present, draft: null });
    };

    const pruneSelection = (m: Melody) => {
      const ids = new Set(m.notes.map((n) => n.id));
      const kept = [...get().selection.ids].filter((id) => ids.has(id));
      if (kept.length !== get().selection.ids.size) {
        set((s) => ({ selection: { ...s.selection, ids: new Set(kept) } }));
      }
    };

    const stepHistory = (h: History) => {
      if (h === get().history) return;
      set({ history: h, melody: h.present, draft: null });
      pruneSelection(h.present);
    };

    return {
      melody,
      draft: null,
      history: createHistory(melody),
      selection: { ids: new Set(), hoverId: null },
      clipboard: [],
      view: { pxPerTick: initialPrefs.pxPerTick, scrollTick: 0 },
      playback: { status: 'stopped', positionTicks: 0, playingNoteId: null, error: null },
      storage: { status: 'ok' },
      library: [],
      prefs: initialPrefs,
      lastEdit: { adjusted: [], reason: null, seq: 0 },
      actions: {
        dispatch: (command) => {
          const r = command(get().melody);
          commit(r);
          noteRecord(r);
          if (r.ok) pruneSelection(r.melody);
          return r;
        },
        preview: (command) => {
          const r = command(get().melody);
          set({ draft: r.ok ? r.melody : null });
          noteRecord(r);
          return r;
        },
        endPreview: () => set({ draft: null }),
        undo: () => stepHistory(undo(get().history)),
        redo: () => stepHistory(redo(get().history)),
        select: (ids, mode = 'replace') =>
          set((s) => {
            const next = mode === 'replace' ? new Set<string>() : new Set(s.selection.ids);
            for (const id of ids) {
              if (mode === 'toggle' && next.has(id)) next.delete(id);
              else next.add(id);
            }
            return { selection: { ...s.selection, ids: next } };
          }),
        clearSelection: () => set((s) => ({ selection: { ...s.selection, ids: new Set() } })),
        setHover: (id) =>
          set((s) => (s.selection.hoverId === id ? s : { selection: { ...s.selection, hoverId: id } })),
        copy: () => {
          const { melody: m, selection } = get();
          const sel = m.notes.filter((n) => selection.ids.has(n.id));
          const first = sel[0]?.start ?? 0;
          set({ clipboard: sel.map((n) => ({ pitch: n.pitch, offset: n.start - first, duration: n.duration })) });
        },
        cut: () => {
          get().actions.copy();
          const ids = [...get().selection.ids];
          get().actions.dispatch((m) => deleteNotes(m, ids));
        },
        paste: (atTick) => {
          const { clipboard, prefs } = get();
          const r = get().actions.dispatch((m) => pasteNotes(m, clipboard, atTick, prefs.snapTicks, deps));
          if (r.ok && r.ids) get().actions.select(r.ids);
        },
        openMelody: (m) =>
          set({
            melody: m,
            draft: null,
            history: createHistory(m),
            selection: { ids: new Set(), hoverId: null },
            playback: { status: 'stopped', positionTicks: 0, playingNoteId: null, error: null },
            view: { ...get().view, scrollTick: 0 },
          }),
        setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
        setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
        setPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
        setStorageStatus: (status) => set((s) => (s.storage.status === status ? s : { storage: { status } })),
        setLibrary: (entries) => set({ library: sortLibrary(entries) }),
        upsertLibraryEntry: (entry) =>
          set((s) => ({ library: sortLibrary([entry, ...s.library.filter((e) => e.id !== entry.id)]) })),
        removeLibraryEntry: (id) => set((s) => ({ library: s.library.filter((e) => e.id !== id) })),
      },
    };
  });
}

export type AppStore = StoreApi<AppState>;
