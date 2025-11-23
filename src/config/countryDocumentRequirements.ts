export interface DocumentRequirement {
  key: string;
  label: string;
  required: boolean;
  acceptedFormats: string;
  description?: string;
}

export interface CountryRequirements {
  name: string;
  code: string;
  documents: DocumentRequirement[];
}

// Global documents required for all countries
export const GLOBAL_DOCUMENTS: DocumentRequirement[] = [
  {
    key: 'primary_id',
    label: 'Primary ID (Passport/National ID/Driver\'s License)',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    description: 'Any government-issued photo ID'
  },
  {
    key: 'proof_of_residence',
    label: 'Proof of Residence',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    description: 'Utility bill, bank statement, or lease agreement (within 3 months)'
  },
  {
    key: 'medical_degree',
    label: 'Medical Degree (MBBS/MD/DDS/DMD/DO)',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    description: 'Original medical school diploma'
  },
  {
    key: 'medical_license',
    label: 'National Medical License',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    description: 'Current valid medical license'
  },
  {
    key: 'professional_id',
    label: 'Professional ID/Medical Council Registration',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    description: 'Registration certificate from medical council'
  },
  {
    key: 'clinic_employment_proof',
    label: 'Clinic Employment Proof',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    description: 'Employment contract, offer letter, or HR letter with clinic stamp'
  },
];

// Country-specific additional requirements
export const COUNTRY_REQUIREMENTS: Record<string, CountryRequirements> = {
  US: {
    name: 'United States',
    code: 'US',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'state_medical_license',
        label: 'State Medical License',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Valid state medical board license'
      },
      {
        key: 'usmle_certificates',
        label: 'USMLE Steps 1-3 Certificates',
        required: true,
        acceptedFormats: '.pdf',
        description: 'All USMLE step certificates'
      },
      {
        key: 'residency_certificate',
        label: 'ACGME Residency Certificate',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Residency completion certificate'
      },
      {
        key: 'dea_number',
        label: 'DEA Number Certificate',
        required: false,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'For controlled substance prescribing'
      },
      {
        key: 'board_certification',
        label: 'Board Certification (ABMS)',
        required: false,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Specialty board certification'
      },
      {
        key: 'malpractice_insurance',
        label: 'Malpractice Insurance Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Current malpractice insurance policy'
      },
      {
        key: 'background_check',
        label: 'Background Check/Criminal Record',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Recent background verification'
      },
    ]
  },
  GB: {
    name: 'United Kingdom',
    code: 'GB',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'gmc_license',
        label: 'GMC License',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'General Medical Council registration'
      },
      {
        key: 'plab_mrcp_mrcs',
        label: 'PLAB/MRCP/MRCS Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Professional examination certificates'
      },
      {
        key: 'nhs_number',
        label: 'NHS Employment Number',
        required: false,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'If employed by NHS'
      },
      {
        key: 'dbs_check',
        label: 'DBS Criminal Check',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Disclosure and Barring Service check'
      },
      {
        key: 'indemnity_insurance',
        label: 'Professional Indemnity Insurance',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Current insurance certificate'
      },
      {
        key: 'language_certificate',
        label: 'IELTS/OET Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'For non-native English speakers'
      },
    ]
  },
  AE: {
    name: 'United Arab Emirates',
    code: 'AE',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'dataflow_verification',
        label: 'DataFlow Primary Source Verification',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Credential verification report'
      },
      {
        key: 'prometric_exam',
        label: 'Prometric Exam Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'DHA/DOH/HAAD exam result'
      },
      {
        key: 'good_standing_certificate',
        label: 'Good Standing Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'From home country medical council'
      },
      {
        key: 'emirates_id',
        label: 'Emirates ID',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Valid Emirates ID card'
      },
      {
        key: 'labor_card',
        label: 'Labor Card',
        required: false,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'UAE work permit'
      },
      {
        key: 'health_certificate',
        label: 'Health Fitness Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Recent medical fitness report'
      },
    ]
  },
  IN: {
    name: 'India',
    code: 'IN',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'nmc_registration',
        label: 'NMC Registration Certificate',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'National Medical Commission registration'
      },
      {
        key: 'state_medical_council',
        label: 'State Medical Council License',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'State-level registration'
      },
      {
        key: 'neet_certificate',
        label: 'NEET PG/UG Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Entrance exam results'
      },
      {
        key: 'internship_completion',
        label: 'Internship Completion Certificate',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Medical internship certificate'
      },
      {
        key: 'aadhaar_card',
        label: 'Aadhaar Card',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'National ID card'
      },
    ]
  },
  PK: {
    name: 'Pakistan',
    code: 'PK',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'pmc_license',
        label: 'PMC License',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Pakistan Medical Commission registration'
      },
      {
        key: 'house_job_certificate',
        label: 'House Job Certificate',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'House job completion certificate'
      },
      {
        key: 'fcps_mcps',
        label: 'FCPS/MCPS Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'For specialists'
      },
    ]
  },
  TR: {
    name: 'Turkey',
    code: 'TR',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'moh_registration',
        label: 'Sağlık Bakanlığı (MOH) Registration',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Ministry of Health registration'
      },
      {
        key: 'yok_equivalency',
        label: 'YÖK Equivalency Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'For foreign-trained doctors'
      },
    ]
  },
  DE: {
    name: 'Germany',
    code: 'DE',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'approbation',
        label: 'Approbation Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Medical license to practice in Germany'
      },
      {
        key: 'language_certificate',
        label: 'German Language Certificate (B2/C1)',
        required: true,
        acceptedFormats: '.pdf',
        description: 'FSP or Goethe certificate'
      },
      {
        key: 'diploma_recognition',
        label: 'Diploma Recognition Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'For foreign medical degrees'
      },
    ]
  },
  CA: {
    name: 'Canada',
    code: 'CA',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'provincial_license',
        label: 'Provincial Medical License',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Valid provincial college registration'
      },
      {
        key: 'rcpsc_certificate',
        label: 'RCPSC Specialty Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'For specialists'
      },
      {
        key: 'mccqe_certificate',
        label: 'MCCQE Certificate',
        required: true,
        acceptedFormats: '.pdf',
        description: 'Medical Council of Canada Qualifying Examination'
      },
      {
        key: 'liability_insurance',
        label: 'Professional Liability Insurance',
        required: true,
        acceptedFormats: '.pdf',
        description: 'CMPA or private insurance'
      },
    ]
  },
  AU: {
    name: 'Australia',
    code: 'AU',
    documents: [
      ...GLOBAL_DOCUMENTS,
      {
        key: 'ahpra_registration',
        label: 'AHPRA Registration',
        required: true,
        acceptedFormats: '.pdf,.jpg,.jpeg,.png',
        description: 'Australian Health Practitioner Regulation Agency'
      },
      {
        key: 'oet_ielts',
        label: 'OET/IELTS Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'For non-native English speakers'
      },
      {
        key: 'amc_certificate',
        label: 'AMC Examination Certificate',
        required: false,
        acceptedFormats: '.pdf',
        description: 'Australian Medical Council assessment'
      },
    ]
  },
};

export const getCountryRequirements = (countryCode: string): DocumentRequirement[] => {
  const country = COUNTRY_REQUIREMENTS[countryCode];
  return country ? country.documents : GLOBAL_DOCUMENTS;
};

export const getAllCountries = (): { code: string; name: string }[] => {
  return Object.values(COUNTRY_REQUIREMENTS).map(country => ({
    code: country.code,
    name: country.name
  }));
};
