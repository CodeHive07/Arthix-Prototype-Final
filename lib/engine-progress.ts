import type { State } from './udyog';

export type EngineName = 'Rules Engine' | 'Pre-Validation' | 'Dynamic DAG' | 'Compliance Assistant';
export type EngineProgress = { rulesAcknowledged: boolean; prevalidationCompleted: boolean; dagCompleted: boolean };
export const progressFor = (state: State): EngineProgress => state.engineProgress || { rulesAcknowledged: false, prevalidationCompleted: state.prevalidation?.dossierStatus === 'ready', dagCompleted: false };
export function isEngineUnlocked(state: State, engine: EngineName): boolean { const progress = progressFor(state); if (engine === 'Rules Engine') return true; if (engine === 'Dynamic DAG') return progress.rulesAcknowledged; if (engine === 'Pre-Validation') return progress.rulesAcknowledged && progress.dagCompleted; return progress.rulesAcknowledged && progress.dagCompleted && progress.prevalidationCompleted; }
export function engineLockReason(state: State, engine: EngineName): string { if (engine === 'Dynamic DAG' && !progressFor(state).rulesAcknowledged) return 'Acknowledge the Rules Engine first.'; if (engine === 'Pre-Validation' && !progressFor(state).dagCompleted) return 'Start an orchestration route in Dynamic DAG first.'; if (engine === 'Compliance Assistant' && !progressFor(state).prevalidationCompleted) return 'Complete the zero-defect Pre-Validation dossier first.'; return ''; }
