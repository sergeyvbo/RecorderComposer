import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { clickCell, noteCount, openFresh } from './helpers';

// quickstart.md scenario 4
test('auto-save survives a reload; export, delete and import round-trip', async ({ page }, info) => {
  await openFresh(page);
  for (const [i, p] of [72, 76, 79].entries()) await clickCell(page, p, i * 75 + 5);
  await page.getByRole('textbox', { name: 'Melody title' }).fill('Round trip');
  await page.getByRole('textbox', { name: 'Melody title' }).press('Enter');

  // Close quickly after the last edit, reopen: everything is there.
  await page.waitForTimeout(100);
  await page.reload();
  await expect(page.getByTestId('note')).toHaveCount(3);
  await expect(page.getByRole('textbox', { name: 'Melody title' })).toHaveValue('Round trip');

  // Export to a file.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export file' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Round trip.rcm.json');
  const file = info.outputPath('round-trip.rcm.json');
  await download.saveAs(file);

  // Delete from the library (in-app confirmation).
  await page.getByRole('button', { name: 'Melodies…' }).click();
  const row = page.getByRole('listitem').filter({ hasText: 'Round trip' });
  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Round trip' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();

  // Import the file: identical melody.
  await page.getByTestId('import-input').setInputFiles(file);
  await expect(page.getByTestId('note')).toHaveCount(3);
  await expect(page.getByRole('textbox', { name: 'Melody title' })).toHaveValue('Round trip');

  // An invalid file shows an error and leaves the melody untouched.
  const bad = info.outputPath('bad.txt');
  writeFileSync(bad, 'not a melody');
  await page.getByTestId('import-input').setInputFiles(bad);
  await expect(page.getByRole('alert')).toContainText('not a melody file');
  expect(await noteCount(page)).toBe(3);
});
