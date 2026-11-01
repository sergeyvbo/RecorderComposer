import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommandDescriptor } from '../commands/useCommands';
import { isMac, shortcutLabel } from './shortcutLabel';
import { Tooltip, useTooltip } from './Tooltip';

export interface RibbonButtonProps {
  command: CommandDescriptor;
  size: 'large' | 'small';
  /** Small commands only: hide the label, keep icon and tooltip (FR-013). */
  iconsOnly?: boolean;
  /** Runs the command; the ribbon wraps it to close its popup or a folded group. */
  onRun?: (c: CommandDescriptor) => void;
}

/** A ribbon or quick-access command: icon + label, tooltip with shortcut and reason (003 FR-004, FR-008). */
export function RibbonButton({ command: c, size, iconsOnly = false, onRun }: RibbonButtonProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLButtonElement>(null);
  const tip = useTooltip(ref);
  const Icon = c.icon;
  const shortcut = c.shortcut ? shortcutLabel(c.shortcut, { mac: isMac(), wheel: t('ribbon.key.wheel') }) : null;
  const showLabel = size === 'large' || !iconsOnly;
  const { onPointerEnter, onPointerLeave, ...focusHandlers } = tip.handlers;
  return (
    // Hover is tracked on a wrapper: disabled buttons get no pointer events (pointer-events: none).
    <span className={`rb-wrap rb-wrap-${size}`} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <button
        ref={ref}
        type="button"
        className={`rb rb-${size}${c.pressed !== undefined ? ' toggle' : ''}`}
        data-command={c.id}
        aria-label={c.name}
        aria-pressed={c.pressed}
        aria-expanded={c.expanded}
        aria-describedby={tip.open ? tip.id : undefined}
        disabled={!c.enabled}
        onClick={() => (onRun ? onRun(c) : c.run())}
        {...focusHandlers}
      >
        <span className="rb-icon" aria-hidden>
          <Icon />
        </span>
        {showLabel && (
          <span className="rb-label" aria-hidden>
            {c.label}
          </span>
        )}
      </button>
      <Tooltip id={tip.id} open={tip.open} anchor={ref}>
        <span className="tip-name">
          {c.name}
          {shortcut && ` (${shortcut})`}
        </span>
        {c.reason && <span className="tip-reason">{c.reason}</span>}
      </Tooltip>
    </span>
  );
}
