import { expect, test } from '@playwright/test';
import { MAX_PITCH, ROW_HEIGHT, clickCell, openFresh, openTab } from './helpers';

// quickstart.md scenario 2
test('sheet music and fingerings follow the timeline on one time axis', async ({ page }) => {
  await openFresh(page);
  const scale = [72, 74, 76, 77, 79, 81, 83, 84];
  for (const [i, p] of scale.entries()) await clickCell(page, p, i * 75 + 5);

  await expect(page.getByTestId('staff-note')).toHaveCount(8);
  await expect(page.getByTestId('fingering')).toHaveCount(8);

  // Each fingering diagram sits under its timeline rectangle (shared x axis).
  const rects = page.getByTestId('note');
  const diagrams = page.getByTestId('fingering');
  for (const i of [0, 3, 7]) {
    const r = (await rects.nth(i).boundingBox())!;
    const d = (await diagrams.nth(i).boundingBox())!;
    expect(Math.abs(r.x - d.x)).toBeLessThan(3);
  }

  // Stretch the last note across the bar line: tie on the staff, still one diagram.
  const grid = (await page.getByTestId('timeline-grid').boundingBox())!;
  const y = grid.y + (MAX_PITCH - 84) * ROW_HEIGHT + ROW_HEIGHT / 2;
  await page.mouse.move(grid.x + 8 * 75 - 2, y);
  await page.mouse.down();
  await page.mouse.move(grid.x + 9 * 75 + 30, y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('fingering')).toHaveCount(8);
  await expect(page.getByTestId('staff-note')).toHaveCount(9);

  // Selecting a note on the staff highlights it in the timeline.
  await page.getByTestId('staff-note').first().click();
  await expect(rects.first()).toHaveAttribute('aria-selected', 'true');

  // Hide the sheet panel; reload keeps the layout.
  await openTab(page, 'View');
  await page.getByRole('button', { name: 'Sheet music', exact: true }).click();
  await expect(page.getByTestId('panel-sheet')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('panel-sheet')).toHaveCount(0);
  await expect(page.getByTestId('panel-fingering')).toBeVisible();
});
