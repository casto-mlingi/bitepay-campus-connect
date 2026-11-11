import { Languages } from "lucide-react";
import { LANGS, useT, type Lang } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <label data-no-translate className={`inline-flex items-center gap-1 rounded-lg border bg-background px-2 h-9 text-xs font-semibold ${className}`}>
      <Languages className="w-4 h-4 text-primary" aria-hidden />
      <span className="sr-only">{t("Language")}</span>
      <select aria-label={t("Language")} value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="bg-transparent outline-none cursor-pointer">
        {LANGS.map((l) => <option title={l.label} key={l.code} value={l.code}>{l.short}</option>)}
      </select>
    </label>
  );
}
