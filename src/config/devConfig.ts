// Development configuration for bypassing validation and authentication
export const BYPASS_VALIDATION = true;

// Development mode flags
export const DEV_CONFIG = {
  BYPASS_VALIDATION: true,
  SKIP_AUTH_CHECKS: true,
  ALLOW_EMPTY_FORMS: true,
  AUTO_NAVIGATE: true,
};

// Mock user data for development
export const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  role: 'doctor'
};