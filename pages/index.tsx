import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, FileCheck2, FileText, Fingerprint, GitBranch, Landmark, Layers3, Menu, MoveUpRight, Play, Plus, ShieldCheck, X } from 'lucide-react';

const VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_112712_da9d53df-6d27-4b12-bdf6-aa9dc2622bdf.mp4';
const chapters = [
  { no: '01', label: 'Discover', title: 'Your ambition.\nYour approval path.', description: 'Not every business needs every approval. Start with your project, and understand what applies, why it matters, and where to begin.', detail: 'A checklist built around your business.' },
  { no: '02', label: 'Prepare', title: 'Get it right.\nBefore you submit.', description: 'Catch missing information and inconsistent documents early. Reuse your business details without starting over at every department.', detail: 'Less repetition. Fewer avoidable queries.' },
  { no: '03', label: 'Move forward', title: 'Every dependency.\nOne clear picture.', description: 'See independent reviews move together, understand what is waiting, and know exactly whose action comes next.', detail: 'Visibility from application to operation.' },
];
const questions = [
  ['How does Arthix support approval work?', 'Arthix brings project information, requirements, documents, department coordination and compliance follow-up into one workspace. Authority-specific requirements and decisions remain governed by the responsible department.'],
  ['Can Arthix issue statutory approvals?', 'Arthix prepares and coordinates approval work. Statutory approvals, inspections and final decisions remain with the responsible government authority.'],
  ['How does the approval guidance work?', 'Arthix uses a rules-first project profile to provide an explainable, step-by-step approval pathway with source references and clear next actions.'],
  ['What happens to my documents and project data?', 'Workspace records are stored locally for this installation. File contents are not sent to government services by Arthix without an authorized integration.'],
];

function Mark() {
  return <svg viewBox="0 0 32 40" fill="none" aria-hidden="true"><path d="M18 0 2 16v12l12-12V4L18 0Z" fill="currentColor"/><path d="M30 12 14 28v12l16-16V12Z" fill="currentColor"/><path d="m2 28 12 12V28L2 16v12Z" fill="currentColor" opacity=".48"/><path d="M18 0 30 12 18 24V12L14 8l4-8Z" fill="currentColor" opacity=".7"/></svg>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const story = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => { if (reduced.matches) { video.current?.pause(); setPaused(true); } };
    applyMotion(); 
    if (reduced.addEventListener) reduced.addEventListener('change', applyMotion);
    else if (reduced.addListener) reduced.addListener(applyMotion);
    let frame = 0;
    const update = () => {
      frame = 0; setScrolled(window.scrollY > 40);
      if (story.current) {
        const rect = story.current.getBoundingClientRect();
        const travel = Math.max(1, rect.height - window.innerHeight);
        const p = Math.max(0, Math.min(1, -rect.top / travel));
        story.current.style.setProperty('--progress', String(p));
        setChapter(Math.min(2, Math.floor(p * 3)));
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule); update();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    page.current?.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); observer.disconnect(); 
      if (reduced.removeEventListener) reduced.removeEventListener('change', applyMotion);
      else if (reduced.removeListener) reduced.removeListener(applyMotion);
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); document.getElementById('landing-menu-toggle')?.focus(); } };
    const resize = () => { if (window.innerWidth > 760) setMenuOpen(false); };
    if (menuOpen) window.addEventListener('keydown', close);
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('resize', resize); };
  }, [menuOpen]);

  const goToChapter = (index: number) => {
    if (!story.current) return;
    const distance = story.current.offsetHeight - window.innerHeight;
    window.scrollTo({ top: story.current.offsetTop + distance * ((index + .12) / 3), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const toggleVideo = () => {
    if (!video.current) return;
    if (video.current.paused) { video.current.play().then(() => setPaused(false)).catch(() => setVideoFailed(true)); }
    else { video.current.pause(); setPaused(true); }
  };

  return <div ref={page} className="landing">
    <Head><title>Arthix | A clearer path to industry</title><meta name="description" content="Explore a local, explainable workspace for preparing industrial approval and compliance work in Maharashtra. Verify requirements with the responsible authority."/><meta name="theme-color" content="#101311"/></Head>
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <Link href="/" className="landing-brand" aria-label="Arthix home"><Mark/><span>arthix<span className="brand-period">.</span></span></Link>
      <nav aria-label="Main navigation" className="landing-links"><a href="#how-it-works">The approach</a><a href="#workspace">The workspace</a><a href="#questions">FAQs <ChevronDown size={12}/></a></nav>
      <div className="landing-nav-right"><span className="prototype-label"><span/> MAHARASHTRA INDUSTRY</span><Link href="/dashboard" className="nav-enter">Enter workspace <ArrowUpRight size={15}/></Link><button id="landing-menu-toggle" className="landing-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-mobile-menu">{menuOpen ? <X/> : <Menu/>}</button></div>
      {menuOpen && <nav className="landing-mobile-menu" id="landing-mobile-menu" aria-label="Mobile navigation"><a onClick={() => setMenuOpen(false)} href="#how-it-works">The approach <ArrowUpRight/></a><a onClick={() => setMenuOpen(false)} href="#workspace">The workspace <ArrowUpRight/></a><a onClick={() => setMenuOpen(false)} href="#questions">FAQs <ArrowUpRight/></a><Link href="/dashboard">Enter workspace <ArrowUpRight/></Link></nav>}
    </header>

    <main id="main-content">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className={`hero-film ${videoFailed ? 'film-fallback' : ''}`} aria-hidden="true"><video ref={video} autoPlay muted loop playsInline preload="auto" onError={() => setVideoFailed(true)}><source src={VIDEO} type="video/mp4" onError={() => setVideoFailed(true)}/></video><div className="hero-film-shade"/></div>
        <div className="hero-fallback-door" aria-hidden="true"/>
        <div className="hero-content">
          <div className="eyebrow hero-eyebrow"><span className="fine-cross">+</span> BUILT FOR AMBITION. DESIGNED FOR MAHARASHTRA.</div>
          <h1 id="hero-title">Less paperwork.<br/>More <span className="serif-word">possibility.</span></h1>
          <p>A clear path through industrial approvals,<br className="desktop-break"/> compliance, and government support.<br className="desktop-break"/> Your ambition shouldn&apos;t have to wait.</p>
          <div className="hero-actions"><Link href="/dashboard?new=1" className="light-button">Start your journey <ArrowUpRight size={18}/></Link><a href="#how-it-works" className="text-button"><span className="play-circle"><Play size={10} fill="currentColor"/></span> See how it works</a></div>
          <div className="hero-note"><span className="small-line"/> One connected journey. From intent to industry.</div>
        </div>
        <div className="hero-coordinate" aria-hidden="true"><span>18.5204° N</span><span>73.8567° E</span><i/><span>MAHARASHTRA, IN</span></div>
        <div className="hero-bottom"><a className="scroll-cue" href="#how-it-works"><span className="scroll-icon"><ArrowDown size={14}/></span><span>SCROLL TO SEE THE WAY FORWARD</span></a><div className="hero-bottom-right"><span>LESS FRICTION. MORE FORWARD.</span><button onClick={toggleVideo} aria-label={paused ? 'Play background video' : 'Pause background video'} disabled={videoFailed}>{paused ? <Play size={12}/> : <span className="pause-symbol"/>}</button></div></div>
      </section>

      <section className="context-strip" aria-label="Project context"><span className="eyebrow">ONE JOURNEY.<br/><strong>EVERY NEXT STEP.</strong></span><span><Fingerprint/> Understand requirements</span><span><FileCheck2/> Prepare with confidence</span><span><GitBranch/> Coordinate approvals</span><span><ShieldCheck/> Stay compliant</span></section>

      <section ref={story} className={`scroll-story chapter-${chapter}`} id="how-it-works" aria-labelledby="story-title">
        <div className="story-sticky">
          <div className="story-topline"><span className="eyebrow"><span className="fine-cross">+</span> COMPLEXITY, MEET CLARITY.</span><span className="eyebrow">THE ARTHIX APPROACH <span className="story-page">0{chapter + 1} / 03</span></span></div>
          <div className="story-layout">
            <div className="story-copy">
              <div className="chapter-tabs" aria-label="Explore the approach">{chapters.map((item, index) => <button key={item.no} onClick={() => goToChapter(index)} aria-pressed={chapter === index} className={chapter === index ? 'active' : ''}><span>{item.no}</span>{item.label}</button>)}</div>
              <div key={chapter} className="chapter-text"><h2 id="story-title">{chapters[chapter].title.split('\n').map(line => <span key={line}>{line}</span>)}</h2><p>{chapters[chapter].description}</p><div className="chapter-detail"><Check size={16}/>{chapters[chapter].detail}</div></div>
              <Link href="/dashboard?demo=1" className="story-link">Start your journey <ArrowUpRight size={16}/></Link>
            </div>
            <div className="journey-visual" aria-label={`Illustrative approval map: ${chapters[chapter].label}`}>
              <div className="map-grid"/>
              <div className="map-corner top-left"/><div className="map-corner bottom-right"/>
              <div className="map-caption"><span className="live-dot"/> ILLUSTRATIVE PROJECT MAP <span>MH / 001</span></div>
              <svg className="map-connections" viewBox="0 0 600 440" fill="none" aria-hidden="true"><path d="M300 95V149M300 149H130V202M300 149H470V202M300 149V202M130 275V324H300M470 275V324H300M300 275V360"/><path className="animated-route" d="M300 95V149H130V240M300 149H470V240M300 149V390"/><circle cx="300" cy="149" r="4"/><circle cx="300" cy="324" r="4"/></svg>
              <div className="map-project"><span className="map-project-icon"><Layers3 size={22}/></span><div><small>YOUR NEXT CHAPTER</small><strong>A new manufacturing unit</strong></div><span className="map-project-badge">MH</span></div>
              <div className="map-service service-one"><span className="service-icon"><Landmark size={20}/></span><small>PRE-ESTABLISHMENT</small><strong>Premises & planning</strong><span className="service-status">{chapter === 0 ? 'Check applicability' : chapter === 1 ? 'Details checked' : 'Review in progress'}<span/></span></div>
              <div className="map-service service-two"><span className="service-icon"><FileCheck2 size={20}/></span><small>ENVIRONMENT</small><strong>Consent to establish</strong><span className="service-status">{chapter === 0 ? 'Check applicability' : chapter === 1 ? 'Documents ready' : 'Next action identified'}<span/></span></div>
              <div className="map-service service-three"><span className="service-icon"><ShieldCheck size={20}/></span><small>WORKPLACE</small><strong>Safety & compliance</strong><span className="service-status">{chapter === 0 ? 'Check applicability' : chapter === 1 ? 'Evidence organised' : 'Review in progress'}<span/></span></div>
              <div className="map-outcome"><span><Check size={14}/></span>{chapter === 0 ? 'Requirements shaped around your project' : chapter === 1 ? 'A clearer, more complete application' : 'A coordinated path to operational readiness'}</div>
              <div className="map-foot"><span>DEPENDENCIES PRESERVED</span><span>HUMAN DECISIONS, ALWAYS <Plus size={11}/></span></div>
            </div>
          </div>
          <div className="story-bottom"><span>Clarity at every stage. Not another maze.</span><div className="story-progress"><span/></div><span className="eyebrow">KEEP SCROLLING <ArrowDown size={13}/></span></div>
        </div>
      </section>

      <section className="workspace-section" id="workspace" aria-labelledby="workspace-title">
         <div className="workspace-intro reveal"><div><div className="eyebrow"><span className="fine-cross">+</span> MEET YOUR WORKSPACE</div><h2 id="workspace-title">The bigger picture.<br/><span className="serif-word">And every little detail.</span></h2></div><div><p>One place to know where you stand.<br/>One clear action to move you forward.</p><Link href="/dashboard?demo=1" className="dark-button">Open workspace <ArrowUpRight size={17}/></Link><small>Local prototype workspace. Verify with official sources.</small></div></div>
        <Link href="/dashboard?demo=1" className="workspace-preview reveal" aria-label="Open the interactive sample workspace">
          <aside className="preview-sidebar"><div className="preview-brand"><Mark/> arthix.</div><small>YOUR WORKSPACE</small><div className="preview-project"><Layers3 size={17}/><span>Sahyadri Precision Works<small>Pune, Maharashtra</small></span></div><small>PROJECT</small><div className="preview-active"><Layers3 size={15}/>Overview<span>01</span></div><div><GitBranch size={15}/>Approval journey</div><div><FileText size={15}/>Documents</div><div><FileCheck2 size={15}/>Applications</div><div><ShieldCheck size={15}/>Compliance</div><span className="preview-sidebar-foot"><span className="avatar-small">AP</span><span>Arjun Patil<small>Entrepreneur</small></span></span></aside>
          <div className="preview-body"><div className="preview-topbar"><span>Workspace <span>/</span> Overview</span><span className="preview-prototype">ENTERPRISE EDITION <span/></span></div><div className="preview-main"><div className="preview-greeting"><div><small>YOUR INDUSTRIAL JOURNEY</small><h3>Ambition, meet a clear path.</h3><p>Sahyadri Precision Works <span>·</span> Pune, Maharashtra</p></div><span className="preview-date">PROJECT US-2026-0142</span></div><div className="preview-next"><span className="preview-next-icon"><FileCheck2 size={22}/></span><div><small>YOUR NEXT BEST ACTION</small><strong>A small correction. A smoother submission.</strong><p>Review your premises details before moving forward.</p></div><span className="preview-review">Review details <ArrowRight size={13}/></span></div><div className="preview-metrics"><div><small>Approval pathway</small><strong>04 <span>requirements</span></strong><span>Tailored to your project</span></div><div><small>Application readiness</small><strong>02 <span>items to review</span></strong><span>Catch issues before submission</span></div><div><small>Current stage</small><strong className="preview-stage">Pre-establishment</strong><span>Your journey starts here</span></div></div><div className="preview-journey-head"><strong>Your approval journey</strong><span>View full journey <ArrowUpRight size={12}/></span></div><div className="preview-steps"><div><span className="step-done"><Check size={13}/></span><small>01 / DISCOVER</small><strong>Project defined</strong><p>The right starting point</p></div><div><span className="step-current">2</span><small>02 / PREPARE</small><strong>Build your application</strong><p>You are here</p></div><div><span>3</span><small>03 / COORDINATE</small><strong>Departmental review</strong><p>Clear, connected progress</p></div><div><span>4</span><small>04 / OPERATE</small><strong>Stay on track</strong><p>Compliance beyond approval</p></div></div></div></div>
          <span className="preview-open">Explore the real workspace <ArrowUpRight size={17}/></span>
        </Link>
        <div className="workspace-principles reveal"><div><Fingerprint size={21}/><strong>Explainable by design</strong><p>Know why a requirement applies.<br/>Follow the source, not a black box.</p></div><div><GitBranch size={21}/><strong>Connected, not complicated</strong><p>Applicant and officer views.<br/>One shared picture of progress.</p></div><div><ShieldCheck size={21}/><strong>Safeguards stay intact</strong><p>Guidance assists. Authorities decide.<br/>No shortcuts around compliance.</p></div></div>
      </section>

       <section className="sources-section"><div className="eyebrow">DESIGNED FOR CLARITY.<br/><strong>BUILT FOR PREPARATION.</strong></div><p>A practical coordination workspace for industrial approval preparation.<br/>Source links help you verify the route; authorities retain decisions.</p><div><a href="https://maitri.maharashtra.gov.in/" target="_blank" rel="noreferrer">MAITRI <ArrowUpRight size={13}/></a><a href="https://www.nsws.gov.in/" target="_blank" rel="noreferrer">NSWS <ArrowUpRight size={13}/></a><a href="https://www.mpcb.gov.in/" target="_blank" rel="noreferrer">MPCB <ArrowUpRight size={13}/></a></div></section>

      <section className="faq-section" id="questions"><div className="reveal"><span className="eyebrow"><span className="fine-cross">+</span> BEFORE YOU BEGIN</span><h2>A little clarity.<br/><span className="serif-word">Goes a long way.</span></h2><p>Built with purpose.<br/>Transparent about its limits.</p></div><div className="faq-list reveal">{questions.map(([question, answer], index) => <details key={question}><summary><span className="faq-number">0{index + 1}</span>{question}<Plus size={18}/></summary><p>{answer}</p></details>)}</div></section>

      <section className="final-section"><div className="final-orbit" aria-hidden="true"><span/><span/><span/></div><div className="reveal"><span className="eyebrow">YOUR AMBITION HAS A NEXT STEP.</span><h2>Let&apos;s make<br/><span className="serif-word">it happen.</span><span className="final-asterisk" aria-hidden="true">✳</span></h2><div className="final-actions"><Link href="/dashboard?new=1" className="light-button">Access your workspace <ArrowUpRight size={18}/></Link><Link href="/dashboard?demo=1" className="text-button">Contact enterprise sales <ArrowRight size={16}/></Link></div><span className="final-note">SECURE, SCALABLE, AND READY FOR BUSINESS.</span></div></section>
    </main>
     <footer className="landing-footer"><Link href="/" className="landing-brand"><Mark/><span>arthix<span className="brand-period">.</span></span></Link><p>From intent to industry.</p><div><span>LOCAL WORKSPACE PROTOTYPE</span><span>MADE FOR MAHARASHTRA.</span><a href="#main-content" aria-label="Back to top"><MoveUpRight size={18}/></a></div></footer>
  </div>;
}
