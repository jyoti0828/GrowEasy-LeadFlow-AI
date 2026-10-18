import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export const normalizePhone = (phone: string): { countryCode: string, mobileWithoutCountryCode: string } => {
  if (!phone) return { countryCode: '', mobileWithoutCountryCode: '' };
  
  // Clean basic formatting artifacts that might confuse the parser if multiple exist
  let cleaned = phone.trim();

  // If multiple numbers are provided (e.g. separated by comma), take the first one
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0].trim();
  }

  // Try parsing the number strictly
  const phoneNumber = parsePhoneNumberFromString(cleaned);
  
  if (phoneNumber && phoneNumber.isValid()) {
    return {
      countryCode: `+${phoneNumber.countryCallingCode}`,
      mobileWithoutCountryCode: phoneNumber.nationalNumber
    };
  }

  // If we can't parse it confidently with a country code, we return just the digits as the mobile number.
  // We do NOT invent a country code or assume a default like +91.
  let rawDigits = cleaned.replace(/\D/g, '');
  
  // If it started with a + and has digits, but was somehow invalid in libphonenumber, 
  // we still don't invent a code, we just return the raw digits.
  
  return { 
    countryCode: '', 
    mobileWithoutCountryCode: rawDigits 
  };
};
