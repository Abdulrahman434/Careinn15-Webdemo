/* Scrollbars stay hidden until something scrolls (see "App-wide scrollbar" in
 * styles/index.css). One capture-phase listener covers every scroller in the
 * app — scroll events don't bubble, but they do pass through capture. */
const HIDE_AFTER_MS = 900;

export function installScrollReveal(): void {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();
  document.addEventListener(
    "scroll",
    (e) => {
      const el = e.target === document ? document.documentElement : (e.target as Element);
      if (!(el instanceof Element)) return;
      el.classList.add("is-scrolling");
      const prev = timers.get(el);
      if (prev) clearTimeout(prev);
      timers.set(el, setTimeout(() => el.classList.remove("is-scrolling"), HIDE_AFTER_MS));
    },
    { capture: true, passive: true },
  );
}
