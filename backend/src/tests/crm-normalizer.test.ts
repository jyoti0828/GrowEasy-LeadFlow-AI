import { describe, it, expect } from 'vitest';
import { normalizeAndValidateRecord, hasValidContact } from '../services/crm-normalizer.service';
import { AiOutputRecord } from '../schemas/ai-output.schema';
import { CrmRecord } from '../schemas/crm.schema';

describe('CRM Normalizer', () => {
  it('should properly structure and validate a correct record', () => {
    const aiRecord: AiOutputRecord = {
      source_row_index: 1,
      created_at: '2026-07-01T10:00:00Z',
      name: 'John Doe',
      email: 'john@example.com',
      country_code: '+1',
      mobile_without_country_code: '5551234567',
      company: 'Test Co',
      city: 'NY',
      state: 'NY',
      country: 'USA',
      lead_owner: 'agent@test.com',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: 'Call back\ntomorrow',
      data_source: 'leads_on_demand',
      possession_time: 'Immediate',
      description: 'Wants a corner office\nBudget flexible'
    };

    const result = normalizeAndValidateRecord(aiRecord);
    expect(result).not.toBeNull();
    
    // Internal index should be removed
    expect((result as any).source_row_index).toBeUndefined();
    
    // Newlines should be cleaned
    expect(result?.crm_note).toBe('Call back tomorrow');
    expect(result?.description).toBe('Wants a corner office Budget flexible');
  });

  it('should sanitize invalid enums to empty strings', () => {
    const aiRecord: any = {
      source_row_index: 2,
      created_at: '', name: 'Jane', email: 'jane@example.com',
      country_code: '', mobile_without_country_code: '',
      company: '', city: '', state: '', country: '', lead_owner: '',
      crm_status: 'NOT_A_REAL_STATUS', // Invalid
      crm_note: '', data_source: '', possession_time: '', description: ''
    };

    const result = normalizeAndValidateRecord(aiRecord);
    expect(result).not.toBeNull();
    expect(result?.crm_status).toBe('');
  });
});

describe('Valid Contact Checking', () => {
  it('should return true if only email is present', () => {
    const record = { email: 'test@example.com', mobile_without_country_code: '' } as CrmRecord;
    expect(hasValidContact(record)).toBe(true);
  });

  it('should return true if only mobile is present', () => {
    const record = { email: '', mobile_without_country_code: '1234567890' } as CrmRecord;
    expect(hasValidContact(record)).toBe(true);
  });

  it('should return false if neither is present', () => {
    const record = { email: '', mobile_without_country_code: '' } as CrmRecord;
    expect(hasValidContact(record)).toBe(false);
  });

  it('should return false if email is invalid and no mobile is present', () => {
    const record = { email: 'invalid', mobile_without_country_code: '' } as CrmRecord;
    expect(hasValidContact(record)).toBe(false);
  });
});
