import type { State } from './udyog';

export const STORAGE_KEY = 'arthix:workspace.v2';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export function loadProjectState<T extends State = State>(validate: (value: unknown) => value is T): T | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveProjectState(state: State): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function clearProjectState(): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
}

export const getStoredState = loadProjectState;
export const setStoredState = saveProjectState;
export const removeStoredState = clearProjectState;
