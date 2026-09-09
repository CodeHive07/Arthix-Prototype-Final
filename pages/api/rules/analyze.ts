import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeWithRulesEngine } from '../../../lib/rules-engine';
import type { ProjectData } from '../../../lib/arthix-rules';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' });
  const project = request.body as Partial<ProjectData>;
  if (!project || typeof project.name !== 'string' || typeof project.sector !== 'string' || typeof project.district !== 'string' || typeof project.stage !== 'string') return response.status(400).json({ error: 'A complete project profile is required.' });
  return response.status(200).json(analyzeWithRulesEngine(project as ProjectData));
}
