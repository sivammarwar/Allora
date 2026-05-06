/* eslint-disable no-console */
const fmt = (lvl: string) => `[${new Date().toISOString()}] ${lvl}`;

export const logger = {
  info: (...args: unknown[]) => console.log(fmt("INFO "), ...args),
  warn: (...args: unknown[]) => console.warn(fmt("WARN "), ...args),
  error: (...args: unknown[]) => console.error(fmt("ERROR"), ...args),
};
