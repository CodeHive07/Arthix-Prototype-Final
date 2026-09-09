import type { NextApiRequest, NextApiResponse } from 'next';
import { calculateOrchestration, type OrchestrationInput } from '../../../lib/dag-engine';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' });
  const input = request.body as OrchestrationInput;
  if (!input?.project?.name || !input.project.sector || !input.project.district || !input.project.stage) return response.status(400).json({ error: 'A complete project profile is required.' });
  return response.status(200).json(calculateOrchestration(input));
}
