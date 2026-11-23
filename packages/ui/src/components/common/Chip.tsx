import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
}

/** Pill-shaped toggle used for presets, categories and options. */
export function Chip({ active, icon, className = '', children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full text-xs whitespace-nowrap transition border ${active ? 'bg-accent text-accent-contrast border-accent font-semibold' : 'bg-surface-2 border-border text-text hover:bg-surface-3'} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Horizontal scrolling row of chips.
 * A mouse wheel only scrolls vertically, so wheel movement is turned into horizontal scrolling;
 * without it the chips past the right edge are unreachable on desktop.
 */
export function ChipRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      const canScroll = el.scrollWidth > el.clientWidth;
      if (!canScroll || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    // Non-passive listener: React's onWheel is passive and cannot call preventDefault.
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <div ref={ref} className={`scroll-x flex gap-2 py-1 -mx-1 px-1 ${className}`}>
      {children}
    </div>
  );
}
