import { CrmRecord } from '../schemas/crm.schema';

export interface DuplicateInsights {
  possibleDuplicateCount: number;
  groups: {
    emails?: string[];
    phones?: string[];
    records: CrmRecord[];
  }[];
}

export const detectDuplicates = (records: CrmRecord[]): DuplicateInsights => {
  const emailMap = new Map<string, CrmRecord[]>();
  const phoneMap = new Map<string, CrmRecord[]>();
  
  // Group by email and phone
  records.forEach(record => {
    if (record.email) {
      const email = record.email.toLowerCase();
      const existing = emailMap.get(email) || [];
      existing.push(record);
      emailMap.set(email, existing);
    }
    
    if (record.mobile_without_country_code) {
      const phone = record.mobile_without_country_code;
      const existing = phoneMap.get(phone) || [];
      existing.push(record);
      phoneMap.set(phone, existing);
    }
  });

  const duplicateGroups: { emails?: string[], phones?: string[], records: CrmRecord[] }[] = [];
  const processedRecords = new Set<CrmRecord>();

  // Extract email duplicates
  emailMap.forEach((groupRecords, email) => {
    if (groupRecords.length > 1) {
      // Find new records we haven't processed as duplicates yet
      const newDuplicates = groupRecords.filter(r => !processedRecords.has(r));
      if (newDuplicates.length > 1) {
        duplicateGroups.push({
          emails: [email],
          records: newDuplicates
        });
        newDuplicates.forEach(r => processedRecords.add(r));
      }
    }
  });

  // Extract phone duplicates (ignoring records already caught by email)
  phoneMap.forEach((groupRecords, phone) => {
    if (groupRecords.length > 1) {
      const newDuplicates = groupRecords.filter(r => !processedRecords.has(r));
      if (newDuplicates.length > 1) {
        duplicateGroups.push({
          phones: [phone],
          records: newDuplicates
        });
        newDuplicates.forEach(r => processedRecords.add(r));
      }
    }
  });

  let totalDuplicates = 0;
  duplicateGroups.forEach(group => {
    totalDuplicates += group.records.length;
  });

  return {
    possibleDuplicateCount: totalDuplicates,
    groups: duplicateGroups
  };
};
