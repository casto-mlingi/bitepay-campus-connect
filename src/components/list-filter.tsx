import { useMemo, useState } from "react";
import { Search, CalendarRange, X } from "lucide-react";

/** Accounting period presets shared by every list in the app. */
export type PeriodKey = "all" | "today" | "week" | "month" | "quarter" | "year" | "custom";

export type FilterState = {
  q: string;
  status: string;
  period: PeriodKey;
  from: string; // yyyy-mm-dd
  to: string;
};

export const emptyFilter: FilterState = { q: "", status: "all", period: "all", from: "", to: "" };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Resolve a filter state into an inclusive [from, to] millisecond window. */
export function periodRange(f: FilterState): { from: number; to: number } {
  const now = new Date();
  const end = Date.now() + 60_000;
  switch (f.period) {
    case "today":
      return { from: startOfDay(now), to: end };
    case "week": {
      const day = (now.getDay() + 6) % 7; // Monday-first
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)), to: end };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: end };
    case "quarter":
      return { from: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime(), to: end };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: end };
    case "custom":
      return {
        from: f.from ? new Date(`${f.from}T00:00:00`).getTime() : 0,
        to: f.to ? new Date(`${f.to}T23:59:59`).getTime() : end,
      };
    default:
      return { from: 0, to: end };
  }
}

/** Convenience hook: filter state + a matcher for text/status/date. */
export function useListFilter(initial?: Partial<FilterState>) {
  const [filter, setFilter] = useState<FilterState>({ ...emptyFilter, ...initial });
  const range = useMemo(() => periodRange(filter), [filter]);
  const match = useMemo(
    () => (row: { text?: string; status?: string; at?: number }) => {
      const q = filter.q.trim().toLowerCase();
      if (q && !(row.text ?? "").toLowerCase().includes(q)) return false;
      if (filter.status !== "all" && row.status !== filter.status) return false;
      if (row.at !== undefined && (row.at < range.from || row.at > range.to)) return false;
      return true;
    },
    [filter, range],
  );
  return { filter, setFilter, range, match };
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom…" },
];

export function ListFilter({
  filter,
  onChange,
  statuses,
  placeholder = "Search…",
  showPeriod = true,
  right,
}: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  statuses?: { value: string; label: string }[];
  placeholder?: string;
  showPeriod?: boolean;
  right?: React.ReactNode;
}) {
  const dirty = filter.q || filter.status !== "all" || filter.period !== "all";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={filter.q}
          onChange={(e) => onChange({ ...filter, q: e.target.value })}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-3 rounded-xl border bg-background text-sm"
        />
      </div>

      {statuses && statuses.length > 0 && (
        <select
          value={filter.status}
          onChange={(e) => onChange({ ...filter, status: e.target.value })}
          className="h-10 rounded-xl border bg-background px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      )}

      {showPeriod && (
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-muted-foreground" />
          <select
            value={filter.period}
            onChange={(e) => onChange({ ...filter, period: e.target.value as PeriodKey })}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
            aria-label="Accounting period"
          >
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          {filter.period === "custom" && (
            <>
              <input type="date" value={filter.from} onChange={(e) => onChange({ ...filter, from: e.target.value })} className="h-10 rounded-xl border bg-background px-2 text-sm" aria-label="From date" />
              <span className="text-muted-foreground text-xs">to</span>
              <input type="date" value={filter.to} onChange={(e) => onChange({ ...filter, to: e.target.value })} className="h-10 rounded-xl border bg-background px-2 text-sm" aria-label="To date" />
            </>
          )}
        </div>
      )}

      {dirty && (
        <button onClick={() => onChange(emptyFilter)} className="h-10 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 hover:bg-muted">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
      {right}
    </div>
  );
}
