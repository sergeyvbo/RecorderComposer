import { expect, test } from '@playwright/test';
import { clickCell, openFresh, quickAccess, tabPanel } from './helpers';

// quickstart.md scenario 3 (audio output itself is not asserted)
test('playback moves one playhead across panels and highlights the playing note', async ({ page }) => {
  await openFresh(page);
  await page.getByRole('spinbutton', { name: 'Tempo' }).fill('60');
  for (const [i, p] of [72, 74, 76, 77].entries()) await clickCell(page, p, i * 75 + 5);

  const playhead = page.getByTestId('playhead');
  // Some test browsers (Playwright WebKit on Windows) have no Web Audio: the app must say so.
  if (!(await page.evaluate(() => 'AudioContext' in window || 'webkitAudioContext' in window))) {
    await page.keyboard.press('Space');
    await expect(page.getByText('Sound could not be started in this browser')).toBeVisible();
    test.skip(true, 'no Web Audio in this browser build');
  }
  await page.keyboard.press('Space');
  await expect(quickAccess(page).getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(tabPanel(page).getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.waitForTimeout(1500);
  const x1 = (await playhead.boundingBox())!.x;
  await expect(page.getByTestId('note').nth(1)).toHaveAttribute('data-playing', 'true');
  await page.waitForTimeout(500);
  expect((await playhead.boundingBox())!.x).toBeGreaterThan(x1);

  await page.keyboard.press('Space');
  const paused = (await playhead.boundingBox())!.x;
  await page.waitForTimeout(400);
  expect((await playhead.boundingBox())!.x).toBe(paused);

  // Click the ruler at bar 1 beat 3 (tick 960 → 150 px).
  const ruler = (await page.getByTestId('time-ruler').boundingBox())!;
  await page.mouse.click(ruler.x + 150, ruler.y + ruler.height / 2);
  const grid = (await page.getByTestId('timeline-grid').boundingBox())!;
  expect(Math.abs((await playhead.boundingBox())!.x - (grid.x + 150))).toBeLessThan(3);
});
