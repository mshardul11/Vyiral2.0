import { Link } from "react-router-dom";
import { useAuth } from "../state/auth";

export function Landing() {
  const { user } = useAuth();
  return <div className="landing">
    <nav className="nav wrap"><Link className="wordmark" to="/"><span>V</span> VYIRAL</Link><div className="nav__links"><a href="#intelligence">Intelligence</a><a href="#craft">Craft</a><Link to={user ? "/app" : "/auth"}>{user ? "Open studio" : "Sign in"}</Link><Link className="nav__cta" to={user ? "/app" : "/auth?mode=register"}>Create your résumé <b>↗</b></Link></div></nav>
    <main>
      <section className="hero wrap"><div className="hero__eyebrow"><i /> THE CAREER INTELLIGENCE STUDIO</div><h1>Your story,<br/><em>engineered</em> to resonate.</h1><p className="hero__copy">Transform your experience into a precise, compelling narrative. Built with intelligent writing tools and crafted for people who are going places.</p><div className="hero__actions"><Link className="hero__primary" to={user ? "/app" : "/auth?mode=register"}>Build your résumé <span>→</span></Link><a className="hero__secondary" href="#craft">Explore the studio <span>↓</span></a></div><div className="hero__trust"><div><strong>04</strong><span>Intelligent<br/>writing modes</span></div><div><strong>ATS</strong><span>Optimized<br/>by design</span></div><div><strong>∞</strong><span>Edits &<br/>exports</span></div></div><div className="orb" aria-hidden="true"><div className="orb__ring"/><div className="orb__core"/><span className="orb__label orb__label--one">CLARITY</span><span className="orb__label orb__label--two">IMPACT</span><span className="orb__label orb__label--three">PRECISION</span></div></section>
      <section className="manifesto" id="intelligence"><div className="wrap manifesto__grid"><p>Not another template library.</p><h2>A focused environment where intelligence meets <em>intentional design.</em></h2><div className="feature"><b>01</b><h3>Write with intelligence</h3><p>Context-aware guidance turns raw experience into sharp, credible accomplishments.</p></div><div className="feature"><b>02</b><h3>Tailor with precision</h3><p>Align your story to every opportunity without losing your authentic voice.</p></div><div className="feature"><b>03</b><h3>Present beautifully</h3><p>Export refined, ATS-friendly documents designed to look exceptional everywhere.</p></div></div></section>
      <section className="studio-cta wrap" id="craft"><span>YOUR NEXT CHAPTER</span><h2>Make the first impression<br/>feel <em>inevitable.</em></h2><Link to={user ? "/app" : "/auth?mode=register"}>Enter the studio →</Link></section>
    </main><footer className="footer wrap"><span>© 2026 VYIRAL STUDIO</span><span>Designed for ambitious people.</span></footer>
  </div>;
}
