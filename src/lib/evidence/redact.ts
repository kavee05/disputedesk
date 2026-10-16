// Removes buyer personal data from text before it can reach the model.
// The raw PayPal record (with name and email) stays in our database only.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const LONG_NUMBER = /\b\d{12,19}\b/g; // card or account numbers
const URL = /\bhttps?:\/\/\S+/gi;

export function scrubPersonalData(text: string, knownNames: string[] = []): string {
  let out = text.replace(EMAIL, "[email removed]").replace(URL, "[link removed]").replace(LONG_NUMBER, "[number removed]");
  out = out.replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 8 ? "[phone removed]" : m));
  for (const name of knownNames) {
    for (const part of name.split(/\s+/).filter((p) => p.length >= 3)) {
      out = out.replace(new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[buyer]");
    }
  }
  return out;
}
