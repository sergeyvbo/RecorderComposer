import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { clickCell, openFresh } from './helpers';

async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    window.print = () => undefined;
  });
}

// quickstart.md scenario 5
test('print view in both modes: title, systems, fingerings, no app chrome', async ({ page }) => {
  await stubPrint(page);
  await openFresh(page);
  for (const [i, p] of [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91].entries()) await clickCell(page, p, i * 75 + 5);

  await page.getByRole('button', { name: 'Print sheet music' }).click();
  const view = page.getByTestId('print-view');
  await expect(view).toHaveAttribute('data-mode', 'sheet');
  await expect(page.getByTestId('print-fingering')).toHaveCount(0);

  await page.getByRole('button', { name: 'Print with fingerings' }).click();
  await expect(view).toHaveAttribute('data-mode', 'sheetWithFingering');
  await expect(page.getByTestId('print-fingering')).toHaveCount(12);

  await page.emulateMedia({ media: 'print' });
  await expect(view.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.app')).toBeHidden();
  expect(await page.getByTestId('print-system').count()).toBeGreaterThanOrEqual(1);
});

for (const [paper, widthMm, heightMm] of [
  ['A4', 210, 297],
  ['Letter', 215.9, 279.4],
] as const) {
  test(`32-bar melody fits ${paper} pages without overflow or split systems (SC-008)`, async ({ page }) => {
    await stubPrint(page);
    await openFresh(page);
    await page.getByTestId('import-input').setInputFiles('tests/fixtures/print-32-bars.rcm.json');
    await expect(page.getByTestId('note').first()).toBeVisible();
    await page.getByRole('button', { name: 'Print with fingerings' }).click();
    await page.emulateMedia({ media: 'print' });
    const mmToPx = 96 / 25.4;
    await page.setViewportSize({ width: Math.round((widthMm - 30) * mmToPx), height: Math.round((heightMm - 30) * mmToPx) });
    const pageWidth = (widthMm - 30) * mmToPx;
    const pageHeight = (heightMm - 30) * mmToPx;
    const boxes = await page.getByTestId('print-system').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
      }),
    );
    expect(boxes.length).toBeGreaterThan(1);
    for (const b of boxes) {
      expect(b.right).toBeLessThanOrEqual(pageWidth + 1);
      // A system never needs more than one page, so `break-inside: avoid` can always keep it whole.
      expect(b.bottom - b.top).toBeLessThan(pageHeight);
    }
    const pdf = await page.pdf({ format: paper, margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } }).catch(() => null);
    if (pdf) expect(pdf.byteLength).toBeGreaterThan(1000);
  });
}

// 002 quickstart scenario 6.3: articulations in print, including a slur across a system break.
test('print shows marks in both modes and splits a slur at system breaks', async ({ page }) => {
  await stubPrint(page);
  await openFresh(page);
  await page.getByTestId('import-input').setInputFiles('tests/fixtures/print-32-bars.rcm.json');
  await expect(page.getByTestId('note').first()).toBeVisible();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('s');
  await page.keyboard.press('l');
  // The timeline renders only the notes in view; print shows every note of the fixture.
  const noteCount = (JSON.parse(readFileSync('tests/fixtures/print-32-bars.rcm.json', 'utf-8')) as { melody: { notes: unknown[] } })
    .melody.notes.length;

  for (const name of ['Print sheet music', 'Print with fingerings']) {
    await page.getByRole('button', { name }).click();
    const view = page.getByTestId('print-view');
    await expect(view.getByTestId('artic-mark')).toHaveCount(noteCount);
    const systems = await view.getByTestId('print-system').count();
    expect(systems).toBeGreaterThan(1);
    // One slur over the whole melody: one piece per system, open at every break.
    const pieces = await view.getByTestId('slur').evaluateAll((els) =>
      els.map((el) => [el.getAttribute('data-from') !== '', el.getAttribute('data-to') !== '']),
    );
    expect(pieces).toHaveLength(systems);
    expect(pieces[0]).toEqual([true, false]);
    expect(pieces.at(-1)).toEqual([false, true]);
    expect(pieces.slice(1, -1).every(([from, to]) => !from && !to)).toBe(true);
  }
});
