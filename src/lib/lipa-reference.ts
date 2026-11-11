/** Finds a mobile-money receipt code (e.g. M-Pesa "DKBJ93DH4T") in OCR text. */
export function extractLipaReference(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s:.\-]/g, " ");
  const labelled = cleaned.match(/(?:REF(?:ERENCE)?|RECEIPT|TXN|TRANS(?:ACTION)?\s*ID|KUMBUKUMBU|MUAMALA)[\s:.\-]*(?:NO\.?|NAMBA)?[\s:.\-]*([A-Z0-9]{8,14})/);
  if (labelled && /[A-Z]/.test(labelled[1]) && /\d/.test(labelled[1])) return labelled[1];
  const tokens = cleaned.split(/[\s:.\-]+/).filter((t) => t.length >= 8 && t.length <= 14 && /[A-Z]/.test(t) && /\d/.test(t) && !/^TZS/.test(t));
  const ten = tokens.find((t) => t.length === 10);
  return ten ?? tokens[0] ?? null;
}
