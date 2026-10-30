import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@/i18n';
import { defaultPreferences } from '@/state/prefs';
import { createAppStore } from '@/state/store';
import { SharedTimeAxis } from '@/ui/Layout/SharedTimeAxis';
import { StoreProvider } from '@/ui/storeContext';

export function setup(ui: ReactNode, opts: { withAxis?: boolean } = {}) {
  const i18n = initI18n('en');
  let id = 0;
  const store = createAppStore(defaultPreferences('en'), {
    now: () => '2026-01-01T00:00:00.000Z',
    newId: () => `t${++id}`,
  });
  const content = opts.withAxis === false ? ui : <SharedTimeAxis>{ui}</SharedTimeAxis>;
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <StoreProvider store={store}>{content}</StoreProvider>
    </I18nextProvider>,
  );
  return { store, ...utils };
}
