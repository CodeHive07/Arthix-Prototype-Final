import type { NextApiRequest, NextApiResponse } from 'next';
import { createAssessmentSnapshot } from '../../lib/assessment';
import { projectToProjectData, type ProjectData } from '../../lib/arthix-rules';
import { calculateOrchestration } from '../../lib/dag-engine';
import { issues, type Doc } from '../../lib/udyog';

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'POST required.' });
  const project = request.body?.project as ProjectData | undefined;
  if (!project?.name || !project.sector || !project.district || !project.stage || !project.caseId) return response.status(400).json({ error: 'A complete project profile is required.' });
  const documents = Array.isArray(request.body?.documents) ? request.body.documents as Doc[] : [];
  const prevalidation = request.body?.prevalidation;
  const assessment = createAssessmentSnapshot(project, prevalidation);
  const documentStatus = assessment.requiredDocuments.map(id => { const document = documents.find(item => item.id === id); return { id, name: document?.name || id, present: Boolean(document?.file), valid: Boolean(document?.file && !issues(document, project as never).length), blockers: document ? issues(document, project as never) : ['Document is missing.'] }; });
  const dag = calculateOrchestration({ project, approvalOverride: assessment.approvals, prevalidation, statuses: request.body?.statuses, slaStartedAt: request.body?.slaStartedAt });
  return response.status(200).json({ assessment, documentStatus, dossierReady: documentStatus.every(item => item.valid), dag, timeSaved: { sequentialDays: dag.sequentialDays, criticalPathDays: dag.criticalPathDays, daysSaved: dag.savingsDays, parallelismPercent: dag.parallelismPercent, explanation: `Arthix compares the sum of all approval estimates (${dag.sequentialDays} days) with the dependency-aware critical path (${dag.criticalPathDays} days).` } });
}
