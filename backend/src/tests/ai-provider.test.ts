import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAiBatch } from '../services/ai-provider.service';
import { getEnv } from '../schemas/environment.schema';
import { GoogleGenAI } from '@google/genai';

// Mock dependencies
vi.mock('../schemas/environment.schema', () => ({
  getEnv: vi.fn()
}));

vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      };
    },
    Type: { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING', INTEGER: 'INTEGER' }
  };
});

describe('AI Provider Service', () => {
  const mockBatch = [{ source_row_index: 1, full_name: 'John', email: 'john@test.com' }];
  const mockHints: any[] = [];
  const envMock = {
    NODE_ENV: 'test',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key',
    AI_MODEL: 'gemini-1.5-flash'
  };

  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (getEnv as any).mockReturnValue(envMock);
    
    // Setup generateContent mock
    const aiInstance = new GoogleGenAI({ apiKey: 'test' });
    mockGenerateContent = aiInstance.models.generateContent as any;
    
    // Reset process.env.MOCK_AI before each test
    delete process.env.MOCK_AI;
  });

  describe('Mock Protection', () => {
    it('throws if MOCK_AI=true is used in development', async () => {
      process.env.MOCK_AI = 'true';
      (getEnv as any).mockReturnValue({ ...envMock, NODE_ENV: 'development' });
      
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'Configuration error: Mock AI provider is restricted to test environment only.'
      );
    });

    it('throws if MOCK_AI=true is used in production', async () => {
      process.env.MOCK_AI = 'true';
      (getEnv as any).mockReturnValue({ ...envMock, NODE_ENV: 'production' });
      
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'Configuration error: Mock AI provider is restricted to test environment only.'
      );
    });

    it('allows MOCK_AI=true only in test environment', async () => {
      process.env.MOCK_AI = 'true';
      (getEnv as any).mockReturnValue({ ...envMock, NODE_ENV: 'test' });
      
      const result = await processAiBatch(mockBatch, mockHints);
      expect(result.records).toBeDefined();
      expect(result.records[0].name).toBe('John'); // Picks up from batch input
    });
  });

  describe('Gemini Error Mapping', () => {
    it('maps 429 to quota error', async () => {
      mockGenerateContent.mockRejectedValue({ status: 429 });
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The AI service usage limit has been reached. Please try again later or configure an API project with available quota.'
      );
    });

    it('maps 404 to model unavailable error', async () => {
      mockGenerateContent.mockRejectedValue({ status: 404 });
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The configured AI model is unavailable for this API project. Please select an available Gemini model.'
      );
    });

    it('maps message containing "model" to model unavailable error', async () => {
      mockGenerateContent.mockRejectedValue({ message: 'Model gemini-1.5 is not found' });
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The configured AI model is unavailable for this API project. Please select an available Gemini model.'
      );
    });

    it('maps 401 and 403 to configuration error', async () => {
      mockGenerateContent.mockRejectedValue({ status: 401 });
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The AI service is not configured correctly. Please contact the administrator.'
      );

      mockGenerateContent.mockRejectedValue({ status: 403 });
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The AI service is not configured correctly. Please contact the administrator.'
      );
    });

    it('maps 500, 503, and network errors to temporary unavailable', async () => {
      mockGenerateContent.mockRejectedValue({ status: 503 });
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The AI service is temporarily unavailable. Please try again shortly.'
      );

      mockGenerateContent.mockRejectedValue(new Error('fetch failed'));
      await expect(processAiBatch(mockBatch, mockHints)).rejects.toThrow(
        'The AI service is temporarily unavailable. Please try again shortly.'
      );
    });

    it('never fabricates records on failure', async () => {
      mockGenerateContent.mockRejectedValue({ status: 429 });
      
      try {
        await processAiBatch(mockBatch, mockHints);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.records).toBeUndefined(); // Returns no records
      }
    });
  });
});
