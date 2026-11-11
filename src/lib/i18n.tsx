import { PHRASES } from "./i18n-dict";
import { SW_APP } from "./i18n-sw";
import { FR_APP } from "./i18n-fr";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "sw" | "fr";
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "sw", label: "Kiswahili", short: "SW" },
  { code: "fr", label: "Français", short: "FR" },
];

type Dict = Record<string, string>;
const sw: Dict = {
  "Home": "Nyumbani", "Order": "Agiza", "History": "Historia", "Top-Up": "Weka pesa",
  "Sign out": "Toka", "Sign in": "Ingia", "Create your store": "Fungua duka lako",
  "Choose canteen": "Chagua kantini", "one wallet": "pochi moja",
  "No canteens available yet.": "Bado hakuna kantini.",
  "Your wallet balance is shared across every canteen in the same group.": "Salio la pochi yako linatumika kwenye kantini zote za kundi moja.",
  "Staff Console": "Ukurasa wa wafanyakazi", "Sales": "Mauzo", "Live Orders": "Oda za sasa", "Orders": "Oda",
  "POS": "Kuuza", "Shift": "Zamu", "Customers": "Wateja", "Top-ups": "Malipo ya pochi", "Inventory": "Stoo",
  "Finance": "Fedha", "Analytics": "Takwimu", "Credit": "Madeni", "Tables": "Meza", "Team": "Wafanyakazi",
  "Settings": "Mipangilio", "Stores": "Maduka", "Shift open": "Zamu imefunguliwa", "Open shift": "Fungua zamu",
  "Online": "Mtandaoni", "Offline": "Nje ya mtandao", "queued": "zinasubiri", "Exit": "Toka", "Full Screen": "Skrini nzima",
  "My stats": "Takwimu zangu", "Language": "Lugha",
  "Fast checkout (POS)": "Malipo ya haraka (POS)", "Stock that never lies": "Stoo isiyodanganya",
  "Customer credit (madeni)": "Madeni ya wateja", "Suppliers & bills": "Wasambazaji na bili",
};
const fr: Dict = {
  "Home": "Accueil", "Order": "Commander", "History": "Historique", "Top-Up": "Recharger",
  "Sign out": "Se déconnecter", "Sign in": "Se connecter", "Create your store": "Créer votre boutique",
  "Choose canteen": "Choisir la cantine", "one wallet": "un portefeuille",
  "No canteens available yet.": "Aucune cantine pour le moment.",
  "Your wallet balance is shared across every canteen in the same group.": "Votre solde est partagé entre toutes les cantines du même groupe.",
  "Staff Console": "Espace personnel", "Sales": "Ventes", "Live Orders": "Commandes en cours", "Orders": "Commandes",
  "POS": "Caisse", "Shift": "Service", "Customers": "Clients", "Top-ups": "Recharges", "Inventory": "Stock",
  "Finance": "Finances", "Analytics": "Statistiques", "Credit": "Crédit", "Tables": "Tables", "Team": "Équipe",
  "Settings": "Paramètres", "Stores": "Boutiques", "Shift open": "Service ouvert", "Open shift": "Ouvrir le service",
  "Online": "En ligne", "Offline": "Hors ligne", "queued": "en attente", "Exit": "Quitter", "Full Screen": "Plein écran",
  "My stats": "Mes stats", "Language": "Langue",
  "Fast checkout (POS)": "Encaissement rapide (POS)", "Stock that never lies": "Un stock fiable",
  "Customer credit (madeni)": "Crédit client", "Suppliers & bills": "Fournisseurs et factures",
};
for (const [en, [s1, f1]] of Object.entries(PHRASES)) { if (!(en in sw)) sw[en] = s1; if (!(en in fr)) fr[en] = f1; }
for (const [en, s1] of Object.entries(SW_APP)) { if (!(en in sw)) sw[en] = s1; }
for (const [en, f1] of Object.entries(FR_APP)) { if (!(en in fr)) fr[en] = f1; }
const SECTOR_SW: Dict = {"Smart POS & prepaid customer wallets": "Mfumo wa mauzo (POS) na pochi za wateja", "One wallet works at every branch in the business you select. You can shop at other stores later — each keeps its own balance.": "Pochi moja inafanya kazi katika kila tawi la biashara unayochagua. Unaweza kununua kwenye maduka mengine baadaye — kila moja lina salio lake.", "Any owner can register a new business on this device — data stays separate per store.": "Mmiliki yeyote anaweza kusajili biashara mpya kwenye kifaa hiki — taarifa za kila duka zinabaki tofauti.", "© BitePay — Smart POS & Business Management System": "© BitePay — Mfumo wa mauzo na usimamizi wa biashara", "Choose store": "Chagua duka", "Choose venue": "Chagua mgahawa", "No stores available yet.": "Bado hakuna maduka.", "No venues available yet.": "Bado hakuna migahawa.", "Your wallet balance is shared across every branch in the same business.": "Salio la pochi yako linatumika kwenye matawi yote ya biashara moja.", "Your wallet balance is shared across every venue in the same business.": "Salio la pochi yako linatumika kwenye sehemu zote za biashara moja.", "Mobile money top-up is not available for this store yet.": "Kuweka pesa kwa simu bado hakupatikani kwa duka hili.", "Mobile money top-up is not available for this venue yet.": "Kuweka pesa kwa simu bado hakupatikani kwa sehemu hii.", "Mobile money top-up is not available for this canteen yet.": "Kuweka pesa kwa simu bado hakupatikani kwa kantini hii.", "Choose a store first": "Chagua duka kwanza", "Products": "Bidhaa", "Menu & drinks": "Vyakula na vinywaji"};
const SECTOR_FR: Dict = {"Smart POS & prepaid customer wallets": "Point de vente intelligent et portefeuilles clients", "One wallet works at every branch in the business you select. You can shop at other stores later — each keeps its own balance.": "Un seul portefeuille fonctionne dans chaque succursale du commerce choisi. Vous pourrez acheter ailleurs plus tard — chacun garde son propre solde.", "Any owner can register a new business on this device — data stays separate per store.": "Tout propriétaire peut enregistrer un nouveau commerce sur cet appareil — les données restent séparées par boutique.", "© BitePay — Smart POS & Business Management System": "© BitePay — Caisse intelligente et gestion d'entreprise", "Choose store": "Choisir la boutique", "Choose venue": "Choisir l'établissement", "No stores available yet.": "Aucune boutique pour le moment.", "No venues available yet.": "Aucun établissement pour le moment.", "Your wallet balance is shared across every branch in the same business.": "Votre solde est partagé entre toutes les succursales du même commerce.", "Your wallet balance is shared across every venue in the same business.": "Votre solde est partagé entre tous les établissements du même commerce.", "Mobile money top-up is not available for this store yet.": "La recharge mobile n'est pas encore disponible pour cette boutique.", "Mobile money top-up is not available for this venue yet.": "La recharge mobile n'est pas encore disponible pour cet établissement.", "Mobile money top-up is not available for this canteen yet.": "La recharge mobile n'est pas encore disponible pour cette cantine.", "Choose a store first": "Choisissez d'abord une boutique", "Products": "Produits", "Menu & drinks": "Menu et boissons"};
Object.assign(sw, SECTOR_SW); Object.assign(fr, SECTOR_FR);
const DICTS: Record<Lang, Dict> = { en: {}, sw, fr };

// Translate visible text anywhere on the page (exact phrase match), so screens
// not yet wired to t() still switch language. Originals are remembered to switch back.
const ORIG = new WeakMap<Node, string>();
const ATTRS = ["placeholder", "aria-label", "title"] as const;
function translateTree(root: Node, dict: Dict) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = root;
  while (n) {
    if (n.nodeType === 3) {
      const parent = n.parentElement;
      if (parent && !["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName) && !parent.closest("[data-no-translate]")) {
        const cur = n.nodeValue ?? "";
        let orig = ORIG.get(n);
        // If React changed the text, the current value is the new source.
        if (orig === undefined || (cur !== orig && cur !== (dictLookup(orig, dict) ?? orig) && !isTranslation(cur))) { orig = cur; ORIG.set(n, cur); }
        const out = dictLookup(orig, dict) ?? orig;
        if (cur !== out) n.nodeValue = out;
      }
    } else if (n.nodeType === 1) {
      const el = n as Element;
      for (const a of ATTRS) {
        const key = `data-i18n-${a}`;
        const v = el.getAttribute(a);
        if (v == null) continue;
        let orig = el.getAttribute(key);
        if (orig == null || (v !== orig && !isTranslation(v))) { orig = v; el.setAttribute(key, v); }
        const out = dictLookup(orig, dict) ?? orig;
        if (v !== out) el.setAttribute(a, out);
      }
    }
    n = walker.nextNode();
  }
}
const ALL_TRANSLATIONS = new Set<string>([...Object.values(sw), ...Object.values(fr)]);
function isTranslation(s: string) { return ALL_TRANSLATIONS.has(s.trim()); }
function dictLookup(s: string, dict: Dict): string | undefined {
  const t = s.trim(); if (!t) return undefined;
  const hit = dict[t]; if (hit === undefined) return undefined;
  return s.replace(t, hit);
}
const KEY = "bp-lang";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }>({
  lang: "en", setLang: () => {}, t: (s) => s,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && saved in DICTS) setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    const dict = DICTS[lang];
    translateTree(document.body, dict);
    let busy = false;
    const obs = new MutationObserver((muts) => {
      if (busy) return; busy = true;
      try { for (const m of muts) translateTree(m.type === "characterData" ? m.target : m.target, dict); }
      finally { busy = false; }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => obs.disconnect();
  }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(KEY, l); } catch { /* ignore */ } };
  const t = (s: string) => DICTS[lang][s] ?? s;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
