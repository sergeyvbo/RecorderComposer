import midiPkg from '@tonejs/midi';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clickCell, openFresh } from './helpers';

const { Midi } = midiPkg;

test('Export MIDI downloads a file matching the melody; disabled when empty', async ({ page }) => {
  await openFresh(page);
  await expect(page.getByRole('button', { name: 'Export MIDI' })).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Tempo' }).fill('90');
  for (const [i, p] of [72, 74, 76, 77].entries()) await clickCell(page, p, i * 75 + 5);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export MIDI' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.mid$/);
  const midi = new Midi(readFileSync((await download.path())!));
  expect(midi.tracks[0]!.notes.map((n) => n.midi)).toEqual([72, 74, 76, 77]);
  expect(midi.tracks[0]!.notes.map((n) => n.durationTicks)).toEqual([480, 480, 480, 480]);
  expect(midi.header.tempos[0]!.bpm).toBeCloseTo(90, 3);
});
