import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues }, 'Validation error');
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.issues
    });
  }

  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Handle Multer errors (e.g. file too large)
  if (err.name === 'MulterError') {
    logger.warn(`MulterError: ${err.message}`);
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }

  // Unhandled errors
  logger.error({ err }, 'Unhandled error');
  
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message
  });
};
