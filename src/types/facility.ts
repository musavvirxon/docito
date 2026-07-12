// src/types/facility.ts
//
// Pharmacies, lab centers, and imaging centers are separate tables
// (not sub-types of `practices`), but they share the same shape of
// "physical healthcare location" data: contact details, hours,
// rating, verification. This is that shared shape — the type-specific
// hooks (usePharmacyPublicProfile, useLabPublicProfile,
// useImagingPublicProfile) each extend it with their own extra fields.

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean } | undefined;
}

export interface FacilityPublicData {
  id: string;
  admin_id: string | null;
  name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  operating_hours: OperatingHours | null;
  average_rating: number | null;
  num_reviews: number | null;
  verified: boolean | null;
  accepts_insurance: boolean | null;
}
