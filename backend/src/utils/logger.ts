import pino from 'pino';
import { getEnv } from '../schemas/environment.schema';

const env = process.env.NODE_ENV || 'development';

export const logger = pino({
  level: env === 'development' ? 'debug' : 'info',
  ...(env === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  } : {})
});
