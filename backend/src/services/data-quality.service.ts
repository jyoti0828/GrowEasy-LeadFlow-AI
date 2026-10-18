import { CrmRecord } from '../schemas/crm.schema';

export interface DataQuality {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs Review' | 'Poor';
  observations: string[];
}

export const calculateDataQuality = (records: CrmRecord[], totalUploaded: number): DataQuality => {
  if (totalUploaded === 0) {
    return { score: 0, label: 'Poor', observations: ['No records uploaded.'] };
  }

  const validCount = records.length;
  let hasEmail = 0;
  let hasMobile = 0;
  let hasName = 0;
  let hasExtraInfo = 0;

  records.forEach(r => {
    if (r.email) hasEmail++;
    if (r.mobile_without_country_code) hasMobile++;
    if (r.name) hasName++;
    if (r.crm_note || r.description || r.city || r.company) hasExtraInfo++;
  });

  // Score Components
  // 1. Success rate (max 40)
  const successScore = (validCount / totalUploaded) * 40;
  
  // 2. Completeness (max 60)
  const emailScore = (hasEmail / validCount || 0) * 15;
  const mobileScore = (hasMobile / validCount || 0) * 15;
  const nameScore = (hasName / validCount || 0) * 15;
  const extraScore = (hasExtraInfo / validCount || 0) * 15;

  let score = Math.round(successScore + emailScore + mobileScore + nameScore + extraScore);
  
  if (isNaN(score)) score = 0;

  let label: 'Excellent' | 'Good' | 'Needs Review' | 'Poor' = 'Poor';
  if (score >= 90) label = 'Excellent';
  else if (score >= 75) label = 'Good';
  else if (score >= 50) label = 'Needs Review';

  const observations: string[] = [];
  
  const successPct = Math.round((validCount / totalUploaded) * 100);
  observations.push(`${successPct}% of records were successfully extracted.`);
  
  const contactPct = Math.round(((hasEmail > hasMobile ? hasEmail : hasMobile) / validCount || 0) * 100);
  observations.push(`${contactPct}% of extracted records contain valid contact information.`);
  
  const missingNames = validCount - hasName;
  if (missingNames > 0) {
    observations.push(`${missingNames} records are missing lead names.`);
  }

  if (hasEmail > 0 && hasMobile > 0) {
    observations.push(`Both email and mobile information are well represented.`);
  }

  return {
    score,
    label,
    observations
  };
};
