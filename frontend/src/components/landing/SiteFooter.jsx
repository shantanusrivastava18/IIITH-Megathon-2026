import { Link } from "react-router-dom";
import { LogoMark } from "../Logo";

const COLS = [
  { h: "Product", links: [["/console", "Console"], ["/companion", "Customer Companion"], ["/carbon", "Carbon Engine"], ["/evaluation", "Evaluation"]] },
  { h: "Trust", links: [["/methodology", "Methodology & assumptions"], ["/verify", "Verify the numbers"], ["/legal/ai", "AI disclosure"], ["/credits", "Credits"]] },
  { h: "Legal", links: [["/legal/terms", "Terms & Disclaimer"], ["/legal/privacy", "Privacy & Data"]] },
];

export const SiteFooter = () => (
  <footer className="bg-forest-deep text-cream" data-testid="site-footer">
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:grid-cols-12 lg:px-8">
      <div className="md:col-span-5">
        <div className="flex items-center gap-3">
          <LogoMark className="h-9 w-9" />
          <p className="font-serif text-2xl">Green Finance <em className="text-lime">Assistant</em></p>
        </div>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/60">
          An explainable green-banking prototype. All customers and transactions are fictional. Estimates are not
          guarantees, carbon figures are indicative, and nothing here is financial advice.
        </p>
      </div>
      {COLS.map((c) => (
        <div key={c.h} className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">{c.h}</p>
          <ul className="mt-4 space-y-2.5">
            {c.links.map(([to, label]) => (
              <li key={to}>
                <Link to={to} data-testid={`footer-link-${to.replace(/\//g, "-").slice(1)}`} className="group inline-flex items-center text-sm text-cream/70 transition-colors hover:text-cream">
                  <span className="mr-0 h-px w-0 bg-lime transition-[width,margin] duration-300 group-hover:mr-2 group-hover:w-3" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-cream/10">
      <p className="mx-auto max-w-7xl px-4 py-5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/40 sm:px-6 lg:px-8">
        Synthetic data only · MIT licensed prototype · Megathon X: Singularity · PS1
      </p>
    </div>
  </footer>
);
