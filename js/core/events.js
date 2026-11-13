const listeners = new Map();

export function on(eventName, callback) {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName).add(callback);
  return () => listeners.get(eventName)?.delete(callback);
}
export function emit(eventName, detail) {
  for (const callback of listeners.get(eventName) || []) callback(detail);
}
