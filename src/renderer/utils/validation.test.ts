import { describe, it, expect } from 'vitest';
import { isValidUsernameOrEmail, isValidName, isValidEmail, isValidDN } from './validation';

// ── isValidUsernameOrEmail ──────────────────────────────────────────────────

describe('isValidUsernameOrEmail', () => {
  it('accepts a simple sAMAccountName', () => {
    expect(isValidUsernameOrEmail('jdoe')).toBe(true);
  });

  it('accepts sAMAccountName with dots, hyphens, underscores', () => {
    expect(isValidUsernameOrEmail('john.doe-test_user')).toBe(true);
  });

  it('accepts an email address', () => {
    expect(isValidUsernameOrEmail('jdoe@contoso.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUsernameOrEmail('')).toBe(false);
  });

  it('rejects strings with spaces', () => {
    expect(isValidUsernameOrEmail('john doe')).toBe(false);
  });

  it('rejects PowerShell injection attempts', () => {
    expect(isValidUsernameOrEmail('jdoe; Remove-ADUser')).toBe(false);
    expect(isValidUsernameOrEmail('jdoe$(whoami)')).toBe(false);
    expect(isValidUsernameOrEmail('jdoe`nGet-Process')).toBe(false);
    expect(isValidUsernameOrEmail('jdoe|Format-Table')).toBe(false);
  });

  it('rejects strings exceeding 256 characters', () => {
    expect(isValidUsernameOrEmail('a'.repeat(257))).toBe(false);
  });

  it('accepts strings at exactly 256 characters', () => {
    expect(isValidUsernameOrEmail('a'.repeat(256))).toBe(true);
  });
});

// ── isValidName ─────────────────────────────────────────────────────────────

describe('isValidName', () => {
  it('accepts simple names', () => {
    expect(isValidName('John')).toBe(true);
    expect(isValidName('Jane Doe')).toBe(true);
  });

  it('accepts hyphenated names', () => {
    expect(isValidName("Mary-Jane")).toBe(true);
  });

  it('accepts names with apostrophes', () => {
    expect(isValidName("O'Brien")).toBe(true);
  });

  it('rejects names with numbers', () => {
    expect(isValidName('John3')).toBe(false);
  });

  it('rejects names with special characters', () => {
    expect(isValidName('John;DROP')).toBe(false);
    expect(isValidName('John<script>')).toBe(false);
  });

  it('rejects strings exceeding 128 characters', () => {
    expect(isValidName('a'.repeat(129))).toBe(false);
  });

  it('accepts strings at exactly 128 characters', () => {
    expect(isValidName('a'.repeat(128))).toBe(true);
  });
});

// ── isValidEmail ────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('accepts standard email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last@company.co.uk')).toBe(true);
  });

  it('accepts emails with plus addressing', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects emails without @ sign', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects emails without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects strings exceeding 320 characters', () => {
    const longEmail = 'a'.repeat(310) + '@example.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });
});

// ── isValidDN ───────────────────────────────────────────────────────────────

describe('isValidDN', () => {
  it('accepts a standard OU path', () => {
    expect(isValidDN('OU=Users,DC=contoso,DC=com')).toBe(true);
  });

  it('accepts a CN path', () => {
    expect(isValidDN('CN=John Doe,OU=Users,DC=contoso,DC=com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidDN('')).toBe(false);
  });

  it('rejects strings without = sign', () => {
    expect(isValidDN('just-a-string')).toBe(false);
  });

  it('rejects strings starting with non-alpha', () => {
    expect(isValidDN('=bad')).toBe(false);
    expect(isValidDN('1=bad')).toBe(false);
  });

  it('rejects strings exceeding 2048 characters', () => {
    expect(isValidDN('OU=' + 'a'.repeat(2048))).toBe(false);
  });

  it('accepts strings at exactly 2048 characters', () => {
    const dn = 'OU=' + 'a'.repeat(2045);
    expect(isValidDN(dn)).toBe(true);
  });
});

