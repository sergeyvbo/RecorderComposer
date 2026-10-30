import { expect, test } from '@playwright/test';
import { clickCell, openFresh } from './helpers';

// quickstart.md scenario 7
test('key signature and transposition with out-of-range handling', async ({ page }) => {
  await openFresh(page);
  await clickCell(page, 82, 5); // B♭ (written B♭4)
  await clickCell(page, 98, 80); // D7, top of the range

  await page.getByRole('combobox', { name: 'Key' }).selectOption('F-major');
  await expect(page.getByTestId('note').first()).toHaveAttribute('aria-label', 'B♭4');

  await page.getByRole('button', { name: 'Transpose…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Transpose' });
  await dialog.getByRole('radio', { name: 'By semitones' }).check();
  await dialog.getByRole('spinbutton', { name: 'Semitones' }).fill('2');
  await expect(dialog.getByRole('status')).toContainText('1 note would leave the recorder range');
  await expect(dialog.getByRole('button', { name: 'Transpose', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Transpose an octave lower instead' }).click();
  await expect(page.getByTestId('note').last()).toHaveAttribute('aria-label', 'E5');
});
