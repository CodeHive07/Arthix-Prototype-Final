import type { NextApiRequest, NextApiResponse } from 'next';
import { answerComplianceQuery, ragHealth } from '../../../lib/rag-engine';
import type { ProjectData } from '../../../lib/arthix-rules';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method === 'GET') return response.status(200).json(ragHealth());
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST or GET required' });
  const query = typeof request.body?.query === 'string' ? request.body.query.trim() : '';
  const project = request.body?.project as ProjectData | undefined;
  if (!query || !project?.name || !project?.sector || !project?.district || !project?.stage) return response.status(400).json({ error: 'query and complete project profile are required' });
  return answerComplianceQuery(query, project).then(result => response.status(200).json(result)).catch(() => response.status(200).json({ error: 'Grounded retrieval failed.' }));
}
