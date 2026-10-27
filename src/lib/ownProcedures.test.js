import { describe, expect, test } from 'bun:test';
import { ownActiveProcedures } from './ownProcedures';

describe('own procedure selection', () => {
  const procedures = [
    { id: 'manual', dentist_id: 'doctor-a', is_active: true, price: 0, is_bookable: false },
    { id: 'unset-price', dentist_id: 'doctor-a', is_active: null, price: null },
    { id: 'other-doctor', dentist_id: 'doctor-b', is_active: true, price: 120 },
    { id: 'archived', dentist_id: 'doctor-a', is_active: false, price: 120 },
  ];

  test('includes own manually added procedures even without a price or public booking', () => {
    expect(ownActiveProcedures(procedures, 'doctor-a').map(p => p.id))
      .toEqual(['manual', 'unset-price']);
  });

  test('never includes another doctor’s procedures', () => {
    expect(ownActiveProcedures(procedures, 'doctor-b').map(p => p.id))
      .toEqual(['other-doctor']);
  });

  test('keeps explicitly archived procedures out of selection', () => {
    expect(ownActiveProcedures(procedures, 'doctor-a').some(p => p.id === 'archived')).toBe(false);
  });
});
describe('works for every doctor, not one account', () => {
  test('any new doctor gets their own procedures with no setup', () => {
    const list = [
      { id: 'x1', dentist_id: 'new-doc', is_active: true },
      { id: 'y1', dentist_id: 'other', is_active: true },
    ];
    expect(ownActiveProcedures(list, 'new-doc').map(p => p.id)).toEqual(['x1']);
    expect(ownActiveProcedures(list, 'other').map(p => p.id)).toEqual(['y1']);
  });
});
