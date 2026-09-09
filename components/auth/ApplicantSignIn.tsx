import { LogIn, ShieldCheck } from 'lucide-react';

export default function ApplicantSignIn() {
  return <main className="uw-root uw-loading"><div className="uw-panel uw-auth-panel"><span className="uw-brand-mark"><LogIn size={24} /></span><span className="uw-eyebrow">APPLICANT WORKSPACE</span><h1>Sign in to continue.</h1><p>Use your approved identity provider to access your applicant case and project dossier.</p><button className="uw-button uw-primary" onClick={() => { /* Full-page navigation is intentional: this API route redirects to the identity provider, which router.push cannot do. */ // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/auth/login'; }}>Continue with secure sign-in <LogIn size={16} /></button><small><ShieldCheck size={13} /> Arthix does not store your password.</small></div></main>;
}
