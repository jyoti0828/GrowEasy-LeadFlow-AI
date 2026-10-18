import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getEnv, validateEnv } from './schemas/environment.schema';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './routes/health.routes';
import importRoutes from './routes/import.routes';
import { logger } from './utils/logger';

// Load and validate env
dotenv.config();
validateEnv();

const app = express();
const env = getEnv();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/import', importRoutes);

// Error handling
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
