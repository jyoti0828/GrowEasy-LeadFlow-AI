import { describe, it, expect } from 'vitest';
import { crmRecordSchema } from '../schemas/crm.schema';
import { aiOutputSchema } from '../schemas/ai-output.schema';

describe('Schema Validation', () => {
  it('should sanitize unsupported enum values into empty strings', () => {
    const data = {
      created_at: '2023-01-01',
      name: 'John Doe',
      email: 'test@example.com',
      country_code: '+1',
      mobile_without_country_code: '5551234567',
      company: '',
      city: '',
      state: '',
      country: '',
      lead_owner: '',
      crm_status: 'UNSUPPORTED_STATUS', // Invalid
      crm_note: '',
      data_source: 'unknown_source', // Invalid
      possession_time: '',
      description: ''
    };

    const result = crmRecordSchema.parse(data);
    expect(result.crm_status).toBe('');
    expect(result.data_source).toBe('');
  });

  it('should strip extra AI-generated fields', () => {
    const data = {
      created_at: '',
      name: 'Jane',
      email: '',
      country_code: '',
      mobile_without_country_code: '',
      company: '',
      city: '',
      state: '',
      country: '',
      lead_owner: '',
      crm_status: 'BAD_LEAD',
      crm_note: '',
      data_source: 'eden_park',
      possession_time: '',
      description: '',
      ai_confidence: 0.9, // Extra field
      something_else: true // Extra field
    };

    const result = crmRecordSchema.parse(data);
    expect((result as any).ai_confidence).toBeUndefined();
    expect((result as any).something_else).toBeUndefined();
    expect(result.name).toBe('Jane');
  });

  it('should convert missing fields to empty strings', () => {
    // Empty object but missing required fields
    const data = { crm_status: 'SALE_DONE', data_source: 'leads_on_demand' };

    // With .catch(''), z.string() defaults to '' if missing or invalid type
    const result = crmRecordSchema.parse(data);
    expect(result.name).toBe('');
    expect(result.email).toBe('');
    expect(result.crm_status).toBe('SALE_DONE');
  });

  it('should retain source_row_index inside aiOutputSchema but strip it from crmRecordSchema', () => {
    const data = {
      source_row_index: 5,
      name: 'John',
      crm_status: '',
      data_source: ''
    };

    const aiResult = aiOutputSchema.parse({ records: [data] });
    expect(aiResult.records[0].source_row_index).toBe(5);
    expect(aiResult.records[0].name).toBe('John');

    // crmRecordSchema strips source_row_index
    const crmResult = crmRecordSchema.parse(data);
    expect((crmResult as any).source_row_index).toBeUndefined();
  });
});
