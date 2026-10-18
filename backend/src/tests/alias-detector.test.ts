import { describe, it, expect } from 'vitest';
import { detectAliases } from '../services/alias-detector.service';

describe('Alias Detector', () => {
  it('should detect exact aliases', () => {
    const headers = ['Full Name', 'Mail ID', 'Phone No.'];
    const hints = detectAliases(headers, []);
    
    expect(hints.find(h => h.sourceHeader === 'Full Name')?.suggestedTarget).toBe('name');
    expect(hints.find(h => h.sourceHeader === 'Full Name')?.confidence).toBe('high');
    
    expect(hints.find(h => h.sourceHeader === 'Mail ID')?.suggestedTarget).toBe('email');
    expect(hints.find(h => h.sourceHeader === 'Phone No.')?.suggestedTarget).toBe('mobile_without_country_code');
  });

  it('should use substring heuristics for medium confidence', () => {
    const headers = ['Applicant Name', 'Personal E-mail', 'WhatsApp'];
    const hints = detectAliases(headers, []);
    
    expect(hints.find(h => h.sourceHeader === 'Applicant Name')?.suggestedTarget).toBe('name');
    expect(hints.find(h => h.sourceHeader === 'Applicant Name')?.confidence).toBe('medium');
    
    expect(hints.find(h => h.sourceHeader === 'Personal E-mail')?.suggestedTarget).toBe('email');
    expect(hints.find(h => h.sourceHeader === 'WhatsApp')?.suggestedTarget).toBe('mobile_without_country_code');
  });
});
