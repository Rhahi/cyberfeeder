let enabled = false;

export function enable() {
  enabled = true;
}

export function disable() {
  enabled = false;
}

export function log(...args: unknown[]) {
  if (enabled) console.log(...args);
}

export function debug(...args: unknown[]) {
  if (enabled) console.debug(...args);
}

export function warn(...args: unknown[]) {
  if (enabled) console.warn(...args);
}
