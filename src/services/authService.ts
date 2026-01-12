// Authentication service for basic login functionality
const AUTH_STORAGE_KEY = 'bulldog_auth_session';
const CREDENTIALS_KEY = 'bulldog_saved_credentials';

// Valid credentials
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'wKsZ!S144';

export interface AuthSession {
  isAuthenticated: boolean;
  username: string;
  loginTime: number;
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
  const session = getSession();
  return session?.isAuthenticated === true;
}

/**
 * Get current session from localStorage
 */
export function getSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    
    const session: AuthSession = JSON.parse(stored);
    // Verify session is still valid (not expired)
    // For now, sessions don't expire, but we could add expiration logic here
    return session;
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
}

/**
 * Attempt to login with username and password
 */
export function login(username: string, password: string): boolean {
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    const session: AuthSession = {
      isAuthenticated: true,
      username: username,
      loginTime: Date.now()
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return true;
  }
  
  return false;
}

/**
 * Logout the current user
 */
export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  // Optionally clear saved credentials on logout
  // localStorage.removeItem(CREDENTIALS_KEY);
}

/**
 * Save credentials for auto-fill (optional, for convenience)
 */
export function saveCredentials(username: string, password: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ username, password }));
  } else {
    localStorage.removeItem(CREDENTIALS_KEY);
  }
}

/**
 * Get saved credentials if they exist
 */
export function getSavedCredentials(): { username: string; password: string } | null {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading saved credentials:', error);
    return null;
  }
}
