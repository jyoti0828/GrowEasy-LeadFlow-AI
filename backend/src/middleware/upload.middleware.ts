import multer from 'multer';
import { AppError } from './error.middleware';

// We use memory storage since we process the file immediately
// and don't need to persist it.
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.mimetype === 'application/vnd.ms-excel') {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Only CSV files are allowed'));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Will be overridden dynamically per request if needed, but 10MB default
  },
  fileFilter
});
