import { normalizeHeader } from './header-normalizer.service';

export interface MappingHint {
  sourceHeader: string;
  normalizedHeader: string;
  suggestedTarget?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const EXACT_MAPPINGS: Record<string, string> = {
  'customer_name': 'name',
  'full_name': 'name',
  'leads_email': 'email',
  'email_address': 'email',
  'mail_id': 'email',
  'electronic_mail': 'email',
  'phone_no': 'mobile_without_country_code',
  'mobile_number': 'mobile_without_country_code',
  'whatsapp_contact': 'mobile_without_country_code',
  'contact_number': 'mobile_without_country_code',
  'created_time': 'created_at',
  'lead_stage': 'crm_status',
  'pipeline_stage': 'crm_status',
  'lead_outcome': 'crm_status',
  'assigned_agent': 'lead_owner',
  'assigned_to': 'lead_owner',
  'sales_executive': 'lead_owner',
  'relationship_manager': 'lead_owner',
  'expected_handover': 'possession_time',
  'move_in_timeline': 'possession_time',
  'comments': 'crm_note',
  'follow_up_remarks': 'crm_note',
  'requirements': 'description',
  'property_preference': 'description',
};

export const detectAliases = (headers: string[], _sampleRecords: any[]): MappingHint[] => {
  return headers.map(header => {
    const normalized = normalizeHeader(header);
    
    // Exact mapping check
    if (EXACT_MAPPINGS[normalized]) {
      return {
        sourceHeader: header,
        normalizedHeader: normalized,
        suggestedTarget: EXACT_MAPPINGS[normalized],
        confidence: 'high'
      };
    }
    
    // Heuristic/substring matching
    if (normalized.includes('name') && !normalized.includes('company')) {
      return { sourceHeader: header, normalizedHeader: normalized, suggestedTarget: 'name', confidence: 'medium' };
    }
    if (normalized.includes('mail')) {
      return { sourceHeader: header, normalizedHeader: normalized, suggestedTarget: 'email', confidence: 'medium' };
    }
    if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('whatsapp')) {
      return { sourceHeader: header, normalizedHeader: normalized, suggestedTarget: 'mobile_without_country_code', confidence: 'medium' };
    }
    if (normalized.includes('company') || normalized.includes('organization')) {
      return { sourceHeader: header, normalizedHeader: normalized, suggestedTarget: 'company', confidence: 'medium' };
    }
    if (normalized.includes('status') || normalized.includes('stage') || normalized.includes('outcome')) {
      return { sourceHeader: header, normalizedHeader: normalized, suggestedTarget: 'crm_status', confidence: 'medium' };
    }
    if (normalized.includes('source') || normalized.includes('campaign')) {
      return { sourceHeader: header, normalizedHeader: normalized, suggestedTarget: 'data_source', confidence: 'medium' };
    }
    
    return {
      sourceHeader: header,
      normalizedHeader: normalized,
      confidence: 'low'
    };
  });
};
