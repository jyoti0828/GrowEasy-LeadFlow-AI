import { getEnv } from '../schemas/environment.schema';
import { processAiBatch } from './ai-provider.service';
import { withRetry } from '../utils/retry';
import { AiOutputRecord } from '../schemas/ai-output.schema';
import { logger } from '../utils/logger';

export interface BatchProcessingResult {
  records: AiOutputRecord[];
  failedBatches: number;
  successfulBatches: number;
}

export const processInBatches = async (
  records: any[],
  mappingHints: any
): Promise<BatchProcessingResult> => {
  const env = getEnv();
  const batchSize = env.AI_BATCH_SIZE;
  const concurrency = env.AI_BATCH_CONCURRENCY;
  const maxRetries = env.AI_MAX_RETRIES;
  
  const batches: any[][] = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }

  let successfulBatches = 0;
  let failedBatches = 0;
  const allExtractedRecords: AiOutputRecord[] = [];

  // Helper to process a single batch with retry
  const runBatch = async (batch: any[], batchIndex: number) => {
    try {
      const result = await withRetry(
        () => processAiBatch(batch, mappingHints),
        maxRetries
      );
      if (result && result.records) {
        allExtractedRecords.push(...result.records);
        successfulBatches++;
      } else {
        throw new Error('Invalid AI output structure');
      }
    } catch (error) {
      logger.error({ err: error }, `Batch ${batchIndex} failed completely after retries`);
      failedBatches++;
    }
  };

  // Process with concurrency limit
  let currentIndex = 0;
  const workers = Array(concurrency).fill(null).map(async () => {
    while (currentIndex < batches.length) {
      const batchIndex = currentIndex++;
      const batch = batches[batchIndex];
      await runBatch(batch, batchIndex);
    }
  });

  await Promise.all(workers);

  // Re-sort the records based on source_row_index to maintain order
  allExtractedRecords.sort((a, b) => a.source_row_index - b.source_row_index);

  return {
    records: allExtractedRecords,
    failedBatches,
    successfulBatches
  };
};
