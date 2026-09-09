export type ServerConfig = {
  nodeEnv: string;
  appUrl: string;
  ogdConfigured: boolean;
  llmConfigured: boolean;
  databaseConfigured: boolean;
  storageConfigured: boolean;
  authConfigured: boolean;
  oidcConfigured: boolean;
};

export function getServerConfig(): ServerConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    ogdConfigured: Boolean(process.env.DATA_GOV_IN_API_KEY && process.env.DATA_GOV_IN_RESOURCE_ID),
    llmConfigured: Boolean(process.env.OPENAI_API_KEY),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    storageConfigured: Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_REGION),
    authConfigured: Boolean(process.env.AUTH_SECRET && process.env.OIDC_DISCOVERY_URL && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET),
    oidcConfigured: Boolean((process.env.KEYCLOAK_ISSUER || process.env.OIDC_DISCOVERY_URL) && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET),
  };
}

export function requireMethod(request: { method?: string }, allowed: string[]) { return Boolean(request.method && allowed.includes(request.method)); }

export function getConfigurationIssues(config = getServerConfig()): string[] {
  const issues: string[] = [];
  if (config.nodeEnv === 'production' && config.appUrl.startsWith('http://')) issues.push('APP_URL must use HTTPS in production.');
  if (config.nodeEnv === 'production' && !config.databaseConfigured) issues.push('DATABASE_URL is required for production persistence.');
  if (config.nodeEnv === 'production' && !config.storageConfigured) issues.push('S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for document storage.');
  if (config.nodeEnv === 'production' && !config.authConfigured) issues.push('AUTH_SECRET is required until an approved identity provider is configured.');
  if (config.nodeEnv === 'production' && !config.oidcConfigured) issues.push('KEYCLOAK_ISSUER (or OIDC_DISCOVERY_URL), OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required for applicant sign-in.');
  if (process.env.DATA_GOV_IN_API_KEY && !process.env.DATA_GOV_IN_RESOURCE_ID) issues.push('DATA_GOV_IN_RESOURCE_ID is required when DATA_GOV_IN_API_KEY is set.');
  if (process.env.DATA_GOV_IN_RESOURCE_ID && !process.env.DATA_GOV_IN_API_KEY) issues.push('DATA_GOV_IN_API_KEY is required when DATA_GOV_IN_RESOURCE_ID is set.');
  return issues;
}
