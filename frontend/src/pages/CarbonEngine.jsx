import { useEffect, useState } from "react";
import { Zap, Sun, Home, FileDigit, Play } from "lucide-react";
import { api, kg, logError } from "../lib/api";
import { Reveal, Stagger, StaggerItem } from "../components/Motion";

const SCENARIOS = [
  { id: "ev", name: "EV vs Petrol", icon: Zap, inputs: [
      { key: "annual_km", label: "Annual mileage (km)", min: 2000, max: 30000, step: 500, def: 15000 },
      { key: "kmpl", label: "Petrol efficiency (km/l)", min: 8, max: 25, step: 0.5, def: 15 },
    ] },
  { id: "solar", name: "Rooftop Solar", icon: Sun, inputs: [
      { key: "monthly_kwh", label: "Monthly electricity (kWh)", min: 50, max: 1000, step: 10, def: 320 },
      { key: "roof_kw", label: "System size (kW)", min: 1, max: 10, step: 0.5, def: 3 },
    ] },
  { id: "green_home", name: "Home Retrofit", icon: Home, inputs: [
      { key: "monthly_kwh", label: "Monthly electricity (kWh)", min: 50, max: 1000, step: 10, def: 300 },
      { key: "monthly_gas_scm", label: "Monthly gas (SCM)", min: 0, max: 30, step: 1, def: 6 },
    ] },
  { id: "paperless", name: "Paperless Banking", icon: FileDigit, inputs: [
      { key: "statements_per_month", label: "Paper statements / month", min: 0, max: 10, step: 1, def: 2 },
      { key: "branch_visits_per_month", label: "Branch visits / month", min: 0, max: 12, step: 1, def: 2 },
    ] },
];

export default function CarbonEngine() {
  const [factors, setFactors] = useState([]);
  const [assumptions, setAssumptions] = useState({});
  const [scenario, setScenario] = useState("ev");
  const [inputs, setInputs] = useState(Object.fromEntries(SCENARIOS.map((s) => [s.id, Object.fromEntries(s.inputs.map((i) => [i.key, i.def]))])));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/carbon/factors").then((r) => { setFactors(r.data.factors); setAssumptions(r.data.assumptions); }).catch(logError("CarbonEngine"));
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.post("/carbon/calculate", { scenario, inputs: inputs[scenario] });
      setResult(r.data);
    } catch (e) { console.error("[CarbonEngine] keep old result", e); }
    setBusy(false);
  };

  const active = SCENARIOS.find((s) => s.id === scenario);

  return (
    <div className="mx-auto max-w-7xl space-y-8" data-testid="carbon-engine-page">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Deterministic Carbon Engine</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Rules in, kilograms out. No model magic.
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Every impact figure in the Green Finance Assistant comes from these documented emission factors and fixed formulas — fully auditable, fully reproducible.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="emission-factors-card">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <h2 className="font-display text-lg font-bold text-navy">Emission factor registry</h2>
              <p className="text-xs text-slate-500">CEA India grid baseline · IPCC 2006 · DEFRA 2023</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="px-6 py-3 sm:px-8">Activity</th>
                  <th className="px-4 py-3">Factor</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {factors.map((f) => (
                  <tr key={f.activity} className="transition-colors hover:bg-mint-light/40">
                    <td className="px-6 py-3.5 font-medium text-navy sm:px-8">{f.activity}</td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-lloyds">{f.kg_co2e_per_unit} kg/{f.unit}</td>
                    <td className="hidden max-w-xs px-4 py-3.5 text-xs text-slate-500 lg:table-cell">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-6" data-testid="assumptions-card">
            <h3 className="font-display text-sm font-bold text-navy">Fixed assumptions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(assumptions).map(([k, v]) => (
                <span key={k} className="rounded-full bg-slate-100 px-3 py-1.5 font-mono text-[11px] text-slate-600">{k} = {v}</span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="grain-navy rounded-3xl p-6 sm:p-8" data-testid="carbon-playground">
            <h2 className="font-display text-lg font-bold text-white">Calculator playground</h2>
            <p className="text-xs text-slate-400">Same code path the engine uses for customers.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setScenario(s.id); setResult(null); }}
                  data-testid={`scenario-${s.id}-btn`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    scenario === s.id ? "bg-mint text-navy" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" /> {s.name}
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-5">
              {active.inputs.map((inp) => (
                <div key={inp.key}>
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300">{inp.label}</label>
                    <span className="font-mono font-bold text-mint">{inputs[scenario][inp.key].toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range" min={inp.min} max={inp.max} step={inp.step}
                    value={inputs[scenario][inp.key]}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [scenario]: { ...prev[scenario], [inp.key]: parseFloat(e.target.value) } }))}
                    data-testid={`calc-input-${inp.key}`}
                    className="mt-2 w-full accent-emerald-400"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={run}
              disabled={busy}
              data-testid="carbon-calculate-btn"
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-mint py-3 text-sm font-bold text-navy transition-all duration-300 hover:bg-white active:scale-[0.98] disabled:opacity-60"
            >
              <Play className="h-4 w-4" /> {busy ? "Calculating…" : "Run deterministic calculation"}
            </button>
            {result && result.scenario === scenario && (
              <div className="mt-6 rounded-2xl border border-mint/30 bg-white/5 p-5" data-testid="carbon-result">
                <p className="font-mono text-3xl font-bold text-mint">{kg(result.kg_co2e_per_year)} <span className="text-sm font-normal text-slate-400">CO₂e / yr</span></p>
                <div className="mt-3 space-y-1.5">
                  {result.steps.map((s, i) => (
                    <p key={i} className="font-mono text-[11px] leading-relaxed text-slate-300">→ {s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          ["Deterministic", "Same inputs always produce the same estimate. Nothing is learned, sampled or hallucinated."],
          ["Documented", "Every factor carries a source; every output carries its formula and assumptions."],
          ["Honest", "Outputs are labelled 'estimated potential impact' — never a guarantee of savings."],
        ].map(([t, d]) => (
          <StaggerItem key={t}>
            <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6">
              <h3 className="font-display font-bold text-navy">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
