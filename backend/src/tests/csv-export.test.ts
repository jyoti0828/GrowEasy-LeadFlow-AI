import { describe, it, expect } from 'vitest';
import { crmRecordSchema } from '../schemas/crm.schema';
import { CrmRecord } from '../schemas/crm.schema';
import Papa from 'papaparse';

// ===================================================================
// CSV EXPORT — Field order, injection protection, edge cases
// ===================================================================

const CRM_FIELDS = [
  'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
  'company', 'city', 'state', 'country', 'lead_owner', 'crm_status',
  'crm_note', 'data_source', 'possession_time', 'description'
];

function buildCsvRow(record: Partial<CrmRecord>): Record<string, string> {
  const ordered: Record<string, string> = {};
  CRM_FIELDS.forEach(field => {
    let val = (record as any)[field] || '';
    // Formula injection mitigation (same logic as ResultsDashboard)
    if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
      val = `'${val}`;
    }
    ordered[field] = val;
  });
  return ordered;
}

const makeRecord = (overrides: Partial<CrmRecord> = {}): CrmRecord => ({
  created_at: '', name: '', email: '', country_code: '', mobile_without_country_code: '',
  company: '', city: '', state: '', country: '', lead_owner: '',
  crm_status: '', crm_note: '', data_source: '', possession_time: '', description: '',
  ...overrides
} as CrmRecord);

describe('CSV Export', () => {
  it('exports exactly 15 columns in the correct order', () => {
    const record = makeRecord({ name: 'John Doe', email: 'john@example.com' });
    const row = buildCsvRow(record);
    const keys = Object.keys(row);
    expect(keys).toEqual(CRM_FIELDS);
    expect(keys.length).toBe(15);
  });

  it('does not include internal fields in export', () => {
    const record = makeRecord({ name: 'Test' });
    const row = buildCsvRow(record);
    expect(row).not.toHaveProperty('source_row_index');
    expect(row).not.toHaveProperty('sourceRowIndex');
    expect(row).not.toHaveProperty('skip_reason');
    expect(row).not.toHaveProperty('qualityScore');
  });

  it('empty string values remain safe CSV cells', () => {
    const record = makeRecord({ name: 'Test' });
    const row = buildCsvRow(record);
    const csv = Papa.unparse([row]);
    expect(csv).toContain('name');
    expect(csv).toContain('Test');
  });

  it('sanitizes formula injection: = prefix', () => {
    const record = makeRecord({ name: '=SUM(A1:A10)', crm_note: '=HYPERLINK("evil.com","click")' });
    const row = buildCsvRow(record);
    expect(row.name).toBe("'=SUM(A1:A10)");
    expect(row.crm_note).toBe("'=HYPERLINK(\"evil.com\",\"click\")");
  });

  it('sanitizes formula injection: + prefix', () => {
    const record = makeRecord({ description: '+cmd|" /C calc"!A0' });
    const row = buildCsvRow(record);
    expect(row.description).toBe("'+cmd|\" /C calc\"!A0");
  });

  it('sanitizes formula injection: - prefix', () => {
    const record = makeRecord({ city: '-2+3+cmd' });
    const row = buildCsvRow(record);
    expect(row.city).toBe("'-2+3+cmd");
  });

  it('sanitizes formula injection: @ prefix', () => {
    const record = makeRecord({ company: '@SUM(1+1)*cmd|' });
    const row = buildCsvRow(record);
    expect(row.company).toBe("'@SUM(1+1)*cmd|");
  });

  it('does not modify values that do not start with =+-@', () => {
    const record = makeRecord({ name: 'John Doe', company: 'Acme Corp' });
    const row = buildCsvRow(record);
    expect(row.name).toBe('John Doe');
    expect(row.company).toBe('Acme Corp');
  });

  it('produces parseable CSV from Papa.unparse', () => {
    const records = [
      makeRecord({ name: 'Alice', email: 'alice@test.com', crm_note: 'Has comma, inside' }),
      makeRecord({ name: 'Bob "The Builder"', email: 'bob@test.com' }),
    ];
    const rows = records.map(buildCsvRow);
    const csv = Papa.unparse(rows);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true });
    expect(parsed.data[0].name).toBe('Alice');
    expect(parsed.data[0].crm_note).toBe('Has comma, inside');
    expect(parsed.data[1].name).toBe('Bob "The Builder"');
  });
});

// ===================================================================
// CRM SCHEMA — All 15 fields, strict validation
// ===================================================================

describe('CRM Schema — Exact 15 Fields', () => {
  it('should parse and contain all 15 required CRM fields', () => {
    const data = {
      created_at: '2024-01-01', name: 'Jane', email: 'jane@test.com',
      country_code: '+44', mobile_without_country_code: '7911123456',
      company: 'Acme', city: 'London', state: 'England', country: 'UK',
      lead_owner: 'agent@test.com', crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: 'Interested', data_source: 'meridian_tower',
      possession_time: 'Q1 2025', description: 'Wants 3BHK'
    };
    const result = crmRecordSchema.parse(data);
    CRM_FIELDS.forEach(field => {
      expect(result).toHaveProperty(field);
    });
    expect(Object.keys(result).length).toBe(15);
  });

  it('strips extra properties beyond the 15 CRM fields', () => {
    const data = {
      created_at: '', name: 'Test', email: '', country_code: '',
      mobile_without_country_code: '', company: '', city: '', state: '',
      country: '', lead_owner: '', crm_status: '', crm_note: '',
      data_source: '', possession_time: '', description: '',
      source_row_index: 99, // must be stripped
      internal_confidence: 0.9, // must be stripped
    };
    const result = crmRecordSchema.parse(data);
    expect((result as any).source_row_index).toBeUndefined();
    expect((result as any).internal_confidence).toBeUndefined();
  });
});

// ===================================================================
// REAL-ESTATE REGRESSION — CSV skip categorization rules
// ===================================================================

describe('Real-Estate Regression — Skip Rules', () => {
  it('marks records with valid contact as AI failure, not contact failure', () => {
    // Simulates what import.controller does when a batch fails completely:
    // John Doe has +14155552671 (valid) → should be "AI extraction failed"
    // Empty Record has no contact → should be "No valid contact"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;

    function categorizeSkipReason(emailVal: string, phoneVal: string): string {
      const isValidE = emailVal !== '' && emailRegex.test(emailVal);
      const isValidP = phoneVal !== '' && phoneRegex.test(phoneVal) && phoneVal.replace(/\D/g, '').length >= 7;
      const hasAny = emailVal !== '' || phoneVal !== '';

      if (isValidE || isValidP) return 'AI extraction failed after retry.';
      if (hasAny) return 'Email and mobile values were invalid.';
      return 'No valid email address or mobile number was detected.';
    }

    // Row 2: John Doe — valid phone, valid email
    expect(categorizeSkipReason('john.doe@example.com', '+14155552671')).toBe('AI extraction failed after retry.');
    // Row 3: Jane Smith — valid phone, valid email
    expect(categorizeSkipReason('jane.smith@example.co.uk', '+447911123456')).toBe('AI extraction failed after retry.');
    // Row 4: Empty Record — no contact
    expect(categorizeSkipReason('', '')).toBe('No valid email address or mobile number was detected.');
    // Row 5: Invalid Contact — present but invalid
    expect(categorizeSkipReason('invalid_email', 'InvalidPhone')).toBe('Email and mobile values were invalid.');
  });

  it('validates international phone formats correctly', () => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
    expect(phoneRegex.test('+14155552671')).toBe(true);
    expect(phoneRegex.test('+447911123456')).toBe(true);
    expect(phoneRegex.test('+91 98765 43210')).toBe(true);
    expect(phoneRegex.test('InvalidPhone')).toBe(false);
    expect(phoneRegex.test('')).toBe(false);
  });

  it('validates email format correctly', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('john.doe@example.com')).toBe(true);
    expect(emailRegex.test('jane.smith@example.co.uk')).toBe(true);
    expect(emailRegex.test('invalid_email')).toBe(false);
    expect(emailRegex.test('')).toBe(false);
  });
});
