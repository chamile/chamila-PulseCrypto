export const colors = {
  primary: '#080E14',
  surface: '#1E2633',
  surfaceElevated: '#242D3B',
  border: '#2A3444',
  up: '#08C57A',
  upSoft: '#08C57A22',
  down: '#FF3B69',
  downSoft: '#FF3B6922',
  text: '#F0F4F8',
  textMuted: '#7F8B9C',
  textDim: '#4A5566',
  accent: '#08C57A',
  warn: '#F5B93C',
  warnSoft: '#F5B93C22',
  info: '#4A9EFF',
  infoSoft: '#4A9EFF22',
} as const;

export type ColorKey = keyof typeof colors;
