import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  redact: {
    // NEVER log these fields — GDPR / security
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.email',
      'req.body.lat',
      'req.body.lng',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'nearme-api', env: env.NODE_ENV },
});
