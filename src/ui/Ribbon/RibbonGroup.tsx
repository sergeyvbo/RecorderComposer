import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommandDescriptor } from '../commands/useCommands';
import type { GroupState } from './fit';
import { FOLDED_GROUP_ICON } from './icons';
import type { CommandId, RibbonGroupDef } from './layout';
import { RibbonButton } from './RibbonButton';
import { RibbonField } from './fields';

interface Props {
  group: RibbonGroupDef;
  state: GroupState;
  commands: Record<CommandId, CommandDescriptor>;
  onRun: (c: CommandDescriptor) => void;
}

function Items({ group, commands, onRun, iconsOnly }: Omit<Props, 'state'> & { iconsOnly: boolean }) {
  return (
    <div className="ribbon-group-items">
      {group.items.map((item) =>
        'command' in item ? (
          <RibbonButton key={item.command} command={commands[item.command]} size={item.size} iconsOnly={iconsOnly} onRun={onRun} />
        ) : (
          <RibbonField key={item.field} id={item.field} compact={iconsOnly} />
        ),
      )}
    </div>
  );
}

/**
 * A labelled cluster of commands (003 FR-001, FR-013). Folded, it becomes one button that opens the
 * group's full content in a drop-down; Escape or a click outside closes it.
 */
export function RibbonGroup({ group, state, commands, onRun }: Props) {
  const { t } = useTranslation();
  const name = t(`ribbon.group.${group.id}`);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const folded = state === 'folded';
  const Chevron = FOLDED_GROUP_ICON;

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);
  useEffect(() => {
    if (!folded) setOpen(false);
  }, [folded]);
  // Keep the drop-down inside the window: shift it left when it would overflow on the right.
  const dropdown = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = dropdown.current;
    if (!open || !el) return;
    el.style.left = '0px';
    const r = el.getBoundingClientRect();
    const over = r.right - (document.documentElement.clientWidth - 4);
    if (over > 0) el.style.left = `${-Math.max(0, Math.min(over, r.left - 4))}px`;
  }, [open]);

  const caption = (
    <span className="ribbon-group-caption" aria-hidden>
      {name}
    </span>
  );
  if (!folded) {
    return (
      <div className="ribbon-group" role="group" aria-label={name} data-group={group.id} data-fit={state}>
        <Items group={group} commands={commands} onRun={onRun} iconsOnly={state === 'iconsOnly'} />
        {caption}
      </div>
    );
  }
  return (
    <div
      ref={root}
      className="ribbon-group folded"
      data-group={group.id}
      data-fit={state}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className="rb rb-large ribbon-group-button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rb-label">{name}</span>
        <span className="rb-icon" aria-hidden>
          <Chevron />
        </span>
      </button>
      {open && (
        <div ref={dropdown} className="ribbon-dropdown" role="group" aria-label={name}>
          <Items
            group={group}
            commands={commands}
            iconsOnly={false}
            onRun={(c) => {
              setOpen(false);
              onRun(c);
            }}
          />
        </div>
      )}
    </div>
  );
}
