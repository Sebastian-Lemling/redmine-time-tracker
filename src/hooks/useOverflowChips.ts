import { useState, useCallback, useRef, useEffect } from "react";

export function useOverflowChips(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(itemCount);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const containerRight = containerRect.right;
    const gap = parseFloat(getComputedStyle(container).gap) || 0;
    const overflowBtnWidth = 64;

    let fitCount = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.dataset.overflowTrigger) continue;
      const right = child.getBoundingClientRect().right;
      const remainingChips = children.length - 1 - i;
      const needsOverflow = remainingChips > 0;
      const limit = needsOverflow ? containerRight - overflowBtnWidth - gap : containerRight;
      if (right > limit && fitCount > 0) break;
      fitCount++;
    }

    setVisibleCount(fitCount);
  }, []);

  useEffect(() => {
    setVisibleCount(itemCount);
  }, [itemCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    const rafId = requestAnimationFrame(measure);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [measure, itemCount]);

  return { containerRef, visibleCount };
}
