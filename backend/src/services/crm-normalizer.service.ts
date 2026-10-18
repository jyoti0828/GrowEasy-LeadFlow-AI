import { AiOutputRecord } from '../schemas/ai-output.schema';
import { crmRecordSchema, CrmRecord } from '../schemas/crm.schema';
import { normalizePhone } from '../utils/phone';
import { isValidEmail } from '../utils/email';
import { normalizeDate } from '../utils/date';

export const normalizeAndValidateRecord = (record: AiOutputRecord): CrmRecord | null => {
  const result: any = { ...record };
  
  // Re-verify the email and phone (in case AI hallucinated some weird stuff)
  if (result.email && !isValidEmail(result.email)) {
    // try to split or extract, or just clear if invalid
    const emails = result.email.split(/[\s,;]+/);
    const valid = emails.find(isValidEmail);
    if (valid) {
      result.email = valid;
    } else {
      result.email = '';
    }
  }
  
  if (result.mobile_without_country_code) {
    // If AI already put a full international number in mobile field, don't prepend country_code again
    const mobileVal = result.mobile_without_country_code.trim();
    const fullNumber = mobileVal.startsWith('+')
      ? mobileVal
      : (result.country_code || '') + mobileVal;

    const { countryCode, mobileWithoutCountryCode } = normalizePhone(fullNumber);
    result.country_code = countryCode || result.country_code || '';
    result.mobile_without_country_code = mobileWithoutCountryCode;
  }
  
  if (result.created_at) {
    result.created_at = normalizeDate(result.created_at);
  }
  
  // Clean newlines
  if (result.crm_note) {
    result.crm_note = result.crm_note.replace(/\n/g, ' ');
  }
  if (result.description) {
    result.description = result.description.replace(/\n/g, ' ');
  }

  // Remove internal tracking field
  delete result.source_row_index;
  
  // Zod validation against final strict schema
  const parsed = crmRecordSchema.safeParse(result);
  
  if (!parsed.success) {
    // If it fails final validation, we can log and return null (which marks it as skipped)
    return null;
  }
  
  return parsed.data;
};

export const hasValidContact = (record: CrmRecord): boolean => {
  return (
    (record.email !== '' && isValidEmail(record.email)) ||
    (record.mobile_without_country_code !== '')
  );
};
