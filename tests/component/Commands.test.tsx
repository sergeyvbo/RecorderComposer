import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCommands, type CommandDescriptor } from '@/ui/commands/useCommands';
import type { CommandId } from '@/ui/Ribbon/layout';
import { melodyWith, Q } from '../unit/domain/helpers';
import { setupRibbon } from './renderApp';

let commands: Record<CommandId, CommandDescriptor>;
function Probe() {
  commands = useCommands();
  return null;
}

function renderCommands() {
  const utils = setupRibbon(<Probe />);
  const notes = ['a', 'b', 'c'].map((id, i) => ({ id, pitch: 72 + i, start: i * Q, duration: Q }));
  act(() => utils.store.getState().actions.openMelody(melodyWith(notes)));
  return utils;
}

describe('useCommands (003 data-model enabling rules)', () => {
  it('needs a selection for cut, copy and delete, and a clipboard for paste', () => {
    const { store } = renderCommands();
    for (const id of ['cut', 'copy', 'delete'] as const) {
      expect(commands[id]).toMatchObject({ enabled: false, reason: 'Select notes first' });
    }
    expect(commands.paste).toMatchObject({ enabled: false, reason: 'Nothing has been copied yet', label: 'Paste' });
    act(() => store.getState().actions.select(['a', 'b']));
    expect(commands.copy.enabled).toBe(true);
    act(() => commands.copy.run());
    expect(commands.paste.enabled).toBe(true);
  });

  it('pastes after the selection, or at the playhead with nothing selected, and selects the pasted notes', () => {
    const { store } = renderCommands();
    act(() => store.getState().actions.select(['a']));
    act(() => commands.copy.run());
    act(() => commands.paste.run());
    // Inserted right after "a"; "b" and "c" move one quarter right.
    expect(store.getState().melody.notes.map((n) => [n.pitch, n.start])).toEqual([[72, 0], [72, Q], [73, 2 * Q], [74, 3 * Q]]);
    const pasted = store.getState().melody.notes[1];
    expect([...store.getState().selection.ids]).toEqual([pasted?.id]);

    act(() => store.getState().actions.clearSelection());
    act(() => store.getState().actions.setPlayback({ positionTicks: 0 }));
    act(() => commands.paste.run());
    expect(store.getState().melody.notes.map((n) => n.start)).toEqual([0, Q, 2 * Q, 3 * Q, 4 * Q]);
    expect(store.getState().melody.notes[0]?.pitch).toBe(72);
  });

  it('deletes the selection as one undo step; undo and redo follow history', () => {
    const { store } = renderCommands();
    expect(commands.undo).toMatchObject({ enabled: false, reason: 'Nothing to undo' });
    act(() => store.getState().actions.select(['b']));
    act(() => commands.delete.run());
    expect(store.getState().melody.notes.map((n) => n.id)).toEqual(['a', 'c']);
    expect(commands.undo.enabled).toBe(true);
    act(() => commands.undo.run());
    expect(store.getState().melody.notes).toHaveLength(3);
    expect(commands.redo.enabled).toBe(true);
  });

  it('panel toggles are pressed while shown and the last visible panel cannot be hidden', () => {
    const { store } = renderCommands();
    expect(commands.panelSheet).toMatchObject({ pressed: true, enabled: true, label: 'Sheet music' });
    act(() => commands.panelSheet.run());
    act(() => commands.panelFingering.run());
    expect(store.getState().prefs.panels.sheet.visible).toBe(false);
    expect(commands.panelTimeline).toMatchObject({ pressed: true, enabled: false, reason: 'At least one panel stays visible' });
    expect(commands.panelSheet.pressed).toBe(false);
  });

  it('play/pause follows the playback status and is disabled for an empty melody', () => {
    const { store } = renderCommands();
    expect(commands.playPause).toMatchObject({ name: 'Play', enabled: true });
    act(() => store.getState().actions.setPlayback({ status: 'playing' }));
    expect(commands.playPause.name).toBe('Pause');
    act(() => store.getState().actions.setPlayback({ status: 'stopped' }));
    act(() => store.getState().actions.select(['a', 'b', 'c']));
    act(() => commands.delete.run());
    expect(commands.playPause).toMatchObject({ enabled: false, reason: 'Add notes to play the melody' });
  });

  it('keeps accessible names of the existing toolbar controls', () => {
    renderCommands();
    expect(commands.library.name).toBe('Melodies…');
    expect(commands.exportFile.name).toBe('Export file');
    expect(commands.staccato).toMatchObject({ name: 'Staccato (S)', label: 'Staccato' });
    expect(commands.transpose.name).toBe('Transpose…');
  });
});

