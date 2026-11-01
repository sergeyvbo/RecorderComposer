export type GroupState = 'full' | 'iconsOnly' | 'folded';

export interface FitGroup {
  id: string;
  /** Measured width in each state, including the gap after the group. */
  widths: Record<GroupState, number>;
  /** Has small commands whose labels can be hidden. */
  hasSmall: boolean;
}

/**
 * Least compact state per group that fits `available` (003 research R7): first the small labels go,
 * rightmost group first; then groups fold into a drop-down, rightmost first; the first group never
 * folds. Steps that would not save width are skipped, so a wider ribbon is never more compact.
 */
export function fitLevels(groups: readonly FitGroup[], available: number): Record<string, GroupState> {
  const state: GroupState[] = groups.map(() => 'full');
  const width = (i: number) => (groups[i] as FitGroup).widths[state[i] as GroupState];
  let total = groups.reduce((sum, _, i) => sum + width(i), 0);
  const steps: [number, GroupState][] = [];
  for (let i = groups.length - 1; i >= 0; i--) if (groups[i]?.hasSmall) steps.push([i, 'iconsOnly']);
  for (let i = groups.length - 1; i >= 1; i--) steps.push([i, 'folded']);
  for (const [i, next] of steps) {
    if (total <= available) break;
    const before = width(i);
    const after = (groups[i] as FitGroup).widths[next];
    if (after >= before) continue;
    state[i] = next;
    total += after - before;
  }
  return Object.fromEntries(groups.map((grp, i) => [grp.id, state[i] as GroupState]));
}
