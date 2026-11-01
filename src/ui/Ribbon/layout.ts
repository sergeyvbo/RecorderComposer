import type { RibbonTabId } from '@/state/prefs';

/** Ribbon commands and value fields (003 data-model.md); laid out by RIBBON_LAYOUT. */
export const COMMAND_IDS = [
  'paste',
  'cut',
  'copy',
  'delete',
  'undo',
  'redo',
  'playPause',
  'toStart',
  'staccato',
  'tenuto',
  'legato',
  'transpose',
  'library',
  'import',
  'exportFile',
  'exportMidi',
  'printSheet',
  'printWithFingering',
  'panelTimeline',
  'panelSheet',
  'panelFingering',
  'zoomIn',
  'zoomOut',
  'collapseRibbon',
] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

export const FIELD_IDS = ['tempo', 'key', 'timeSignature', 'snap', 'language', 'noteNaming'] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export type RibbonItem = { command: CommandId; size: 'large' | 'small' } | { field: FieldId };
export interface RibbonGroupDef {
  id: string;
  items: RibbonItem[];
}
export interface RibbonTabDef {
  id: RibbonTabId;
  groups: RibbonGroupDef[];
}

const large = (command: CommandId): RibbonItem => ({ command, size: 'large' });
const small = (command: CommandId): RibbonItem => ({ command, size: 'small' });
const field = (id: FieldId): RibbonItem => ({ field: id });

/** Tabs → groups → items, exactly as contracts/ui-contract.md; labels are `ribbon.tab.*` / `ribbon.group.*`. */
export const RIBBON_LAYOUT: readonly RibbonTabDef[] = [
  {
    id: 'home',
    groups: [
      { id: 'clipboard', items: [large('paste'), small('cut'), small('copy'), small('delete')] },
      { id: 'history', items: [small('undo'), small('redo')] },
      { id: 'playback', items: [large('playPause'), small('toStart'), field('tempo')] },
      { id: 'articulation', items: [small('staccato'), small('tenuto'), small('legato')] },
    ],
  },
  {
    id: 'melody',
    groups: [
      { id: 'properties', items: [field('key'), field('timeSignature')] },
      { id: 'transform', items: [large('transpose')] },
    ],
  },
  {
    id: 'file',
    groups: [
      { id: 'melodies', items: [large('library'), small('import')] },
      { id: 'export', items: [small('exportFile'), small('exportMidi')] },
      { id: 'print', items: [small('printSheet'), small('printWithFingering')] },
    ],
  },
  {
    id: 'view',
    groups: [
      { id: 'panels', items: [small('panelTimeline'), small('panelSheet'), small('panelFingering')] },
      { id: 'zoom', items: [small('zoomIn'), small('zoomOut')] },
      { id: 'grid', items: [field('snap')] },
      { id: 'language', items: [field('language'), field('noteNaming')] },
    ],
  },
];
