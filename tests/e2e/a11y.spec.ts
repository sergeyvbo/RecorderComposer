import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { clickCell, openFresh } from './helpers';

for (const lang of ['en', 'ru'] as const) {
  test(`no serious accessibility violations (${lang})`, async ({ page }) => {
    await openFresh(page, lang);
    for (const [i, p] of [72, 76, 79].entries()) await clickCell(page, p, i * 75 + 5);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test('every toolbar control is keyboard-reachable and named', async ({ page }) => {
  await openFresh(page);
  const unnamed = await page.locator('header button, header select, header input').evaluateAll((els) =>
    els
      .filter((el) => !(el as HTMLElement).hidden && (el as HTMLInputElement).type !== 'file')
      .filter((el) => {
        const name = el.getAttribute('aria-label') ?? el.textContent ?? '';
        return name.trim() === '' || (el as HTMLElement).tabIndex < 0;
      })
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(unnamed).toEqual([]);
});
