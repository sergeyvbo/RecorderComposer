import { expect, test } from '@playwright/test';
import { clickCell, MAX_PITCH, noteCount, openFresh, ROW_HEIGHT } from './helpers';

// quickstart.md scenario 1
test('compose: add notes, clamp at neighbour and range, box-select delete and undo', async ({ page }) => {
  await openFresh(page);
  const scale = [72, 74, 76, 77, 79, 81, 83, 84];
  // Default zoom: 1 quarter = 75 px; click at the middle of each quarter.
  for (const [i, p] of scale.entries()) await clickCell(page, p, i * 75 + 5);
  await expect(page.getByTestId('note')).toHaveCount(8);

  const grid = page.getByTestId('timeline-grid');
  const box = (await grid.boundingBox())!;
  const rowY = (p: number) => box.y + (MAX_PITCH - p) * ROW_HEIGHT + ROW_HEIGHT / 2;

  // Drag the second note (D) right by 1.5 quarters so its start lands inside E: it stops at its
  // last valid position and E is unchanged.
  const eBefore = await page.getByTestId('note').nth(2).boundingBox();
  await page.mouse.move(box.x + 100, rowY(74));
  await page.mouse.down();
  await page.mouse.move(box.x + 100 + 112, rowY(74), { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('note')).toHaveCount(8);
  expect(await page.getByTestId('note').nth(2).boundingBox()).toEqual(eBefore);

  // Drag the top note far above D7: it stays at D7. Scroll it near the panel's bottom first so
  // the whole drag stays inside the window (browsers stop reporting a pointer that leaves it).
  const timeline = page.locator('.timeline');
  await timeline.evaluate((el, y) => (el.scrollTop += y - el.getBoundingClientRect().bottom + 30), rowY(84));
  const top = (await page.getByTestId('note').last().boundingBox())!;
  await page.mouse.move(top.x + 20, top.y + top.height / 2);
  await page.mouse.down();
  await page.mouse.move(top.x + 20, top.y - 20 * ROW_HEIGHT, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('note').last()).toHaveAttribute('aria-label', /D6/);
  // Dragging past the panel must not select page text.
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');

  // Box-select the first three notes, delete, undo. The grid is taller than its panel: scroll the
  // low notes into view and drag across the panel's visible height, starting from an empty cell.
  await page.locator('.timeline').evaluate((el) => (el.scrollTop = el.scrollHeight));
  const panel = (await page.locator('.timeline').boundingBox())!;
  await page.mouse.move(box.x + 2, panel.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 3 * 75 - 10, panel.y + panel.height - 2, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.press('Delete');
  expect(await noteCount(page)).toBe(5);
  await page.keyboard.press('Control+z');
  expect(await noteCount(page)).toBe(8);
});
