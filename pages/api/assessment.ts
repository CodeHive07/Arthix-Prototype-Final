import type { NextApiRequest, NextApiResponse } from 'next';
import { createAssessmentSnapshot } from '../../lib/assessment';
import type { ProjectData } from '../../lib/arthix-rules';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' });
  const project = request.body?.project as ProjectData | undefined;
  if (!project?.name || !project.sector || !project.district || !project.stage) return response.status(400).json({ error: 'A complete project profile is required.' });
  return response.status(200).json(createAssessmentSnapshot(project, request.body?.prevalidation));
}
