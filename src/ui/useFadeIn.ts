import { useCallback, useRef } from 'react';

/** Bands and cards fade up (300 ms) the first time they scroll into view. */
export function useFadeIn() {
  const io = useRef<IntersectionObserver | null>(null);
  return useCallback((root: HTMLElement | null) => {
    io.current?.disconnect();
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>('.fade-wait')];
    const show = (el: Element) => {
      el.classList.remove('fade-wait');
      el.classList.add('fade');
    };
    if (typeof IntersectionObserver === 'undefined') return els.forEach(show);
    io.current = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show(e.target);
            io.current?.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.current!.observe(el));
  }, []);
}
