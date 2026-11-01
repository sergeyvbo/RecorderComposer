import { describe, expect, it } from 'vitest';
import { COMMAND_IDS, FIELD_IDS, RIBBON_LAYOUT } from '@/ui/Ribbon/layout';

const items = RIBBON_LAYOUT.flatMap((t) => t.groups.flatMap((g) => g.items));

describe('ribbon layout (003 contracts/ui-contract.md)', () => {
  it('has the four tabs in order with the contract groups', () => {
    expect(RIBBON_LAYOUT.map((t) => [t.id, t.groups.map((g) => g.id)])).toEqual([
      ['home', ['clipboard', 'history', 'playback', 'articulation']],
      ['melody', ['properties', 'transform']],
      ['file', ['melodies', 'export', 'print']],
      ['view', ['panels', 'zoom', 'grid', 'language']],
    ]);
  });

  it('places every command (except collapse) and every field exactly once', () => {
    const commands = items.flatMap((i) => ('command' in i ? [i.command] : []));
    const fields = items.flatMap((i) => ('field' in i ? [i.field] : []));
    expect([...commands].sort()).toEqual(COMMAND_IDS.filter((c) => c !== 'collapseRibbon').sort());
    expect([...fields].sort()).toEqual([...FIELD_IDS].sort());
  });

  it('shows paste, play/pause, transpose and the library as large buttons', () => {
    const large = items.flatMap((i) => ('command' in i && i.size === 'large' ? [i.command] : []));
    expect(large.sort()).toEqual(['library', 'paste', 'playPause', 'transpose']);
  });
});
