import { Request, Response, NextFunction } from 'express';
import { parseCsv } from '../services/csv-parser.service';
import { normalizeHeaders } from '../services/header-normalizer.service';
import { detectAliases } from '../services/alias-detector.service';
import { processInBatches } from '../services/batch-processing.service';
import { normalizeAndValidateRecord, hasValidContact } from '../services/crm-normalizer.service';
import { calculateDataQuality } from '../services/data-quality.service';
import { detectDuplicates } from '../services/duplicate-detection.service';
import { AppError } from '../middleware/error.middleware';
import { CrmRecord } from '../schemas/crm.schema';

export const handleImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No CSV file uploaded');
    }

    // 1. Parse CSV
    const { headers: originalHeaders, records: parsedRecords } = await parseCsv(req.file.buffer);
    const totalRows = parsedRecords.length;

    // Remove completely empty rows
    const nonEmptyRecords = parsedRecords.filter(r => Object.values(r).some(v => v !== '' && v !== null && v !== undefined));

    // Map source row indexes (1-based to account for header, or 0-based for internal. Let's use 2-based for actual excel row numbers if we assume 1 header)
    const recordsWithIndexes = nonEmptyRecords.map((r, i) => ({
      ...r,
      __internal_row_index: i + 2
    }));

    // 2. Normalization & Hints
    const mappingHints = detectAliases(originalHeaders, parsedRecords.slice(0, 5));
    
    // Convert source rows for AI
    const aiInput = recordsWithIndexes.map(r => {
      const idx = r.__internal_row_index;
      delete r.__internal_row_index;
      return {
        source_row_index: idx,
        ...r
      };
    });

    // 3. AI Semantic Mapping in Batches
    const { records: aiExtractedRecords, successfulBatches, failedBatches } = await processInBatches(aiInput, mappingHints);

    // 4. CRM Normalization and Validation
    const finalRecords: CrmRecord[] = [];
    const skippedRecords: any[] = [];
    let mappedFields = new Set<string>();

    // Map to quickly find original row
    const originalRecordMap = new Map(aiInput.map(r => [r.source_row_index, r]));

    aiExtractedRecords.forEach(aiRecord => {
      const normalized = normalizeAndValidateRecord(aiRecord);
      const original = originalRecordMap.get(aiRecord.source_row_index) || {};
      
      if (!normalized) {
        skippedRecords.push({
          rowNumber: aiRecord.source_row_index,
          reason: 'Failed final strict CRM validation after AI extraction.',
          originalRecord: original
        });
        return;
      }

      if (!hasValidContact(normalized)) {
        skippedRecords.push({
          rowNumber: aiRecord.source_row_index,
          reason: 'No valid email address or mobile number was detected.',
          originalRecord: original
        });
        return;
      }

      // Track mapped fields
      Object.entries(normalized).forEach(([k, v]) => {
        if (v && v !== '') {
          mappedFields.add(k);
        }
      });

      finalRecords.push(normalized);
    });

    // Find any rows that AI completely dropped (e.g. timeout on a batch)
    const processedIndexes = new Set(aiExtractedRecords.map(r => r.source_row_index));
    
    // Find the mapped column names for email and mobile
    const emailHeader = mappingHints.find(h => h.suggestedTarget === 'email')?.sourceHeader;
    const phoneHeader = mappingHints.find(h => h.suggestedTarget === 'mobile_without_country_code')?.sourceHeader;

    aiInput.forEach(r => {
      if (!processedIndexes.has(r.source_row_index)) {
        
        let emailVal = emailHeader ? String(r[emailHeader] || '').trim() : '';
        let phoneVal = phoneHeader ? String(r[phoneHeader] || '').trim() : '';
        
        const hasAnyContactData = emailVal !== '' || phoneVal !== '';
        const isValidE = emailVal !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
        const isValidP = phoneVal !== '' && /^\+?[\d\s\-\(\)]{7,20}$/.test(phoneVal) && phoneVal.replace(/\D/g, '').length >= 7;

        if (isValidE || isValidP) {
          skippedRecords.push({
            rowNumber: r.source_row_index,
            reason: 'AI extraction failed after retry.',
            originalRecord: r
          });
        } else if (hasAnyContactData) {
          skippedRecords.push({
            rowNumber: r.source_row_index,
            reason: 'Email and mobile values were invalid.',
            originalRecord: r
          });
        } else {
          skippedRecords.push({
            rowNumber: r.source_row_index,
            reason: 'No valid email address or mobile number was detected.',
            originalRecord: r
          });
        }
      }
    });

    // 5. Compute Insights
    const dataQuality = calculateDataQuality(finalRecords, totalRows);
    const duplicateInsights = detectDuplicates(finalRecords);

    // Format mapping insights
    const mappingInsights = mappingHints.filter(h => h.suggestedTarget).map(h => ({
      sourceColumn: h.sourceHeader,
      targetField: h.suggestedTarget,
      confidence: h.confidence,
      mappingMethod: h.confidence === 'high' ? 'deterministic' : 'hybrid',
      explanation: h.confidence === 'high' ? 'Matched exactly to CRM field.' : 'Matched using header meaning and values.'
    }));

    // Construct final response
    res.json({
      success: true,
      summary: {
        totalRows,
        totalImported: finalRecords.length,
        totalSkipped: skippedRecords.length,
        successRate: totalRows > 0 ? Math.round((finalRecords.length / totalRows) * 100) : 0,
        sourceColumnsDetected: originalHeaders.length,
        crmFieldsMapped: mappedFields.size
      },
      dataQuality,
      records: finalRecords,
      skippedRecords,
      mappingInsights,
      duplicateInsights,
      processing: {
        totalBatches: successfulBatches + failedBatches,
        successfulBatches,
        failedBatches
      }
    });

  } catch (error) {
    next(error);
  }
};
