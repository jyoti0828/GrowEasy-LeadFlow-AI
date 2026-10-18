import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../utils/phone';
import { isValidEmail } from '../utils/email';

describe('Phone Normalization', () => {
  it('should remove formatting characters (Number containing spaces, hyphens, parentheses)', () => {
    // Note: without country code, libphonenumber may not parse it as valid, so it falls back to raw digits
    expect(normalizePhone(' (555) 123-4567 ').mobileWithoutCountryCode).toBe('5551234567');
  });

  it('should extract country code when present (Indian international number)', () => {
    const result = normalizePhone('+91 98765 43210');
    expect(result.countryCode).toBe('+91');
    expect(result.mobileWithoutCountryCode).toBe('9876543210');
  });

  it('should handle US international number', () => {
    // 555 area code is fictitious and rejected by libphonenumber, using a real NYC format
    const result = normalizePhone('+1 (212) 832-2000');
    expect(result.countryCode).toBe('+1');
    expect(result.mobileWithoutCountryCode).toBe('2128322000');
  });

  it('should handle UK international number', () => {
    const result = normalizePhone('+44 7911 123456');
    expect(result.countryCode).toBe('+44');
    expect(result.mobileWithoutCountryCode).toBe('7911123456');
  });

  it('should handle Local number without country context', () => {
    const result = normalizePhone('9876543210');
    expect(result.countryCode).toBe('');
    expect(result.mobileWithoutCountryCode).toBe('9876543210');
  });

  it('should handle invalid phone value', () => {
    const result = normalizePhone('abc xyz');
    expect(result.countryCode).toBe('');
    expect(result.mobileWithoutCountryCode).toBe('');
  });

  it('should handle multiple phone numbers', () => {
    const result = normalizePhone('+91 9876543210, +1 555 123 4567');
    expect(result.countryCode).toBe('+91');
    expect(result.mobileWithoutCountryCode).toBe('9876543210');
  });

  it('should handle Country code separation', () => {
    const result = normalizePhone('+919876543210');
    expect(result.countryCode).toBe('+91');
    expect(result.mobileWithoutCountryCode).toBe('9876543210');
  });
});

describe('Email Validation', () => {
  it('should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('test.name+tag@example.co.uk')).toBe(true);
  });

  it('should invalidate incorrect emails', () => {
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('test@example')).toBe(false);
    expect(isValidEmail('invalid email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
