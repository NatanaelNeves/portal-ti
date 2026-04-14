import dotenv from 'dotenv';

dotenv.config();

const parseBooleanEnv = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

const parseFromAddress = (rawFrom?: string): { fromEmail: string; fromName: string } => {
  const fallback = {
    fromEmail: process.env.EMAIL_FROM || 'noreply@pequenonazareno.org',
    fromName: process.env.EMAIL_FROM_NAME || 'Portal TI - O Pequeno Nazareno',
  };

  if (!rawFrom) return fallback;

  const match = rawFrom.match(/^(.*)<\s*([^>]+)\s*>\s*$/);
  if (!match) {
    return {
      fromEmail: rawFrom.trim(),
      fromName: fallback.fromName,
    };
  }

  return {
    fromName: match[1].trim() || fallback.fromName,
    fromEmail: match[2].trim() || fallback.fromEmail,
  };
};

const smtpFrom = parseFromAddress(process.env.SMTP_FROM);

// Validate critical env vars in production
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
if (isProduction) {
  const requiredVars = ['DB_HOST', 'DB_PASSWORD', 'JWT_SECRET', 'CORS_ORIGIN'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.error('FATAL: JWT_SECRET must be changed from the default value in production');
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'portal_ti',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiration: process.env.JWT_EXPIRATION || '7d',
  },
  cors: {
    // Suporta múltiplas origens separadas por vírgula, ex: "https://app.com,http://localhost:3000"
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
  },
  email: {
    enabled: parseBooleanEnv(process.env.EMAIL_ENABLED) || parseBooleanEnv(process.env.SMTP_ENABLED),
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
    secure: parseBooleanEnv(process.env.EMAIL_SECURE) || parseBooleanEnv(process.env.SMTP_SECURE),
    user: process.env.EMAIL_USER || process.env.SMTP_USER || '',
    password: process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.EMAIL_FROM || smtpFrom.fromEmail,
    fromName: process.env.EMAIL_FROM_NAME || smtpFrom.fromName,
    provider: (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase(),
    graph: {
      tenantId: process.env.AZURE_TENANT_ID || '',
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      senderUser: process.env.EMAIL_FROM || smtpFrom.fromEmail,
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};
