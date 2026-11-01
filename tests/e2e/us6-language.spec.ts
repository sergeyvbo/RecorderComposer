import { expect, test } from '@playwright/test';
import { openFresh, openTab } from './helpers';

const keyboardLabels = (page: import('@playwright/test').Page) =>
  page.locator('.keyboard text').allTextContents();

// quickstart.md scenario 6
test('switching language and note naming updates labels and persists', async ({ page }) => {
  await openFresh(page, 'en');
  let labels = await keyboardLabels(page);
  expect(labels.at(0)).toBe('D6');
  expect(labels.at(-1)).toBe('C4');

  await openTab(page, 'View');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('ru');
  await expect(page.getByRole('button', { name: 'Ноты' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');

  await page.getByRole('combobox', { name: 'Названия нот' }).selectOption('solfege');
  labels = await keyboardLabels(page);
  expect(labels.at(0)).toBe('ре³');
  expect(labels.at(-1)).toBe('до¹');

  await page.getByRole('combobox', { name: 'Названия нот' }).selectOption('letter');
  labels = await keyboardLabels(page);
  expect(labels.at(0)).toBe('D³');
  expect(labels.at(-1)).toBe('C¹');

  await page.reload();
  expect((await keyboardLabels(page)).at(-1)).toBe('C¹');
  await expect(page.getByRole('combobox', { name: 'Язык' })).toHaveValue('ru');

  await page.getByRole('combobox', { name: 'Язык' }).selectOption('en');
  expect((await keyboardLabels(page)).at(-1)).toBe('C4');
});
