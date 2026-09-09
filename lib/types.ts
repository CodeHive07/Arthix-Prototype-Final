export type Status = 'ready' | 'attention' | 'processing' | 'blocked' | 'approved';

export type Department = { name: string; short: string; status: Status; eta: string; detail: string };
