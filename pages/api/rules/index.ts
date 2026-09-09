import type { NextApiRequest, NextApiResponse } from 'next';
import { getRulesSnapshot } from '../../../lib/rules-engine';

export default function handler(_request: NextApiRequest, response: NextApiResponse) {
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  response.status(200).json(getRulesSnapshot());
}
