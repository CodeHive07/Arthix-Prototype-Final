import { Bell, ChevronDown, Command, HelpCircle, Search, Settings2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="noise min-h-screen bg-black text-arthix-ink">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-[1600px] items-center gap-5 px-5 lg:px-8"><Link href="/" className="flex items-center gap-3"><span className="flex h-8 w-6 items-center justify-center"><svg viewBox="0 0 31.5 48.5" className="h-full"><path d="M21.5 0v19.5h10v9.5L10 48.5v-20H.5v-10L21.5 0Z" fill="#a7a6a6"/><path d="M.5 18.5h9v10H.5zM22 19.5h9.5V29H22z" fill="#fff"/></svg></span><span className="text-sm font-bold tracking-[.22em]">ARTHIX</span></Link><div className="hidden h-6 w-px bg-white/10 sm:block"/><div className="hidden items-center gap-2 text-xs text-white/45 sm:flex"><span>Applicant workspace</span><ChevronDown size={14}/></div><div className="ml-auto flex items-center gap-2"><button className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs text-white/45 md:flex"><Search size={14}/> Search <span className="ml-4 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px]">⌘ K</span></button><button className="rounded-md p-2 text-white/55 hover:bg-white/5"><HelpCircle size={17}/></button><button className="rounded-md p-2 text-white/55 hover:bg-white/5"><Bell size={17}/><span className="absolute ml-[-5px] mt-[-2px] h-1.5 w-1.5 rounded-full bg-arthix-cyan"/></button><button className="flex items-center gap-2 border-l border-white/10 pl-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-sky-700 text-xs font-bold text-black">AK</span><span className="hidden text-left md:block"><b className="block text-xs font-medium">Arjun Kapoor</b><small className="block text-[10px] text-white/40">Founder · Solvex</small></span></button></div></div></header>
    <div className="mx-auto max-w-[1600px] px-5 py-5 lg:px-8">{children}</div>
  </div>;
}

export function SectionLabel({ children }: { children: ReactNode }) { return <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-arthix-cyan"/>{children}</p>; }
export function IconButton({ children }: { children: ReactNode }) { return <button className="rounded-md border border-white/10 bg-white/[.02] p-2 text-white/50 transition hover:border-white/20 hover:bg-white/5">{children}</button>; }

