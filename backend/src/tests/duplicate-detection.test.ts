import { describe, it, expect } from 'vitest';
import { detectDuplicates } from '../services/duplicate-detection.service';
import { CrmRecord } from '../schemas/crm.schema';

const createMockRecord = (overrides: Partial<CrmRecord>): CrmRecord => {
  return {
    created_at: '', name: '', email: '', country_code: '', mobile_without_country_code: '',
    company: '', city: '', state: '', country: '', lead_owner: '',
    crm_status: '', crm_note: '', data_source: '', possession_time: '', description: '',
    ...overrides
  } as CrmRecord;
};

describe('Duplicate Detection', () => {
  it('should detect email duplicates', () => {
    const records = [
      createMockRecord({ email: 'test@example.com' }),
      createMockRecord({ email: 'test@example.com' }),
      createMockRecord({ email: 'other@example.com' })
    ];
    
    const result = detectDuplicates(records);
    expect(result.possibleDuplicateCount).toBe(2);
    expect(result.groups.length).toBe(1);
    expect(result.groups[0].emails).toContain('test@example.com');
  });

  it('should detect phone duplicates without double counting email dupes', () => {
    const records = [
      createMockRecord({ email: 'a@a.com', mobile_without_country_code: '123' }),
      createMockRecord({ email: 'b@b.com', mobile_without_country_code: '123' }), // Phone duplicate
      createMockRecord({ email: 'c@c.com', mobile_without_country_code: '456' })
    ];
    
    const result = detectDuplicates(records);
    expect(result.possibleDuplicateCount).toBe(2);
    expect(result.groups.length).toBe(1);
    expect(result.groups[0].phones).toContain('123');
  });

  it('should detect duplicates by same normalized email (missing name)', () => {
    const records = [
      createMockRecord({ name: '', email: 'no-name@test.com' }),
      createMockRecord({ name: '', email: 'no-name@test.com' })
    ];
    const result = detectDuplicates(records);
    expect(result.possibleDuplicateCount).toBe(2);
  });

  it('should detect duplicates by same normalized mobile (missing name)', () => {
    const records = [
      createMockRecord({ name: '', mobile_without_country_code: '5559999' }),
      createMockRecord({ name: '', mobile_without_country_code: '5559999' })
    ];
    const result = detectDuplicates(records);
    expect(result.possibleDuplicateCount).toBe(2);
  });

  it('should not mark as duplicate if same name but different email and mobile', () => {
    const records = [
      createMockRecord({ name: 'John Doe', email: 'john1@test.com', mobile_without_country_code: '111' }),
      createMockRecord({ name: 'John Doe', email: 'john2@test.com', mobile_without_country_code: '222' })
    ];
    const result = detectDuplicates(records);
    expect(result.possibleDuplicateCount).toBe(0);
  });

  it('preserves all imported records by only returning insights instead of filtering them', () => {
    const records = [
      createMockRecord({ email: 'test@example.com' }),
      createMockRecord({ email: 'test@example.com' })
    ];
    const result = detectDuplicates(records);
    expect(records.length).toBe(2);
    expect(result.possibleDuplicateCount).toBe(2);
  });
});
