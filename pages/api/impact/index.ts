import type { NextApiRequest, NextApiResponse } from 'next';
import { calculateChangeImpact, defaultAmendments, type AmendmentEvent } from '../../../lib/change-impact';
import type { ProjectData } from '../../../lib/arthix-rules';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' });
  const project = request.body?.project as ProjectData | undefined;
  const amendment = (request.body?.amendment || defaultAmendments[0]) as AmendmentEvent;
  if (!project?.name || !project.sector || !project.district || !project.stage) return response.status(400).json({ error: 'A complete project profile is required.' });
  return response.status(200).json(calculateChangeImpact(project, { statuses: request.body?.statuses, prevalidation: request.body?.prevalidation, slaStartedAt: request.body?.slaStartedAt }, amendment));
}
