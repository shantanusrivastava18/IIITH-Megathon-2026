import { Database, BrainCircuit, Calculator, MessageSquareText, ShieldCheck, Scale, Eye, Lock } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "../components/Motion";

const FLOW = [
  { icon: Database, title: "Synthetic data", desc: "120 fictional customers, 12 months of transactions, 8 categories. No real banking data, ever." },
  { icon: BrainCircuit, title: "Transparent scoring model", desc: "Hand-set, documented weights with sigmoid squashing — not a trained model. Every score decomposes into reason codes. A logistic regression is trained only as a benchmark." },
  { icon: Calculator, title: "Carbon engine", desc: "Deterministic formulas on CEA / IPCC / DEFRA factors. The scorer cannot influence the numbers." },
  { icon: MessageSquareText, title: "LLM layer", desc: "Narrates structured outputs in plain English with a strict system prompt and a template fallback. It cannot predict, calculate, or approve." },
];

const GUARDRAILS = [
  { icon: ShieldCheck, title: "Eligibility is separate", desc: "Deterministic product rules decide eligibility. Products a customer fails are never recommended, regardless of propensity." },
  { icon: Scale, title: "Fairness & consent", desc: "Synthetic data only in this prototype. Real deployment would require DPDP Act 2023 consent and RBI FREE-AI alignment." },
  { icon: Eye, title: "Full explainability", desc: "Each recommendation shows evidence, confidence, reason codes and data timestamp. Ineligible products are shown as held back, with the reason." },
  { icon: Lock, title: "Hallucination control", desc: "The LLM receives only structured numbers and is instructed to use nothing else; if the API fails, a deterministic template takes over." },
];

export default function Methodology() {
  return (
    <div className="mx-auto max-w-7xl space-y-14" data-testid="methodology-page">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Methodology & Responsible AI</p>
        <h1 className="mt-2 max-w-3xl font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl lg:text-4xl">
          A glass-box pipeline, built to be audited.
        </h1>
      </Reveal>

      <section>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {FLOW.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="relative h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm" data-testid={`method-step-${i}`}>
                {i < FLOW.length - 1 && (
                  <span className="absolute -right-4 top-1/2 hidden h-px w-8 bg-mint xl:block" aria-hidden="true" />
                )}
                <span className="font-mono text-xs font-bold text-lloyds">0{i + 1}</span>
                <s.icon className="mt-3 h-6 w-6 text-lloyds" />
                <h3 className="mt-3 font-display font-bold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="grain-navy rounded-3xl p-8 sm:p-12">
        <Reveal>
          <h2 className="font-display text-2xl font-bold text-white">The one rule that governs everything</h2>
          <p className="mt-4 max-w-3xl font-mono text-sm leading-loose text-mint">
            Scorer ranks · Carbon engine calculates · LLM explains · Rules decide eligibility
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
            No component may do another's job. This separation is what makes every figure in the
            product traceable: a propensity score decomposes into weighted features, a kilogram of CO₂e
            decomposes into a documented factor, and a paragraph of prose decomposes into the
            structured record it was narrated from.
          </p>
        </Reveal>
      </section>

      <section>
        <Reveal>
          <h2 className="font-display text-xl font-bold text-navy">Responsible AI guardrails</h2>
        </Reveal>
        <Stagger className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {GUARDRAILS.map((g) => (
            <StaggerItem key={g.title}>
              <div className="flex h-full gap-4 rounded-2xl border border-slate-200/80 bg-white p-6" data-testid={`guardrail-${g.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <g.icon className="h-6 w-6 shrink-0 text-lloyds" />
                <div>
                  <h3 className="font-display font-bold text-navy">{g.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{g.desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10">
        <Reveal>
          <h2 className="font-display text-xl font-bold text-navy">Evaluation approach</h2>
          <div className="mt-5 grid grid-cols-1 gap-6 text-sm leading-relaxed text-slate-600 md:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-lloyds">Reproducibility</p>
              <p className="mt-2">Dataset generated from a fixed seed (42). Same seed, same customers, same scores — every run. Reported on a hold-out split and with 5-fold cross-validation over all 120 customers.</p>
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-lloyds">Transparency</p>
              <p className="mt-2">Model weights, emission factors, formulas and assumptions are all inspectable in the Carbon Engine view.</p>
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-lloyds">Limitations</p>
              <p className="mt-2">Labels are synthetic and generated from the same features the scorer uses, so metrics show ranking consistency on synthetic labels — not real-world accuracy. Estimates are gross of rebound effects.</p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
