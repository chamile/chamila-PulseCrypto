const ts = () => new Date().toISOString();

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[${ts()}] INFO  ${msg}`, meta ?? ''),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[${ts()}] WARN  ${msg}`, meta ?? ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[${ts()}] ERROR ${msg}`, meta ?? ''),
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.DEBUG) console.log(`[${ts()}] DEBUG ${msg}`, meta ?? '');
  },
};
