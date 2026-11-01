/** A keyboard shortcut shown in a tooltip; `key: 'wheel'` is the mouse wheel. Display only. */
export interface Shortcut {
  key: string;
  mod?: true;
  shift?: true;
}

const NAMED: Record<string, string> = { ' ': 'Space', Delete: 'Delete', Home: 'Home' };

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return /mac|iphone|ipad/i.test(data?.platform ?? navigator.platform ?? '');
}

/** "Ctrl+Shift+Z" / "⌘⇧Z"; the wheel is spelled out with the translated word. */
export function shortcutLabel(s: Shortcut, opts: { mac: boolean; wheel: string }): string {
  const key = s.key === 'wheel' ? opts.wheel : (NAMED[s.key] ?? s.key.toUpperCase());
  if (opts.mac) {
    const mods = `${s.mod ? '⌘' : ''}${s.shift ? '⇧' : ''}`;
    return s.key === 'wheel' && mods ? `${mods}+${key}` : `${mods}${key}`;
  }
  return [s.mod && 'Ctrl', s.shift && 'Shift', key].filter(Boolean).join('+');
}
