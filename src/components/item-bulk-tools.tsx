import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";

export type Col = { key: string; label: string; example?: string | number };

function save(wb: unknown, XLSX: typeof import("xlsx"), name: string) {
  XLSX.writeFile(wb as never, name);
}

/** Export, template download and Excel/CSV import for item lists. */
export function ItemBulkTools({ cols, rows, fileBase, onImport }: {
  cols: Col[];
  rows: Record<string, unknown>[];
  fileBase: string;
  onImport: (rows: Record<string, string>[]) => { added: number; skipped: number };
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const sheet = async (data: Record<string, unknown>[], name: string) => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(data.map((r) => Object.fromEntries(cols.map((c) => [c.label, r[c.key] ?? ""]))), { header: cols.map((c) => c.label) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");
    save(wb, XLSX, name);
  };
  const importFile = async (f: File) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await f.arrayBuffer());
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const mapped = raw.map((r) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        const c = cols.find((c) => norm(c.label) === norm(k) || norm(c.key) === norm(k));
        if (c) out[c.key] = String(v).trim();
      }
      return out;
    });
    const { added, skipped } = onImport(mapped);
    setMsg(`Imported ${added} item(s)${skipped ? `, skipped ${skipped} (missing name or duplicate)` : ""}.`);
  };
  const btn = "inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border text-sm font-semibold hover:bg-muted";
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => ref.current?.click()}><Upload className="w-4 h-4" /> Import Excel</button>
        <button type="button" className={btn} onClick={() => sheet([Object.fromEntries(cols.map((c) => [c.key, c.example ?? ""]))], `${fileBase}-template.xlsx`)}><FileSpreadsheet className="w-4 h-4" /> Template</button>
        <button type="button" className={btn} onClick={() => sheet(rows, `${fileBase}-${new Date().toISOString().slice(0, 10)}.xlsx`)}><Download className="w-4 h-4" /> Export</button>
        <input ref={ref} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
      </div>
      {msg && <div className="text-xs text-success font-semibold">{msg}</div>}
    </div>
  );
}

export const PAGE_SIZES = [10, 20, 50, 100] as const;

/** Bottom pager with 10/20/50/100 rows-per-page selector. */
export function Pager({ total, page, size, onPage, onSize }: { total: number; page: number; size: number; onPage: (p: number) => void; onSize: (s: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(page, pages);
  const b = "h-9 px-3 rounded-lg border text-sm font-semibold disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">Show
        <select aria-label="Rows per page" value={size} onChange={(e) => { onSize(Number(e.target.value)); onPage(1); }} className="h-9 rounded-lg border bg-background px-2">
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        of {total}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" className={b} disabled={p <= 1} onClick={() => onPage(p - 1)}>Prev</button>
        <span className="text-muted-foreground">{p} / {pages}</span>
        <button type="button" className={b} disabled={p >= pages} onClick={() => onPage(p + 1)}>Next</button>
      </div>
    </div>
  );
}
