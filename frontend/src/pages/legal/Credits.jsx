import { LegalLayout, Section } from "./LegalLayout";

const GROUPS = [
  { t: "Backend", items: ["FastAPI", "Uvicorn", "Motor / PyMongo", "Pydantic", "python-dotenv", "pytest"] },
  { t: "Frontend", items: ["React", "React Router", "Tailwind CSS", "shadcn/ui & Radix UI", "Framer Motion", "Recharts", "Lenis", "lucide-react", "Axios", "CRACO"] },
  { t: "Emission factors", items: ["Central Electricity Authority (India) CO₂ baseline database", "IPCC 2006 Guidelines", "UK DEFRA / DESNZ GHG conversion factors"] },
  { t: "AI", items: ["Optional narration: OpenAI-compatible chat model via the OpenAI Python SDK", "AI coding assistants were used during development; all output was reviewed by the team"] },
  { t: "Media & type", items: ["Photography: Unsplash contributors (Unsplash License)", "Fonts: Instrument Serif, Manrope, JetBrains Mono, Plus Jakarta Sans, Outfit (Google Fonts, OFL)"] },
  { t: "Other", items: ["ReportLab (PDF generation)", "Source code: MIT License"] },
];

export default function Credits() {
  return (
    <LegalLayout eyebrow="Open source" title="Credits" updated="10 Oct 2026" testid="credits-page">
      <Section n="01" title="Built on the shoulders of">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.t} className="rounded-3xl border border-forest/10 bg-cream-dark/40 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-forest/25" data-testid={`credits-${g.t.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-moss">{g.t}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-forest/80">
                {g.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </LegalLayout>
  );
}
