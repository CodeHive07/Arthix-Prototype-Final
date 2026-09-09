import type { NextApiRequest, NextApiResponse } from 'next';
import { setSecurityHeaders } from '../../lib/api-security';
import { getConfigurationIssues, getServerConfig } from '../../lib/server-config';
import { checkDatabase } from '../../lib/database';

export default async function handler(_request: NextApiRequest, response: NextApiResponse) {
  setSecurityHeaders(response);
  const config = getServerConfig();
  const issues = getConfigurationIssues(config);
  const database = await checkDatabase().catch(() => ({ configured: true, reachable: false }));
  if (config.nodeEnv === 'production' && !database.reachable) issues.push('Database is not reachable.');
  response.status(issues.length ? 503 : 200).json({
    status: issues.length ? 'not_ready' : 'ready',
    service: 'arthix',
    timestamp: new Date().toISOString(),
    checks: { configuration: issues.length ? 'failed' : 'passed', database: database.reachable ? 'reachable' : config.databaseConfigured ? 'unreachable' : 'missing', objectStorage: config.storageConfigured ? 'configured' : 'missing', authentication: config.authConfigured ? 'configured' : 'missing' },
    issues,
  });
}
