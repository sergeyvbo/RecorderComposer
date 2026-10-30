import { GRID_MIN, MAX_PITCH, MIN_PITCH, type Melody } from './types';

/** Returns a list of violated invariants (data-model.md); empty when the melody is valid. */
export function checkInvariants(m: Melody): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  m.notes.forEach((n, i) => {
    if (!Number.isInteger(n.pitch) || n.pitch < MIN_PITCH || n.pitch > MAX_PITCH) {
      errors.push(`note ${n.id}: pitch ${n.pitch} out of range`);
    }
    if (!Number.isInteger(n.start) || n.start < 0 || n.start % GRID_MIN !== 0) {
      errors.push(`note ${n.id}: invalid start ${n.start}`);
    }
    if (!Number.isInteger(n.duration) || n.duration < GRID_MIN || n.duration % GRID_MIN !== 0) {
      errors.push(`note ${n.id}: invalid duration ${n.duration}`);
    }
    if (ids.has(n.id)) errors.push(`note ${n.id}: duplicate id`);
    ids.add(n.id);
    const next = m.notes[i + 1];
    if (next) {
      if (next.start < n.start) errors.push(`notes not sorted at ${n.id}`);
      else if (n.start + n.duration > next.start) errors.push(`notes ${n.id} and ${next.id} overlap`);
    }
  });
  return errors;
}
