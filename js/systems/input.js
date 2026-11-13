export function bindKeyboard(handlers = {}) {
  const listener = (event) => {
    const handler = handlers[event.key];
    if (handler) handler(event);
  };
  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}
