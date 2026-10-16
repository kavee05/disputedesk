// Removes buyer personal data from text before it can reach the model.
// The raw PayPal record (with name and email) stays in our database only.
// Care is needed not to destroy evidence: tracking numbers like
// EP912345678MY or 9400111899223197428490 must survive.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\bhttps?:\/\/\S+/gi;
// Phone numbers: international "+" form, or digit groups joined by separators.
// Never digits glued to letters (that is a tracking or order number).
const PHONE_INTL = /(?<![\w+])\+\d[\d\s().-]{6,18}\d(?![\w])/g;
const PHONE_GROUPED = /(?<![\w])\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,5}(?![\w])/g;
const DIGIT_RUN = /(?<![\w])\d(?:[ -]?\d){12,18}(?![\w])/g;

// Card numbers pass the Luhn checksum. Tracking numbers almost never do.
function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function scrubPersonalData(text: string, knownNames: string[] = []): string {
  let out = text.replace(EMAIL, "[email removed]").replace(URL, "[link removed]");
  out = out.replace(DIGIT_RUN, (m) => {
    const d = m.replace(/\D/g, "");
    return d.length >= 13 && d.length <= 19 && luhn(d) ? "[number removed]" : m;
  });
  out = out.replace(PHONE_INTL, "[phone removed]").replace(PHONE_GROUPED, "[phone removed]");
  for (const name of knownNames) {
    for (const part of name.split(/\s+/).filter((p) => p.length >= 3)) {
      out = out.replace(new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[buyer]");
    }
  }
  return out;
}
