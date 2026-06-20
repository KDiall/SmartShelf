const DEFAULT_COUNTRY_CODE = '232'; // Sierra Leone

/**
 * Normalize a phone number to a canonical, digits-only form.
 *
 * Handles common Sierra Leone formats so they converge to the same key:
 *   +232 31 569311, 23231569311, 031569311, 31569311 -> 23231569311
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
  // Sierra Leone local numbers are 0 + 8-digit subscriber (e.g. 031569311).
  if (digits.startsWith('0') && digits.length === 9) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }

  // Bare subscriber number (e.g. 31569311) -> prepend country code.
  if (!digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 8) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  return digits;
}
