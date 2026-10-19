import pino, { type Logger } from 'pino';

let rootLogger: Logger | null = null;

/** Returns the shared logger. */
export function getLogger(): Logger {
  if (rootLogger) return rootLogger;
  rootLogger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'playverzus-core' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  return rootLogger;
}

/** Creates a child logger with a name. */
export function namedLogger(name: string): Logger {
  return getLogger().child({ module: name });
}
