import { Platform } from 'react-native';

const envHost = process.env.EXPO_PUBLIC_SERVER_HOST;

function defaultHost(): string {
  if (envHost) return envHost;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const HOST = defaultHost();
const PORT = process.env.EXPO_PUBLIC_SERVER_PORT ?? '8080';

export const SERVER = {
  http: `http://${HOST}:${PORT}`,
  ws: `ws://${HOST}:${PORT}/ws`,
  meta: `http://${HOST}:${PORT}/pairs/meta`,
  health: `http://${HOST}:${PORT}/health`,
} as const;
