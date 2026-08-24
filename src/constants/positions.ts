export const POSITIONS = [
  { code: 'KETUA', name: 'Ketua', type: 'leadership' as const, capacity: 1 },
  { code: 'WAKIL_KETUA', name: 'Wakil Ketua', type: 'leadership' as const, capacity: 1 },
  { code: 'SEKRETARIS', name: 'Sekretaris', type: 'leadership' as const, capacity: 1 },
  { code: 'BENDAHARA', name: 'Bendahara', type: 'leadership' as const, capacity: 1 },
  { code: 'POKJA_I', name: 'Pokja I', type: 'pokja' as const, capacity: 2 },
  { code: 'POKJA_II', name: 'Pokja II', type: 'pokja' as const, capacity: 2 },
  { code: 'POKJA_III', name: 'Pokja III', type: 'pokja' as const, capacity: 2 },
  { code: 'POKJA_IV', name: 'Pokja IV', type: 'pokja' as const, capacity: 2 },
] as const;

export const ELIGIBLE_POSITIONS = [
  'Bendahara',
  'Sekretaris',
  'Pokja I',
  'Pokja II',
  'Pokja III',
  'Pokja IV',
] as const;

export function isEligiblePosition(positionName: string | null | undefined): boolean {
  return positionName != null && (ELIGIBLE_POSITIONS as readonly string[]).includes(positionName);
}
