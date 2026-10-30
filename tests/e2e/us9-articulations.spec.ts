import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { clickCell, openFresh } from './helpers';

/** Adjacent quarter notes from tick 0 (75 px each at the default zoom); keep to upper rows so they stay clickable. */
async function addNotes(page: Page, pitches: number[]) {
  for (const [i, p] of pitches.entries()) await clickCell(page, p, i * 75 + 5);
  await expect(page.getByTestId('note')).toHaveCount(pitches.length);
}

/** Select timeline notes by index (0-based): click the first, shift-click the rest. */
async function select(page: Page, ...indices: number[]) {
  const notes = page.getByTestId('note');
  // Clicking an already-selected note keeps the selection (group drag), so start from none.
  await page.keyboard.press('Escape');
  for (const [k, i] of indices.entries()) {
    // Click the note body (Firefox sizes the SVG group differently from its rectangle).
    await notes.nth(i).locator('rect').first().click({ modifiers: k === 0 ? [] : ['Shift'] });
  }
  await expect(page.locator('[data-testid="note"][aria-selected="true"]')).toHaveCount(indices.length);
}

const sheet = (page: Page) => page.getByTestId('sheet');
const staffMarks = (page: Page) => sheet(page).getByTestId('artic-mark');
const marksOf = (page: Page) => staffMarks(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-mark')));

async function exportNotes(page: Page, path: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export file' }).click();
  const download = await downloadPromise;
  await download.saveAs(path);
  return (JSON.parse(readFileSync(path, 'utf-8')) as { formatVersion: number; melody: { notes: unknown[] } });
}

// quickstart.md scenarios 1, 3 and 6.1
test('mark and slur with shortcuts; kept after reload and through export/import', async ({ page }, info) => {
  await openFresh(page);
  await addNotes(page, [84, 86, 88, 89, 91]);

  // Scenario 1: staccato on notes 1–2, tenuto on note 3.
  await select(page, 0, 1);
  await page.keyboard.press('s');
  await select(page, 2);
  await page.keyboard.press('t');
  expect(await marksOf(page)).toEqual(['staccato', 'staccato', 'tenuto']);
  await expect(page.getByTestId('timeline-mark')).toHaveCount(3);

  // Scenario 3: slur 2–4, extend to 2–5, then split at note 3.
  await select(page, 1, 2, 3);
  await page.keyboard.press('l');
  await expect(sheet(page).getByTestId('slur')).toHaveCount(1);
  await expect(page.getByTestId('slur-arc')).toHaveCount(2);
  await select(page, 3, 4);
  await page.keyboard.press('l');
  await expect(sheet(page).getByTestId('slur')).toHaveCount(1);
  await expect(page.getByTestId('slur-arc')).toHaveCount(3);
  await select(page, 2);
  await page.keyboard.press('Shift+L');
  await expect(page.getByTestId('slur-arc')).toHaveCount(1);
  await expect(sheet(page).getByTestId('slur')).toHaveAttribute('data-from', /.+/);

  // The last note alone cannot be slurred onward, and a selection with gaps is refused with a message.
  await select(page, 4);
  await expect(page.getByRole('button', { name: /^Legato/ })).toHaveAttribute('aria-pressed', 'true');
  await select(page, 0, 2);
  await page.keyboard.press('l');
  await expect(page.getByRole('status').first()).toContainText('Legato needs consecutive notes');
  await expect(page.getByTestId('slur-arc')).toHaveCount(1);

  // Reload: everything is still there.
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByTestId('note')).toHaveCount(5);
  await expect(staffMarks(page)).toHaveCount(3);
  expect(await marksOf(page)).toEqual(['staccato', 'staccato', 'tenuto']);
  await expect(page.getByTestId('slur-arc')).toHaveCount(1);

  // Scenario 6.1: export, import, identical notes (v2 file).
  const before = await exportNotes(page, info.outputPath('before.rcm.json'));
  expect(before.formatVersion).toBe(2);
  await page.getByTestId('import-input').setInputFiles(info.outputPath('before.rcm.json'));
  await expect(page.getByTestId('note')).toHaveCount(5);
  const after = await exportNotes(page, info.outputPath('after.rcm.json'));
  expect(after.melody.notes).toEqual(before.melody.notes);
});

test('cut and paste keeps marks and slurs; a duplicated melody keeps them too', async ({ page }) => {
  await openFresh(page);
  await addNotes(page, [84, 86, 88]);
  await select(page, 0, 1);
  await page.keyboard.press('t');
  await page.keyboard.press('l');
  await expect(page.getByTestId('slur-arc')).toHaveCount(1);

  // Cut the slurred pair and paste it after the last note (playhead moved by the ruler).
  await page.keyboard.press('ControlOrMeta+x');
  await expect(page.getByTestId('note')).toHaveCount(1);
  await page.getByTestId('time-ruler').click({ position: { x: 4 * 75 + 2, y: 5 } });
  await page.keyboard.press('ControlOrMeta+v');
  await expect(page.getByTestId('note')).toHaveCount(3);
  await expect(page.getByTestId('slur-arc')).toHaveCount(1);
  expect(await marksOf(page)).toEqual(['tenuto', 'tenuto']);

  // Duplicate in the library and open the copy.
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Melodies…' }).click();
  await page.getByRole('button', { name: 'Duplicate' }).first().click();
  const copy = page.getByRole('listitem').filter({ hasText: '(copy)' });
  await copy.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Melody title' })).toHaveValue(/\(copy\)/);
  await expect(page.getByTestId('slur-arc')).toHaveCount(1);
  expect(await marksOf(page)).toEqual(['tenuto', 'tenuto']);
});

test('no serious accessibility violations with the articulation toolbar in use', async ({ page }) => {
  await openFresh(page);
  await addNotes(page, [84, 86, 88]);
  await select(page, 0, 1);
  await page.keyboard.press('s');
  await page.keyboard.press('l');
  await expect(page.getByRole('group', { name: 'Articulation' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
