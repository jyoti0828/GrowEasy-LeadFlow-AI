import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { handleImport } from '../controllers/import.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// Limit import endpoint: 20 requests per 15 minutes per IP
// This prevents abuse of the Gemini API key and upload endpoint
const importRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many import requests. Please wait a few minutes before trying again.'
  }
});

router.post('/', importRateLimit, uploadMiddleware.single('file'), handleImport);

export default router;
