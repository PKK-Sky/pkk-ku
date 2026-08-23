/**
 * Utility normalisasi nomor HP Indonesia.
 * Supabase Phone Auth (signInWithPassword/signInWithOtp) mewajibkan format E.164: +62xxxxxxxxxx
 */

/**
 * Bersihkan input nomor HP (hapus spasi, strip, tanda kurung, dll) — sisakan digit saja.
 */
export function stripPhoneInput(input: string): string {
  return input.replace(/[^0-9]/g, '');
}

/**
 * Normalisasi nomor HP lokal (mis. "0812-3456-7890", "812 3456 7890", "62812...")
 * menjadi format E.164 "+62812...".
 * Mengembalikan null kalau nomor terlalu pendek untuk dianggap valid.
 */
export function normalizePhoneToE164(input: string): string | null {
  const digits = stripPhoneInput(input);

  if (digits.length < 8) return null;

  let national = digits;

  if (national.startsWith('62')) {
    national = national.slice(2);
  } else if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (national.length < 8 || national.length > 13) return null;

  return `+62${national}`;
}

/**
 * Format nomor untuk ditampilkan di layar (grup 3-4 digit), tanpa +62 (sudah ada di prefix cc-nya).
 */
export function formatPhoneDisplay(input: string): string {
  const digits = stripPhoneInput(input);
  const parts: string[] = [];
  let i = 0;

  if (digits.length > 3) {
    parts.push(digits.slice(0, 3));
    i = 3;
  } else {
    return digits;
  }

  while (i < digits.length) {
    parts.push(digits.slice(i, i + 4));
    i += 4;
  }

  return parts.join('-');
}
