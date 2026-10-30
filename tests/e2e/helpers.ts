import { expect, type Page } from '@playwright/test';

export const ROW_HEIGHT = 18;
export const MAX_PITCH = 98;

/** Fresh app with empty storage and English UI. */
export async function openFresh(page: Page, language: 'en' | 'ru' = 'en') {
  await page.addInitScript((lang) => {
    if (!sessionStorage.getItem('rc.e2e.init')) {
      localStorage.clear();
      indexedDB.deleteDatabase('recorder-composer');
      localStorage.setItem(
        'rc.prefs',
        JSON.stringify({ version: 1, language: lang, noteNaming: lang === 'ru' ? 'solfege' : 'letter' }),
      );
      sessionStorage.setItem('rc.e2e.init', '1');
    }
  }, language);
  await page.goto('/');
  await expect(page.getByTestId('timeline-grid')).toBeVisible();
}

/** Click a grid cell: `step` grid columns of `stepPx` from the left, at `pitch`. */
export async function clickCell(page: Page, pitch: number, x: number) {
  const grid = page.getByTestId('timeline-grid');
  await grid.click({ position: { x, y: (MAX_PITCH - pitch) * ROW_HEIGHT + ROW_HEIGHT / 2 } });
}

export async function noteCount(page: Page) {
  return page.getByTestId('note').count();
}
