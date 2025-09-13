// Development configuration for quick testing and navigation
export const DISABLE_VALIDATION = true;

// Dummy data for quick form filling
export const DUMMY_DATA = {
  patient: {
    email: 'patient@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15',
    sex: 'male',
    phone: '(555) 123-4567',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    emergencyContact: 'Jane Doe',
    emergencyPhone: '(555) 987-6543',
    insurance: 'Blue Cross',
    allergies: 'None',
    medications: 'None',
    medicalHistory: 'No significant history'
  },
  doctor: {
    email: 'doctor@example.com',
    password: 'password123',
    firstName: 'Dr. Sarah',
    lastName: 'Smith',
    dateOfBirth: '1985-05-20',
    sex: 'female',
    phone: '(555) 234-5678',
    specialization: 'Cardiology',
    licenseNumber: 'MD123456',
    yearsOfExperience: '10',
    education: 'Harvard Medical School',
    bio: 'Experienced cardiologist with 10+ years of practice',
    clinicName: 'Heart Health Clinic',
    clinicAddress: '456 Medical Blvd',
    clinicCity: 'Boston',
    clinicState: 'MA',
    clinicZip: '02101'
  },
  practice: {
    email: 'practice@example.com',
    password: 'password123',
    practiceName: 'Downtown Medical Center',
    practiceType: 'General Practice',
    address: '789 Healthcare Dr',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    phone: '(555) 345-6789',
    website: 'www.downtownmedical.com',
    description: 'Full-service medical practice serving the downtown area',
    acceptedInsurance: 'Most major insurance plans',
    hours: 'Mon-Fri 8AM-6PM',
    emergencyNumber: '(555) 911-HELP'
  }
};