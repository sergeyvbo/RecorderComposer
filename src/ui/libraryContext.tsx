import { createContext, useContext, type ReactNode } from 'react';
import type { LibraryService } from '@/persistence/library';

const LibraryContext = createContext<LibraryService | null>(null);

export function LibraryProvider({ library, children }: { library: LibraryService; children: ReactNode }) {
  return <LibraryContext.Provider value={library}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryService {
  const l = useContext(LibraryContext);
  if (!l) throw new Error('LibraryProvider missing');
  return l;
}

/** Trigger a browser download of `text` as `filename`. */
export function downloadText(filename: string, text: string, type = 'application/json') {
  downloadBlob(filename, new Blob([text], { type }));
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
