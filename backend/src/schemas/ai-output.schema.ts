import { z } from 'zod';
import { crmRecordSchema } from './crm.schema';

export const aiOutputRecordSchema = crmRecordSchema.extend({
  source_row_index: z.number().catch(-1),
}).strip();

export const aiOutputSchema = z.object({
  records: z.array(aiOutputRecordSchema).catch([]),
});

export type AiOutputRecord = z.infer<typeof aiOutputRecordSchema>;
export type AiOutput = z.infer<typeof aiOutputSchema>;
