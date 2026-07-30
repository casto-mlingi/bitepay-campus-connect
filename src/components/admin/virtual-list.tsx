import { useRef, useState, type ReactNode } from "react";

/**
 * Fixed-row-height windowed list. Only the visible slice is rendered, so the
 * admin console stays smooth with millions of rows.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  height = 520,
  overscan = 6,
  renderRow,
  empty,
  className = "",
}: {
  items: T[];
  rowHeight: number;
  height?: number;
  overscan?: number;
  renderRow: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{empty ?? "Nothing here yet."}</div>;
  }

  const total = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);
  const slice = items.slice(start, end);

  return (
    <div
      ref={ref}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ height }}
      className={`overflow-auto overscroll-contain ${className}`}
    >
      <div style={{ height: total, position: "relative" }}>
        <div style={{ position: "absolute", top: start * rowHeight, left: 0, right: 0 }}>
          {slice.map((item, i) => (
            <div key={start + i} style={{ height: rowHeight }} className="px-0.5">
              {renderRow(item, start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
