import { describe, it, expect } from 'vitest';
import { calculateDataQuality } from '../services/data-quality.service';
import { CrmRecord } from '../schemas/crm.schema';

const createMockRecord = (overrides: Partial<CrmRecord>): CrmRecord => {
  return {
    created_at: '', name: '', email: '', country_code: '', mobile_without_country_code: '',
    company: '', city: '', state: '', country: '', lead_owner: '',
    crm_status: '', crm_note: '', data_source: '', possession_time: '', description: '',
    ...overrides
  } as CrmRecord;
};

describe('Data Quality Calculator', () => {
  it('should score 0 for empty uploads', () => {
    const result = calculateDataQuality([], 0);
    expect(result.score).toBe(0);
    expect(result.label).toBe('Poor');
  });

  it('should score high for complete records', () => {
    const records = [
      createMockRecord({ name: 'A', email: 'a@a.com', mobile_without_country_code: '1', created_at: 'now', crm_note: 'note' }),
      createMockRecord({ name: 'B', email: 'b@b.com', mobile_without_country_code: '2', created_at: 'now', crm_note: 'note' })
    ];
    const result = calculateDataQuality(records, 2);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe('Excellent');
  });
});
