import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { clickCell, openFresh, openTab, quickAccess, tabPanel } from './helpers';

const GROUPS: Record<string, string[]> = {
  Home: ['Clipboard', 'History', 'Playback', 'Articulation'],
  Melody: ['Properties', 'Transform'],
  File: ['Melodies', 'Export', 'Print'],
  View: ['Panels', 'Zoom', 'Grid', 'Language'],
};

async function addNotes(page: Page, pitches: number[]) {
  for (const [i, p] of pitches.entries()) await clickCell(page, p, i * 75 + 5);
  await expect(page.getByTestId('note')).toHaveCount(pitches.length);
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).include('.titlebar').include('.ribbon').withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.length}`);
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

// 003 quickstart scenarios 1 and 2
test('tabs show their groups; paste inserts after the selection or at the playhead, shifting notes right', async ({ page }) => {
  await openFresh(page);
  for (const [tab, groups] of Object.entries(GROUPS)) {
    await openTab(page, tab);
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
    for (const g of groups) await expect(tabPanel(page).getByRole('group', { name: g })).toBeVisible();
  }

  await openTab(page, 'Home');
  await addNotes(page, [84, 86, 88]);
  const button = (name: string) => tabPanel(page).getByRole('button', { name, exact: true });
  await page.keyboard.press('Escape');
  await expect(button('Copy')).toBeDisabled();
  await expect(button('Paste')).toBeDisabled();

  // Copy the first note and paste: it is inserted right after it, the others move right.
  await page.getByTestId('note').first().locator('rect').first().click();
  await button('Copy').click();
  await expect(button('Paste')).toBeEnabled();
  await button('Paste').click();
  await expect(page.getByTestId('note')).toHaveCount(4);
  const labels = () => page.getByTestId('note').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')?.split(',')[0]));
  expect(await labels()).toEqual(['C5', 'C5', 'D5', 'E5']);
  await expect(page.locator('[data-testid="note"][aria-selected="true"]')).toHaveCount(1);

  // Nothing selected, playhead at the start: the paste goes first.
  await page.keyboard.press('Escape');
  await page.getByTestId('time-ruler').click({ position: { x: 2, y: 5 } });
  await button('Paste').click();
  expect(await labels()).toEqual(['C5', 'C5', 'C5', 'D5', 'E5']);

  // A refusal is explained below the ribbon.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  const toast = page.getByRole('status').filter({ hasText: 'Nothing selected' });
  await expect(toast).toBeVisible();
  const ribbonBottom = (await page.locator('.ribbon').boundingBox())!;
  expect((await toast.boundingBox())!.y).toBeGreaterThanOrEqual(ribbonBottom.y + ribbonBottom.height);

  await page.keyboard.press('ControlOrMeta+a');
  await button('Cut').click();
  await expect(page.getByTestId('note')).toHaveCount(0);
  await button('Paste').click();
  await expect(page.getByTestId('note')).toHaveCount(5);
  await page.keyboard.press('ControlOrMeta+a');
  await button('Delete').click();
  await expect(page.getByTestId('note')).toHaveCount(0);
});

// 003 quickstart scenario 3
test('quick access works from any tab', async ({ page }) => {
  await openFresh(page);
  await addNotes(page, [84, 86]);
  await openTab(page, 'File');
  await quickAccess(page).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('note')).toHaveCount(1);
  await quickAccess(page).getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByTestId('note')).toHaveCount(2);
  if (await page.evaluate(() => 'AudioContext' in window || 'webkitAudioContext' in window)) {
    await quickAccess(page).getByRole('button', { name: 'Play' }).click();
    await expect(quickAccess(page).getByRole('button', { name: 'Pause' })).toBeVisible();
    await quickAccess(page).getByRole('button', { name: 'Pause' }).click();
  }
  await expect(page.locator('.titlebar')).toContainText('All changes saved');
});

// 003 quickstart scenario 7 (FR-013, SC-005)
for (const lang of ['en', 'ru'] as const) {
  test(`narrow windows fold groups, keep every command reachable and never scroll sideways (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await openFresh(page, lang);
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.setViewportSize({ width: 360, height: 700 });
    await expect(page.locator('[role="tabpanel"]:not([hidden]) [data-fit="folded"]').first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    // The first group never folds.
    await expect(tabPanel(page).locator('[data-group="clipboard"]')).not.toHaveAttribute('data-fit', 'folded');

    // A folded group opens as a drop-down whose commands work.
    const playback = tabPanel(page).locator('[data-group="playback"]');
    await expect(playback).toHaveAttribute('data-fit', 'folded');
    await playback.getByRole('button').first().click();
    // The drop-down stays inside the window.
    const dropdown = (await playback.locator('.ribbon-dropdown').boundingBox())!;
    expect(dropdown.x).toBeGreaterThanOrEqual(0);
    expect(dropdown.x + dropdown.width).toBeLessThanOrEqual(360);
    const tempo = lang === 'en' ? 'Tempo' : 'Темп';
    await playback.getByRole('spinbutton', { name: tempo }).fill('72');
    await expect(playback.getByRole('spinbutton', { name: tempo })).toHaveValue('72');
    await page.keyboard.press('Escape');
    await expect(playback.getByRole('spinbutton', { name: tempo })).toHaveCount(0);

    for (const tab of lang === 'en' ? ['Melody', 'File', 'View'] : ['Мелодия', 'Файл', 'Вид']) {
      await openTab(page, tab);
      expect(await noHorizontalScroll(page)).toBe(true);
    }
  });
}

// 003 quickstart scenario 5 (FR-009, SC-004)
test('keyboard only: arrows select tabs, Tab reaches commands, Enter opens a dialog', async ({ page }) => {
  await openFresh(page);
  await page.getByRole('tab', { name: 'Home' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Melody' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Melody' })).toHaveAttribute('aria-selected', 'true');
  const transpose = tabPanel(page).getByRole('button', { name: 'Transpose…' });
  for (let i = 0; i < 6 && !(await transpose.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(transpose).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Transpose' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('no serious accessibility violations on any tab, in a folded group or in dark mode', async ({ page }) => {
  await openFresh(page);
  await addNotes(page, [84, 86]);
  for (const tab of Object.keys(GROUPS)) {
    await openTab(page, tab);
    expect(await seriousViolations(page), tab).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await openTab(page, 'Home');
  expect(await seriousViolations(page), 'dark').toEqual([]);
  await page.emulateMedia({ colorScheme: 'light' });

  await page.setViewportSize({ width: 360, height: 700 });
  const folded = tabPanel(page).locator('[data-fit="folded"]').first();
  await folded.getByRole('button').first().click();
  expect(await seriousViolations(page), 'folded').toEqual([]);
});

// 003 quickstart scenario 6 (FR-011, FR-012)
test('collapse to tabs only, use a tab as a popup, and remember it across reloads', async ({ page }) => {
  await openFresh(page);
  const timelineHeight = async () => (await page.locator('.timeline').boundingBox())!.height;
  const before = await timelineHeight();
  await page.getByRole('tab', { name: 'Home' }).dblclick();
  await expect(page.getByRole('tabpanel')).toHaveCount(0);
  await expect.poll(timelineHeight).toBeGreaterThan(before);

  // A command closes the popup; editing a field does not.
  await openTab(page, 'View');
  await tabPanel(page).getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByRole('tabpanel')).toHaveCount(0);
  await openTab(page, 'Home');
  await tabPanel(page).getByRole('spinbutton', { name: 'Tempo' }).fill('90');
  await expect(tabPanel(page)).toBeVisible();

  // A click in the timeline closes the popup and still adds a note.
  await openTab(page, 'View');
  await clickCell(page, 84, 5);
  await expect(page.getByRole('tabpanel')).toHaveCount(0);
  await expect(page.getByTestId('note')).toHaveCount(1);

  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByTestId('timeline-grid')).toBeVisible();
  await expect(page.getByRole('tabpanel')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'View' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Pin the ribbon' }).click();
  await expect(tabPanel(page).getByRole('group', { name: 'Panels' })).toBeVisible();

  // An unknown stored tab falls back to Home.
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('rc.prefs') ?? '{}') as { ribbon?: object };
    localStorage.setItem('rc.prefs', JSON.stringify({ ...prefs, ribbon: { tab: 'backstage', collapsed: false } }));
  });
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
});
