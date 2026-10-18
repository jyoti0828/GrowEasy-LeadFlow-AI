import { GoogleGenAI, Type } from '@google/genai';
import { getEnv } from '../schemas/environment.schema';
import { getSystemPrompt } from '../prompts/crm-extraction.prompt';
import { AiOutput } from '../schemas/ai-output.schema';
import { logger } from '../utils/logger';

export const processAiBatch = async (batch: any[], mappingHints: any): Promise<AiOutput> => {
  const env = getEnv();
  
  if (env.AI_PROVIDER !== 'gemini') {
    throw new Error('Unsupported AI provider');
  }

  // MOCK AI for E2E Tests
  if (process.env.MOCK_AI === 'true') {
    if (env.NODE_ENV !== 'test') {
      throw new Error('Configuration error: Mock AI provider is restricted to test environment only.');
    }
    return {
      records: batch.map(b => ({
        source_row_index: b.source_row_index,
        name: b.full_name || b['First Name'] || b.Name || b.Contact || b['The Person Who Reached Out'] || 'Test Name',
        email: b.email || b['User Email'] || b['Email Address'] || b['email addr'] || b.Emails || b['Their Electronic Mail'] || 'test@test.com',
        mobile_without_country_code: b.phone_number || b['User Phone'] || b['Client Phone'] || b['Mobile Phone'] || b.phne || b.Phone || b.Phones || b['Their Digits'] || '5551234',
        created_at: b.created_time || b['Inquiry Date'] || b['Date Added'] || b['When Did They Ping Us'] || b.Date || new Date().toISOString(),
        data_source: b.campaign_id || b.Campaign || b['Lead Source'] || 'Unknown'
      }))
    } as unknown as AiOutput;
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = env.AI_MODEL;
  
  const systemPrompt = getSystemPrompt(mappingHints);
  const prompt = `Process the following records:\n${JSON.stringify(batch, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            records: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source_row_index: { type: Type.INTEGER },
                  created_at: { type: Type.STRING },
                  name: { type: Type.STRING },
                  email: { type: Type.STRING },
                  country_code: { type: Type.STRING },
                  mobile_without_country_code: { type: Type.STRING },
                  company: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  country: { type: Type.STRING },
                  lead_owner: { type: Type.STRING },
                  crm_status: { type: Type.STRING },
                  crm_note: { type: Type.STRING },
                  data_source: { type: Type.STRING },
                  possession_time: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: [
                  "source_row_index", "created_at", "name", "email", "country_code",
                  "mobile_without_country_code", "company", "city", "state", "country",
                  "lead_owner", "crm_status", "crm_note", "data_source", "possession_time", "description"
                ]
              }
            }
          }
        },
      }
    });

    const jsonText = response.text || '';
    if (!jsonText) {
      throw new Error('AI returned empty response');
    }
    
    return JSON.parse(jsonText) as AiOutput;
  } catch (error: any) {
    // Log safe technical metadata only (no keys, no full records, no prompts)
    const status = error?.status || error?.response?.status;
    const msg = error?.message || '';
    logger.error({ status, msg }, 'AI provider failed');

    // AiError carries the original HTTP status so withRetry can classify
    // 429/5xx as transient and still retry them.
    class AiError extends Error {
      status?: number;
      constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'AiError';
        this.status = statusCode;
      }
    }

    if (status === 429) {
      throw new AiError(
        'The AI service usage limit has been reached. Please try again later or configure an API project with available quota.',
        429
      );
    }

    if (status === 404 || msg.toLowerCase().includes('model')) {
      // 404 = model not found — non-transient, do not retry
      throw new AiError(
        'The configured AI model is unavailable for this API project. Please select an available Gemini model.',
        404
      );
    }

    if (status === 401 || status === 403) {
      // Auth errors — non-transient, do not retry
      throw new AiError(
        'The AI service is not configured correctly. Please contact the administrator.',
        status
      );
    }

    if (status === 400) {
      // Bad request — non-transient
      throw new AiError(
        'The AI service rejected the request. Please check the input data format.',
        400
      );
    }

    // 500, 502, 503, 504, network failures, timeouts → transient, should retry
    throw new AiError(
      'The AI service is temporarily unavailable. Please try again shortly.',
      status || 503
    );
  }
};
