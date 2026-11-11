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
const DICTS: Record<Lang, Dict> = { en: {}, sw, fr };
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
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(KEY, l); } catch { /* ignore */ } };
  const t = (s: string) => DICTS[lang][s] ?? s;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
