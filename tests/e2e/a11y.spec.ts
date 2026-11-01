import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { clickCell, openFresh, openTab } from './helpers';

for (const lang of ['en', 'ru'] as const) {
  test(`no serious accessibility violations (${lang})`, async ({ page }) => {
    await openFresh(page, lang);
    for (const [i, p] of [72, 76, 79].entries()) await clickCell(page, p, i * 75 + 5);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test('every title bar and ribbon control is keyboard-reachable and named', async ({ page }) => {
  await openFresh(page);
  for (const tab of ['Home', 'Melody', 'File', 'View']) {
    await openTab(page, tab);
    const controls = page.locator(
      '.titlebar :is(button, select, input), [role="tabpanel"]:not([hidden]) :is(button, select, input)',
    );
    const unnamed = await controls.evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLInputElement).type !== 'file')
        .filter((el) => {
          const name = el.getAttribute('aria-label') ?? el.textContent ?? '';
          // Disabled controls are skipped by Tab by design; they must still be named.
          const reachable = (el as HTMLButtonElement).disabled || (el as HTMLElement).tabIndex >= 0;
          return name.trim() === '' || !reachable;
        })
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    expect(unnamed, tab).toEqual([]);
  }
});
