import { useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react';
import type { ApplicantProfile } from '../../lib/udyog';

export default function ApplicantOnboarding({ onComplete }: { onComplete: (profile: ApplicantProfile) => void }) {
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fullName = String(data.get('fullName') || '').trim();
    const email = String(data.get('email') || '').trim().toLowerCase();
    const phone = String(data.get('phone') || '').trim();
    if (fullName.length < 2) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return setError('Enter a valid phone number.');
    onComplete({ fullName, email, phone, completedAt: new Date().toISOString() });
  }
  return <section className="uw-panel uw-onboarding" aria-labelledby="applicant-onboarding-title"><div className="uw-section-heading"><div><span className="uw-eyebrow">APPLICANT ONBOARDING</span><h2 id="applicant-onboarding-title">Set up your applicant profile.</h2><p>These details identify your workspace record. Arthix does not submit applications or make statutory decisions.</p></div><UserRound size={24} /></div><form onSubmit={submit}><div className="uw-form-grid"><label className="uw-field">Full name<input name="fullName" required maxLength={100} autoFocus placeholder="Your full name" /></label><label className="uw-field">Email address<input name="email" required type="email" maxLength={160} placeholder="you@example.com" /></label><label className="uw-field">Phone number<input name="phone" required inputMode="tel" maxLength={20} placeholder="+91 98765 43210" /></label></div>{error && <p className="uw-form-error" role="alert">{error}</p>}<div className="uw-action-bar"><span className="uw-next-footnote"><ShieldCheck size={13} />Stored with this applicant case only.</span><button className="uw-button uw-primary">Continue to workspace <ArrowRight size={15} /></button></div></form></section>;
}
