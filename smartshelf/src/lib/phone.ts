const DEFAULT_COUNTRY_CODE = '232'; // Sierra Leone

/**
 * Normalize a phone number to a canonical, digits-only form.
 *
 * Handles common Sierra Leone formats so they converge to the same key:
 *   +232 76 000000, 23276000000, 076000000, 76000000 -> 23276000000
 *
 * Storing and looking up phones in a single canonical form prevents
 * mismatches between values entered with formatting.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/[^0-9]/g, '');

  // Strip international trunk prefix if present.
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Local format: leading 0 replaces the 0 with the country code.
  if (digits.startsWith('0') && digits.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }

  // Bare 9-digit subscriber number (e.g. 760000000) -> prepend country code.
  if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 9) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  return digits;
}
