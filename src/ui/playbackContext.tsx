import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { createPlaybackController, type PlaybackController } from '@/audio/controller';
import type { Player } from '@/audio/player';
import { createPlayheadSync } from '@/audio/playheadSync';
import { useAppStore } from './storeContext';

const PlaybackContext = createContext<PlaybackController | null>(null);

export function PlaybackProvider({
  player,
  children,
  onController,
}: {
  player: Player;
  children: ReactNode;
  onController?: (c: PlaybackController) => void;
}) {
  const store = useAppStore();
  const controller = useMemo(() => createPlaybackController(store, player), [store, player]);
  useEffect(() => {
    const sync = createPlayheadSync(store, player);
    return () => sync.dispose();
  }, [store, player]);
  useEffect(() => {
    onController?.(controller);
  }, [controller, onController]);
  return <PlaybackContext.Provider value={controller}>{children}</PlaybackContext.Provider>;
}

export function usePlaybackController(): PlaybackController {
  const c = useContext(PlaybackContext);
  if (!c) throw new Error('PlaybackProvider missing');
  return c;
}
