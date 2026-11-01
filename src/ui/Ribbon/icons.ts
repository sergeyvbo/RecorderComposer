import {
  ArrowUpDown,
  ChartGantt,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  FileDown,
  FileMusic,
  FolderOpen,
  Gauge,
  Grid3x3,
  Hand,
  KeyRound,
  Languages,
  Library,
  Metronome,
  Music,
  Pause,
  Pin,
  Play,
  Printer,
  PrinterCheck,
  Redo2,
  Scissors,
  SkipBack,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { LegatoFace, StaccatoFace, TenutoFace } from './faces';
import type { CommandId, FieldId } from './layout';

/** Lucide icons (ISC, public/licenses/lucide-LICENSE.txt) take the text colour, so themes just work. */
/** Rendered without props; size and stroke come from CSS (.rb-icon svg). */
export type IconComponent = ComponentType<object>;

/** The single import point for ribbon icons: command / field id → icon (contracts/ui-contract.md). */
export const COMMAND_ICON: Record<CommandId, IconComponent> = {
  paste: ClipboardPaste,
  cut: Scissors,
  copy: Copy,
  delete: Trash2,
  undo: Undo2,
  redo: Redo2,
  playPause: Play,
  toStart: SkipBack,
  staccato: StaccatoFace,
  tenuto: TenutoFace,
  legato: LegatoFace,
  transpose: ArrowUpDown,
  library: Library,
  import: FolderOpen,
  exportFile: FileDown,
  exportMidi: FileMusic,
  printSheet: Printer,
  printWithFingering: PrinterCheck,
  panelTimeline: ChartGantt,
  panelSheet: Music,
  panelFingering: Hand,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  collapseRibbon: ChevronUp,
};

export const PAUSE_ICON: IconComponent = Pause;
export const PIN_ICON: IconComponent = Pin;
export const FOLDED_GROUP_ICON: IconComponent = ChevronDown;

export const FIELD_ICON: Record<FieldId, IconComponent> = {
  tempo: Gauge,
  key: KeyRound,
  timeSignature: Metronome,
  snap: Grid3x3,
  language: Languages,
  noteNaming: Type,
};
