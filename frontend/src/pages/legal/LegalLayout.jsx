import { Link } from "react-router-dom";
import { SiteNav } from "../../components/landing/SiteNav";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { IOReveal } from "../../components/landing/IOReveal";

const TABS = [
  ["/legal/terms", "Terms & Disclaimer"],
  ["/legal/privacy", "Privacy & Data"],
  ["/legal/ai", "AI disclosure"],
  ["/credits", "Credits"],
];

export const LegalLayout = ({ eyebrow, title, updated, testid, children }) => (
  <div className="site-theme relative bg-cream" data-testid={testid}>
    <SiteNav />
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-40 sm:px-6 lg:pt-48">
      <IOReveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-moss">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight text-forest sm:text-6xl">{title}</h1>
        <p className="mt-3 font-mono text-xs text-forest/50">Last updated {updated} · applies to this prototype only</p>
      </IOReveal>
      <IOReveal delay={0.1}>
        <nav className="mt-10 flex flex-wrap gap-2" aria-label="Legal pages">
          {TABS.map(([to, label]) => (
            <Link key={to} to={to} data-testid={`legal-tab-${to.split("/").pop()}`} className="rounded-full border border-forest/15 px-4 py-2 text-xs font-semibold text-forest/70 transition-colors hover:border-forest hover:text-forest">
              {label}
            </Link>
          ))}
        </nav>
      </IOReveal>
      <div className="legal-prose mt-12 space-y-10">{children}</div>
      <p className="mt-16 rounded-3xl border border-forest/10 bg-cream-dark/50 p-6 text-xs leading-relaxed text-forest/60">
        This text is a plain-language notice for a hackathon prototype. It is not legal advice and has not been reviewed by counsel.
        A real launch would need a full policy set reviewed for India's DPDP Act 2023, RBI rules and, for UK users, UK GDPR and FCA rules.
      </p>
    </main>
    <SiteFooter />
  </div>
);

export const Section = ({ n, title, children }) => (
  <IOReveal as="section">
    <h2 className="flex items-baseline gap-4 font-serif text-3xl text-forest">
      <span className="font-mono text-xs text-moss">{n}</span>
      {title}
    </h2>
    <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-forest/75">{children}</div>
  </IOReveal>
);
