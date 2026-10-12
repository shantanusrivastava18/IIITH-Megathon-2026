import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight, Zap, Home as HomeIcon, Sun, FileDigit, Database, BrainCircuit, Calculator, MessageSquareText, FlaskConical, Leaf } from "lucide-react";
import { SiteNav, scrollToId } from "../components/landing/SiteNav";
import { SiteFooter } from "../components/landing/SiteFooter";
import { ScrollStory } from "../components/landing/ScrollStory";
import { IOReveal } from "../components/landing/IOReveal";
import { CountUp } from "../components/CountUp";
import { api, inrShort, logError } from "../lib/api";

const HERO_IMG = "https://images.unsplash.com/photo-1488330890490-c291ecf62571?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const IMG = {
  ev: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=85&w=800",
  solar: "https://images.unsplash.com/flagged/photo-1566838616631-f2618f74a6a2?auto=format&fit=crop&q=85&w=800",
  home: "https://images.unsplash.com/flagged/photo-1566838616793-29a4102a5b0e?auto=format&fit=crop&q=85&w=800",
};

const TICKER = ["1 kWh grid = 0.82 kg CO₂e", "EV vs petrol ≈ −725 kg / yr", "3 kW solar ≈ 2,952 kg / yr", "Scorer ranks · Engine calculates · LLM explains", "CEA · IPCC · DEFRA factors", "Paper statement ≈ 20 g CO₂e"];

const BENTO = [
  { key: "ev", name: "EV Finance", stat: "−725 kg", unit: "CO₂e / yr · sample driver", icon: Zap, img: IMG.ev, span: "md:col-span-7", desc: "High fuel spend and ageing petrol vehicles surface electric-vehicle finance candidates, with per-customer evidence." },
  { key: "solar", name: "Solar Rooftop", stat: "2,952 kg", unit: "CO₂e offset / yr · 3 kW", icon: Sun, img: IMG.solar, span: "md:col-span-5", desc: "Homeowners with heavy electricity draw matched to rooftop systems at CEA grid factors." },
  { key: "home", name: "Green Home Loan", stat: "15%", unit: "energy reduction modelled", icon: HomeIcon, img: IMG.home, span: "md:col-span-5", desc: "Existing mortgage holders with high utility spend qualify for efficiency retrofit lending." },
  { key: "paper", name: "Paperless Banking", stat: "20 g", unit: "CO₂e per statement saved", icon: FileDigit, span: "md:col-span-7", big: true, desc: "Paper-statement customers with high digital activity are one tap from a fully digital journey — the cheapest carbon a bank can cut." },
];

const PIPELINE = [
  { icon: Database, title: "Data & features", desc: "12 months of fictional transactions, categorised into 8 sustainability classes with duplicate checks." },
  { icon: BrainCircuit, title: "Transparent scoring", desc: "Documented, hand-set weights produce propensity, confidence and reason codes. A trained model is a benchmark only." },
  { icon: Calculator, title: "Carbon engine", desc: "Deterministic formulas on CEA, IPCC and DEFRA factors. The scorer cannot change a single number." },
  { icon: MessageSquareText, title: "LLM explains", desc: "Plain-English narration of stored outputs, with a deterministic fallback. It never predicts or approves." },
];

const COMPARE = [
  ["Why a recommendation", "Single score, no rationale", "Reason codes with transaction evidence"],
  ["Carbon impact", "Not measured", "Deterministic formulas, documented factors"],
  ["Explanations", "Static product copy", "LLM narration grounded in structured outputs"],
  ["Eligibility", "Mixed into the score", "Separate deterministic rules — never overridden"],
  ["Auditability", "Black box", "Every figure traceable to a factor and formula"],
];

const Eyebrow = ({ children, dark }) => (
  <p className={`flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] ${dark ? "text-lime" : "text-moss"}`}>
    <span className={`h-px w-8 ${dark ? "bg-lime" : "bg-moss"}`} />
    {children}
  </p>
);

const Hero = ({ ov }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 90]);
  const stats = [
    { v: ov?.customers_analyzed, l: "fictional customers" },
    { v: ov?.opportunities_detected, l: "green opportunities" },
    { v: ov?.co2e_tonnes_per_year, l: "t CO₂e / yr potential", d: 1 },
    { v: ov?.opportunity_value_inr, l: "indicative value", f: inrShort },
  ];
  return (
    <section className="relative overflow-hidden bg-cream pb-20 pt-40 lg:pb-28 lg:pt-48" data-testid="hero-section">
      <div className="hero-blob pointer-events-none absolute -right-40 -top-40 h-[640px] w-[640px] rounded-full" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <IOReveal><Eyebrow>Explainable green banking · prototype</Eyebrow></IOReveal>
          <h1 className="mt-6 font-serif text-5xl leading-[0.98] tracking-tight text-forest sm:text-6xl lg:text-[5.6rem]" data-testid="hero-headline">
            <IOReveal as="span" className="block" delay={0.05}>Every transaction</IOReveal>
            <IOReveal as="span" className="block" delay={0.15}>tells a <em className="lime-mark">greener</em></IOReveal>
            <IOReveal as="span" className="block" delay={0.25}>story.</IOReveal>
          </h1>
          <IOReveal delay={0.35}>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-forest/70 sm:text-lg">
              Green Finance Assistant reads a year of banking transactions and turns them into explainable
              green-finance opportunities — each with evidence, confidence and an auditable carbon estimate.
            </p>
          </IOReveal>
          <IOReveal delay={0.45} className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/companion" data-testid="hero-companion-cta" className="group flex items-center gap-2 rounded-full bg-forest px-7 py-4 text-sm font-semibold text-cream transition-[background-color,box-shadow,transform] duration-300 hover:bg-forest-soft hover:shadow-[0_18px_40px_-14px_rgba(18,48,31,0.7)] active:scale-[0.97]">
              Meet the Companion <ArrowRight className="h-4 w-4 text-lime transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/console" data-testid="hero-console-cta" className="group flex items-center gap-2 rounded-full border border-forest/20 bg-cream-dark/60 px-7 py-4 text-sm font-semibold text-forest transition-[border-color,background-color,transform] duration-300 hover:border-forest hover:bg-cream-dark active:scale-[0.97]">
              Intelligence Console <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link to="/verify" data-testid="hero-verify-cta" className="group flex items-center gap-2 rounded-full px-5 py-4 text-sm font-semibold text-moss transition-colors hover:text-forest">
              <FlaskConical className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" /> Test it yourself
            </Link>
          </IOReveal>
          <IOReveal delay={0.55}>
            <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-forest/15 pt-8 sm:grid-cols-4" data-testid="hero-stats">
              {stats.map((s) => (
                <div key={s.l}>
                  <dd className="font-serif text-4xl text-forest">{s.v == null ? "—" : <CountUp value={s.v} decimals={s.d || 0} format={s.f} />}</dd>
                  <dt className="mt-1 text-[11px] font-medium uppercase tracking-wider text-forest/55">{s.l}</dt>
                </div>
              ))}
            </dl>
          </IOReveal>
        </div>
        <IOReveal variant="scale" delay={0.2} className="relative lg:col-span-5">
          <div className="relative overflow-hidden rounded-t-[999px] rounded-b-[40px] shadow-[0_40px_90px_-30px_rgba(11,31,20,0.6)]">
            <motion.img src={HERO_IMG} alt="Dense green pine forest" className="aspect-[4/5] w-full scale-110 object-cover" style={{ y }} />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent" />
            <div className="glass-dark absolute bottom-5 left-5 right-5 rounded-3xl p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">Live signal · CUST-0001 (fictional)</p>
              <p className="mt-1 font-serif text-xl text-cream">Arjun M. — EV Finance, propensity 0.66</p>
              <p className="mt-1 font-mono text-[10px] text-cream/60">HIGH_FUEL_SPEND · HIGH_ANNUAL_MILEAGE · AGING_ICE_VEHICLE</p>
            </div>
          </div>
          <div className="animate-float absolute -left-6 top-16 rounded-3xl border border-forest/10 bg-cream px-5 py-4 shadow-xl" data-testid="hero-impact-chip">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-forest/50">Est. impact</p>
            <p className="font-mono text-xl font-bold text-forest">−725.2 <span className="text-sm text-moss">kg CO₂e/yr</span></p>
          </div>
          <div className="animate-float-slow absolute -right-3 top-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-lime shadow-xl">
            <Leaf className="h-7 w-7 text-forest" />
          </div>
        </IOReveal>
      </div>
    </section>
  );
};

const Ticker = () => (
  <div className="overflow-hidden border-y border-forest/10 bg-lime py-4" data-testid="carbon-marquee">
    <div className="flex w-max animate-marquee">
      {[0, 1].map((c) => (
        <div key={c} className="flex shrink-0 items-center">
          {TICKER.map((t) => (
            <span key={t} className="flex items-center whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-[0.18em] text-forest">
              <span className="px-7">{t}</span>
              <Leaf className="h-3.5 w-3.5" />
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const Bento = () => (
  <section id="opportunities" className="bg-cream py-24 lg:py-32" data-testid="opportunities-bento">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <IOReveal><Eyebrow>The green pool</Eyebrow></IOReveal>
      <IOReveal delay={0.1}>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-forest sm:text-5xl">Four opportunities, found in the <em className="text-moss">flow of money.</em></h2>
      </IOReveal>
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-12">
        {BENTO.map((b, i) => (
          <IOReveal key={b.key} delay={i * 0.08} className={b.span}>
            <Link to="/console/opportunities" data-testid={`bento-${b.key}-card`} className={`group flex h-full flex-col overflow-hidden rounded-[2rem] border transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1.5 ${b.big ? "border-forest bg-forest text-cream hover:shadow-[0_30px_60px_-30px_rgba(11,31,20,0.8)]" : "border-forest/10 bg-cream-dark/50 hover:border-forest/25 hover:shadow-[0_30px_60px_-34px_rgba(11,31,20,0.5)]"}`}>
              {b.img && (
                <div className="relative h-52 overflow-hidden sm:h-60">
                  <img src={b.img} alt={b.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/50 to-transparent" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-7 sm:p-9">
                <div className="flex items-start justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-500 group-hover:rotate-12 ${b.big ? "bg-lime text-forest" : "bg-forest text-lime"}`}><b.icon className="h-5 w-5" /></span>
                  <div className="text-right">
                    <p className={`font-serif text-4xl ${b.big ? "text-lime" : "text-forest"}`}>{b.stat}</p>
                    <p className={`text-[11px] uppercase tracking-wider ${b.big ? "text-cream/60" : "text-forest/55"}`}>{b.unit}</p>
                  </div>
                </div>
                <h3 className={`mt-6 font-serif text-2xl ${b.big ? "text-cream" : "text-forest"}`}>{b.name}</h3>
                <p className={`mt-2 flex-1 text-sm leading-relaxed ${b.big ? "text-cream/70" : "text-forest/70"}`}>{b.desc}</p>
                <span className={`mt-6 flex items-center gap-1.5 text-xs font-semibold ${b.big ? "text-lime" : "text-moss"}`}>
                  Explore detections <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </IOReveal>
        ))}
      </div>
    </div>
  </section>
);

const Pipeline = () => (
  <section id="pipeline" className="grain-forest py-24 lg:py-32" data-testid="pipeline-section">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <IOReveal><Eyebrow dark>Strict separation of concerns</Eyebrow></IOReveal>
      <IOReveal delay={0.1}>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-cream sm:text-5xl">The scorer ranks. The engine calculates. <em className="text-lime">The LLM only explains.</em></h2>
      </IOReveal>
      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE.map((s, i) => (
          <IOReveal key={s.title} delay={i * 0.1}>
            <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-cream/10 bg-cream/[0.04] p-7 backdrop-blur-sm transition-[border-color,background-color,transform] duration-500 hover:-translate-y-1 hover:border-lime/40 hover:bg-cream/[0.07]" data-testid={`pipeline-step-${i}`}>
              <span className="font-serif text-5xl text-cream/15 transition-colors duration-500 group-hover:text-lime/40">0{i + 1}</span>
              <s.icon className="mt-4 h-7 w-7 text-lime" />
              <h3 className="mt-4 font-serif text-2xl text-cream">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/60">{s.desc}</p>
            </div>
          </IOReveal>
        ))}
      </div>
    </div>
  </section>
);

const Compare = () => (
  <section id="compare" className="bg-cream py-24 lg:py-32">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <IOReveal><Eyebrow>Glass box</Eyebrow></IOReveal>
      <IOReveal delay={0.1}><h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-forest sm:text-5xl">Opaque scoring, meet <em className="text-moss">glass-box</em> intelligence.</h2></IOReveal>
      <IOReveal delay={0.2} className="mt-12 overflow-hidden rounded-[2rem] border border-forest/10 bg-cream-dark/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="comparison-table">
            <thead>
              <tr className="border-b border-forest/10 font-mono text-[11px] uppercase tracking-[0.16em] text-forest/55">
                <th className="px-7 py-5 font-semibold">Capability</th>
                <th className="px-7 py-5 font-semibold">Traditional scoring</th>
                <th className="px-7 py-5 font-semibold text-moss">Green Finance Assistant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/10">
              {COMPARE.map((r) => (
                <tr key={r[0]} className="hover:bg-lime/15">
                  <td className="px-7 py-5 font-medium text-forest">{r[0]}</td>
                  <td className="px-7 py-5 text-forest/50 line-through decoration-forest/20">{r[1]}</td>
                  <td className="px-7 py-5 font-medium text-forest">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IOReveal>
    </div>
  </section>
);

const Cta = () => (
  <section className="bg-cream px-4 pb-24 sm:px-6 lg:px-8">
    <IOReveal variant="scale" className="mx-auto max-w-7xl">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-lime px-8 py-16 sm:px-16">
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full border-[40px] border-forest/10" />
        <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-serif text-4xl leading-tight text-forest sm:text-5xl">See the intelligence working.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-forest/75">Explore 120 fictional Indian retail customers, drill from portfolio to a single transaction, and watch every figure trace back to a formula.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/console" data-testid="cta-console-btn" className="rounded-full bg-forest px-7 py-4 text-sm font-semibold text-cream transition-[background-color,transform] duration-300 hover:bg-forest-soft active:scale-[0.97]">Open the Console</Link>
            <Link to="/methodology" data-testid="cta-methodology-btn" className="rounded-full border border-forest/30 px-7 py-4 text-sm font-semibold text-forest transition-colors duration-300 hover:border-forest hover:bg-forest/5">Read the Methodology</Link>
          </div>
        </div>
      </div>
    </IOReveal>
  </section>
);

export default function Home() {
  const [ov, setOv] = useState(null);
  const { hash } = useLocation();

  useEffect(() => {
    api.get("/overview").then((r) => setOv(r.data)).catch(logError("Home"));
  }, []);

  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => scrollToId(hash.slice(1)), 300);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div className="site-theme relative bg-cream" data-testid="landing-page">
      <SiteNav />
      <Hero ov={ov} />
      <Ticker />
      <ScrollStory />
      <Bento />
      <Pipeline />
      <Compare />
      <Cta />
      <SiteFooter />
    </div>
  );
}
