// Development configuration
// IMPORTANT: These values are for development convenience only
// They have NO effect in production builds due to build-time checks in useDevMode.ts

// This flag is deprecated and has no effect
// The useDevMode hook now uses import.meta.env.DEV instead
export const BYPASS_VALIDATION = false;

// Development mode flags (only used in development builds)
export const DEV_CONFIG = {
  BYPASS_VALIDATION: false,
  SKIP_AUTH_CHECKS: false,
  ALLOW_EMPTY_FORMS: false,
  AUTO_NAVIGATE: false,
};

// REMOVED: MOCK_USER has been removed for security
// Use proper test accounts in development instead
