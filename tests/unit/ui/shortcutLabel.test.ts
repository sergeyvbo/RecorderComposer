import { describe, expect, it } from 'vitest';
import { shortcutLabel } from '@/ui/Ribbon/shortcutLabel';

const wheel = 'wheel';

describe('shortcutLabel (003 FR-008)', () => {
  it('formats modifier shortcuts per platform', () => {
    expect(shortcutLabel({ key: 'z', mod: true }, { mac: false, wheel })).toBe('Ctrl+Z');
    expect(shortcutLabel({ key: 'z', mod: true }, { mac: true, wheel })).toBe('⌘Z');
    expect(shortcutLabel({ key: 'z', mod: true, shift: true }, { mac: false, wheel })).toBe('Ctrl+Shift+Z');
    expect(shortcutLabel({ key: 'z', mod: true, shift: true }, { mac: true, wheel })).toBe('⌘⇧Z');
  });

  it('names special keys and keeps single letters', () => {
    expect(shortcutLabel({ key: 'Delete' }, { mac: false, wheel })).toBe('Delete');
    expect(shortcutLabel({ key: ' ' }, { mac: false, wheel })).toBe('Space');
    expect(shortcutLabel({ key: 'Home' }, { mac: true, wheel })).toBe('Home');
    expect(shortcutLabel({ key: 's' }, { mac: false, wheel })).toBe('S');
  });

  it('formats the mouse wheel with the translated word', () => {
    expect(shortcutLabel({ key: 'wheel', mod: true }, { mac: false, wheel: 'wheel' })).toBe('Ctrl+wheel');
    expect(shortcutLabel({ key: 'wheel', mod: true }, { mac: true, wheel: 'колесо' })).toBe('⌘+колесо');
  });
});
