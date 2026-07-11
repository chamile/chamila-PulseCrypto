import { wsClient } from '@/net/wsClient';
import { dispatchWsMessage } from './marketStores';
import { useConnectionStore } from './connectionStore';
import { useFavoritesStore } from './favoritesStore';
import { useMetaStore } from './metaStore';

let started = false;

export function bootstrap() {
  if (started) return;
  started = true;

  wsClient.onState((s) => useConnectionStore.getState().setWsState(s));

  wsClient.onMessage((msg) => {
    if (msg.type === 'conn') {
      useConnectionStore.getState().setUpstream(msg.upstream);
    } else {
      useConnectionStore.getState().touch();
      dispatchWsMessage(msg);
    }
  });

  useFavoritesStore.getState().hydrate();
  useMetaStore.getState().refresh();

  wsClient.start();
}
