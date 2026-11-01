import { useTranslation } from 'react-i18next';
import { articulationState, setLegato, setMark, toggledMark } from '@/domain/articulation';
import { deleteNotes } from '@/domain/commands';
import type { NoteMark } from '@/domain/types';
import { MAX_PX_PER_TICK, MIN_PX_PER_TICK, PANEL_IDS, type PanelId } from '@/state/prefs';
import { safeFileName } from '@/persistence/library';
import { selectCanRedo, selectCanUndo } from '@/state/store';
import { clampZoom } from '../Layout/SharedTimeAxis';
import { downloadBlob, downloadText, useLibrary } from '../libraryContext';
import { usePlaybackController } from '../playbackContext';
import { COMMAND_ICON, PAUSE_ICON, PIN_ICON, type IconComponent } from '../Ribbon/icons';
import type { CommandId } from '../Ribbon/layout';
import type { Shortcut } from '../Ribbon/shortcutLabel';
import { useApp, useAppStore } from '../storeContext';
import { useRibbonDialogs } from './dialogs';

/** One ribbon / quick-access command (003 data-model.md CommandDescriptor). */
export interface CommandDescriptor {
  id: CommandId;
  /** Visible label. */
  label: string;
  /** Accessible name: the label, or the existing toolbar name where it differs (e.g. "Staccato (S)"). */
  name: string;
  icon: IconComponent;
  shortcut?: Shortcut;
  enabled: boolean;
  /** Toggles only. */
  pressed?: boolean | 'mixed';
  /** Collapse/pin only (`aria-expanded`). */
  expanded?: boolean;
  /** Tooltip second line: why the command is disabled, or a warning (audio unavailable). */
  reason?: string;
  run: () => void;
}

const ZOOM_STEP = 1.25;
const PANEL_COMMAND: Record<PanelId, CommandId> = {
  timeline: 'panelTimeline',
  sheet: 'panelSheet',
  fingering: 'panelFingering',
};

/** Every ribbon command, built from the store and the playback controller (003 research R3). */
export function useCommands(): Record<CommandId, CommandDescriptor> {
  const { t } = useTranslation();
  const store = useAppStore();
  const controller = usePlaybackController();
  const library = useLibrary();
  const dialogs = useRibbonDialogs();
  const actions = useApp((s) => s.actions);
  const melody = useApp((s) => s.melody);
  const selection = useApp((s) => s.selection.ids);
  const clipboardEmpty = useApp((s) => s.clipboard.length === 0);
  const canUndo = useApp(selectCanUndo);
  const canRedo = useApp(selectCanRedo);
  const status = useApp((s) => s.playback.status);
  const audioError = useApp((s) => s.playback.error);
  const panels = useApp((s) => s.prefs.panels);
  const pxPerTick = useApp((s) => s.view.pxPerTick);
  const ribbon = useApp((s) => s.prefs.ribbon);

  const ids = [...selection];
  const empty = melody.notes.length === 0;
  const noSelection = t('ribbon.reason.noSelection');
  const playing = status === 'playing';

  const make = (
    id: CommandId,
    label: string,
    run: () => void,
    opts: Partial<Omit<CommandDescriptor, 'id' | 'label' | 'run'>> & { disabledReason?: string } = {},
  ): CommandDescriptor => {
    const { disabledReason, ...rest } = opts;
    const enabled = rest.enabled ?? true;
    const reason = !enabled ? disabledReason : rest.reason;
    const d: CommandDescriptor = { id, label, name: rest.name ?? label, icon: rest.icon ?? COMMAND_ICON[id], enabled, run };
    if (rest.shortcut) d.shortcut = rest.shortcut;
    if (rest.pressed !== undefined) d.pressed = rest.pressed;
    if (rest.expanded !== undefined) d.expanded = rest.expanded;
    if (reason) d.reason = reason;
    return d;
  };

  const zoom = (factor: number) => {
    const px = clampZoom(store.getState().view.pxPerTick * factor);
    actions.setView({ pxPerTick: px });
    actions.setPrefs({ pxPerTick: px });
  };
  const exportMidi = async () => {
    const { toMidiBytes } = await import('@/domain/midi');
    const m = store.getState().melody;
    downloadBlob(`${safeFileName(m.title)}.mid`, new Blob([new Uint8Array(toMidiBytes(m))], { type: 'audio/midi' }));
  };

  const artic = articulationState(melody, ids);
  const hasMark = (mark: NoteMark) => melody.notes.some((n) => selection.has(n.id) && n.mark === mark);
  const markCommand = (mark: NoteMark) =>
    make(mark, t(`ribbon.cmd.${mark}`), () => actions.dispatch((m) => setMark(m, ids, toggledMark(artic, mark))), {
      name: t(`articulation.${mark}`),
      enabled: artic.mark !== null,
      pressed: artic.mark === mark ? true : artic.mark === 'mixed' && hasMark(mark) ? 'mixed' : false,
      disabledReason: noSelection,
    });

  const visibleCount = PANEL_IDS.filter((p) => panels[p].visible).length;
  const panelCommand = (p: PanelId) => {
    const on = panels[p].visible;
    return make(PANEL_COMMAND[p], t(`panel.${p}`), () => actions.setPrefs({ panels: { ...panels, [p]: { ...panels[p], visible: !on } } }), {
      pressed: on,
      enabled: !(on && visibleCount === 1),
      disabledReason: t('ribbon.reason.lastPanel'),
    });
  };

  const printReason = t('print.empty');
  const list: CommandDescriptor[] = [
    make('paste', t('ribbon.cmd.paste'), () => actions.paste(store.getState().playback.positionTicks), {
      shortcut: { key: 'v', mod: true },
      enabled: !clipboardEmpty,
      disabledReason: t('ribbon.reason.clipboardEmpty'),
    }),
    make('cut', t('ribbon.cmd.cut'), actions.cut, { shortcut: { key: 'x', mod: true }, enabled: ids.length > 0, disabledReason: noSelection }),
    make('copy', t('ribbon.cmd.copy'), actions.copy, { shortcut: { key: 'c', mod: true }, enabled: ids.length > 0, disabledReason: noSelection }),
    make('delete', t('ribbon.cmd.delete'), () => actions.dispatch((m) => deleteNotes(m, ids)), {
      shortcut: { key: 'Delete' },
      enabled: ids.length > 0,
      disabledReason: noSelection,
    }),
    make('undo', t('toolbar.undo'), actions.undo, {
      shortcut: { key: 'z', mod: true },
      enabled: canUndo,
      disabledReason: t('ribbon.reason.nothingToUndo'),
    }),
    make('redo', t('toolbar.redo'), actions.redo, {
      shortcut: { key: 'z', mod: true, shift: true },
      enabled: canRedo,
      disabledReason: t('ribbon.reason.nothingToRedo'),
    }),
    make('playPause', playing ? t('toolbar.pause') : t('toolbar.play'), controller.toggle, {
      icon: playing ? PAUSE_ICON : COMMAND_ICON.playPause,
      shortcut: { key: ' ' },
      enabled: !(empty && !playing),
      disabledReason: t('playback.empty'),
      ...(audioError ? { reason: t('audio.unavailable') } : {}),
    }),
    make('toStart', t('toolbar.toStart'), controller.toStart, { shortcut: { key: 'Home' } }),
    markCommand('staccato'),
    markCommand('tenuto'),
    make('legato', t('ribbon.cmd.legato'), () => actions.dispatch((m) => setLegato(m, ids, !artic.legatoApplied)), {
      name: t('articulation.legato'),
      pressed: artic.legatoApplied,
      enabled: artic.canApplyLegato || artic.canRemoveLegato,
      disabledReason: ids.length === 0 ? noSelection : t('ribbon.reason.legatoUnavailable'),
    }),
    make('transpose', t('toolbar.transpose'), dialogs.openTranspose),
    make('library', t('toolbar.library'), dialogs.openLibrary),
    make('import', t('toolbar.import'), dialogs.pickImportFile),
    make('exportFile', t('toolbar.exportFile'), () => {
      const { filename, text } = library.exportCurrent();
      downloadText(filename, text);
    }),
    make('exportMidi', t('toolbar.exportMidi'), () => void exportMidi(), { enabled: !empty, disabledReason: t('export.emptyMidi') }),
    make('printSheet', t('toolbar.printSheet'), () => dialogs.print('sheet'), { enabled: !empty, disabledReason: printReason }),
    make('printWithFingering', t('toolbar.printWithFingering'), () => dialogs.print('sheetWithFingering'), {
      enabled: !empty,
      disabledReason: printReason,
    }),
    ...PANEL_IDS.map(panelCommand),
    make('zoomIn', t('toolbar.zoomIn'), () => zoom(ZOOM_STEP), {
      shortcut: { key: 'wheel', mod: true },
      enabled: pxPerTick < MAX_PX_PER_TICK,
    }),
    make('zoomOut', t('toolbar.zoomOut'), () => zoom(1 / ZOOM_STEP), {
      shortcut: { key: 'wheel', mod: true },
      enabled: pxPerTick > MIN_PX_PER_TICK,
    }),
    make(
      'collapseRibbon',
      ribbon.collapsed ? t('ribbon.pin') : t('ribbon.collapse'),
      () => actions.setPrefs({ ribbon: { ...ribbon, collapsed: !ribbon.collapsed } }),
      { expanded: !ribbon.collapsed, ...(ribbon.collapsed ? { icon: PIN_ICON } : {}) },
    ),
  ];
  return Object.fromEntries(list.map((c) => [c.id, c])) as Record<CommandId, CommandDescriptor>;
}
