import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerConfig } from '../../lib/server-config';
import { setSecurityHeaders } from '../../lib/api-security';

export default function handler(_request: NextApiRequest, response: NextApiResponse) {
  setSecurityHeaders(response);
  const config = getServerConfig();
  response.status(200).json({
    status: 'ok',
    service: 'arthix',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    capabilities: { rules: true, ogd: config.ogdConfigured, llm: config.llmConfigured, database: config.databaseConfigured, objectStorage: config.storageConfigured, authentication: config.authConfigured },
    deployment: config.databaseConfigured && config.storageConfigured ? 'persistent-ready' : 'browser-or-memory-storage',
  });
}
