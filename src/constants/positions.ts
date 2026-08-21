/**
 * Jabatan yang BERHAK membuat laporan kegiatan.
 * Sesuai kontrak backend §3.
 */
export const ELIGIBLE_POSITIONS = [
  'Bendahara',
  'Sekretaris',
  'Pokja I',
  'Pokja II',
  'Pokja III',
  'Pokja IV',
] as const;

export type EligiblePosition = (typeof ELIGIBLE_POSITIONS)[number];

/**
 * Cek apakah nama jabatan termasuk yang berhak membuat laporan.
 */
export function isEligiblePosition(positionName: string | null | undefined): boolean {
  if (!positionName) return false;
  return ELIGIBLE_POSITIONS.includes(positionName as EligiblePosition);
}
