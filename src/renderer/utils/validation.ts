/**
 * Input validation helpers — defense-in-depth for user-supplied values
 * before they reach IPC handlers or PowerShell execution.
 */

/** Validates a sAMAccountName or email format */
export function isValidUsernameOrEmail(value: string): boolean {
  if (value.length > 256) return false;
  // Allow sAMAccountName chars or email format
  return /^[a-zA-Z0-9._@\-]+$/.test(value);
}

/** Validates a person name (letters, spaces, hyphens, apostrophes) */
export function isValidName(value: string): boolean {
  if (value.length > 128) return false;
  return /^[a-zA-Z\s'\-]+$/.test(value);
}

/** Validates an email address */
export function isValidEmail(value: string): boolean {
  if (value.length > 320) return false;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value);
}

/** Validates a DN (distinguished name) format */
export function isValidDN(value: string): boolean {
  if (!value || value.length > 2048) return false;
  // Basic DN pattern: must contain at least one = sign
  return /^[a-zA-Z]+=.+/.test(value);
}

