import { expect, test } from '@playwright/test';
import { openFresh } from './helpers';

// quickstart.md scenario 9 (SC-002): an edit on a 500-note melody updates all panels in < 100 ms.
test('edits on a 500-note melody render in under 100 ms', async ({ page }) => {
  await openFresh(page);
  await page.getByTestId('import-input').setInputFiles('tests/fixtures/long-500.rcm.json');
  await expect(page.getByTestId('note').first()).toBeVisible();
  // Scroll the timeline to the note first: not every browser scrolls an SVG element into view.
  await page.locator('.timeline').evaluate((el) => {
    const note = el.querySelector('[data-testid="note"]')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    el.scrollTop += note.top - box.top - box.height / 2;
  });
  // Click by position: Playwright's own scroll-into-view mis-scrolls SVG elements in Firefox.
  const note = (await page.getByTestId('note').first().boundingBox())!;
  await page.mouse.click(note.x + note.width / 2, note.y + note.height / 2);
  await expect(page.getByTestId('note').first()).toHaveAttribute('aria-selected', 'true');
  const times = await page.evaluate(async () => {
    const out: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: i % 2 ? 'ArrowDown' : 'ArrowUp', bubbles: true }));
      document.body.getBoundingClientRect(); // include style + layout of all panels
      out.push(performance.now() - t0);
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  });
  expect(Math.max(...times)).toBeLessThan(100);
});
