import Papa from 'papaparse';
import { AppError } from '../middleware/error.middleware';

export interface ParsedCsvData {
  headers: string[];
  records: any[];
}

export const parseCsv = (fileBuffer: Buffer): Promise<ParsedCsvData> => {
  return new Promise((resolve, reject) => {
    const csvString = fileBuffer.toString('utf-8');
    
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (results.errors.length > 0) {
          // Check if it's a fatal error or just some malformed rows
          const hasFatalError = results.errors.some(e => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
          if (hasFatalError) {
            return reject(new AppError(400, 'Invalid CSV format'));
          }
        }
        
        if (!results.meta.fields || results.meta.fields.length === 0) {
          return reject(new AppError(400, 'CSV file has no headers'));
        }
        
        if (results.data.length === 0) {
          return reject(new AppError(400, 'CSV file contains no records'));
        }

        resolve({
          headers: results.meta.fields,
          records: results.data
        });
      },
      error: (error: any) => {
        reject(new AppError(400, `Failed to parse CSV: ${error.message}`));
      }
    });
  });
};
