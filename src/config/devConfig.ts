// Development configuration for bypassing validation and authentication
export const BYPASS_VALIDATION = false;

// Development mode flags
export const DEV_CONFIG = {
  BYPASS_VALIDATION: false,
  SKIP_AUTH_CHECKS: false,
  ALLOW_EMPTY_FORMS: false,
  AUTO_NAVIGATE: false,
};

// Mock user data for development
export const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  role: 'doctor'
};