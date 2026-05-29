import Joi from 'joi';
import logger from './logger.js';

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .default(3001)
    .min(1000)
    .max(65535),
  
  HOST: Joi.string()
    .default('localhost'),
  
  ANTHROPIC_API_KEY: Joi.string()
    .required()
    .min(1)
    .description('Anthropic API key is required'),
  
  REDIS_URL: Joi.string()
    .required()
    .pattern(/^redis:\/\//)
    .description('Redis connection URL is required'),
  
  REDIS_PASSWORD: Joi.string()
    .allow('')
    .optional(),
  
  SESSION_SECRET: Joi.string()
    .required()
    .min(32)
    .description('Session secret must be at least 32 characters'),
  
  JWT_SECRET: Joi.string()
    .required()
    .min(32)
    .description('JWT secret must be at least 32 characters'),
  
  MAX_FILE_SIZE_MB: Joi.number()
    .default(10)
    .min(1)
    .max(50),
  
  ALLOWED_FILE_TYPES: Joi.string()
    .default('pdf')
    .pattern(/^[a-z,]+$/),
  
  SESSION_TIMEOUT_MINUTES: Joi.number()
    .default(30)
    .min(5)
    .max(120),
  
  COST_PER_INPUT_TOKEN: Joi.number()
    .default(0.000003)
    .min(0),
  
  COST_PER_OUTPUT_TOKEN: Joi.number()
    .default(0.000015)
    .min(0),
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
}).unknown(true);

const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env);
  
  if (error) {
    logger.error('Environment validation failed:', error.details);
    throw new Error(`Environment validation failed: ${error.details[0].message}`);
  }
  
  logger.info('Environment validation successful');
  return value;
};

export default validateEnv;
