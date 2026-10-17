/** Keep clinical procedure options owner-scoped, regardless of price or bookability. */
export function ownActiveProcedures<T extends { dentist_id: string; is_active: boolean | null }>(
  procedures: T[],
  doctorId: string,
): T[] {
  return procedures.filter((procedure) =>
    procedure.dentist_id === doctorId && procedure.is_active !== false,
  );
}