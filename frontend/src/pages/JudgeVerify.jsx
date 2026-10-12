import { useEffect, useState } from "react";
import { Play, CheckCircle2, XCircle, FlaskConical, RotateCw, ShieldCheck, Zap, Sun, Home, FileDigit, UserCheck } from "lucide-react";
import { api, kg, logError } from "../lib/api";
import { Reveal } from "../components/Motion";

const SCENARIOS = {
  ev: { name: "EV vs Petrol", icon: Zap, inputs: [
      { key: "annual_km", label: "Annual mileage (km)", def: 15000 },
      { key: "kmpl", label: "Petrol efficiency (km/l)", def: 15 },
    ] },
  solar: { name: "Rooftop Solar", icon: Sun, inputs: [
      { key: "monthly_kwh", label: "Monthly electricity (kWh)", def: 300 },
      { key: "roof_kw", label: "System size (kW)", def: 3 },
    ] },
  green_home: { name: "Home Retrofit", icon: Home, inputs: [
      { key: "monthly_kwh", label: "Monthly electricity (kWh)", def: 300 },
      { key: "monthly_gas_scm", label: "Monthly gas (SCM)", def: 6 },
    ] },
  paperless: { name: "Paperless Banking", icon: FileDigit, inputs: [
      { key: "statements_per_month", label: "Paper statements / month", def: 2 },
      { key: "branch_visits_per_month", label: "Branch visits / month", def: 2 },
    ] },
};

const VECTORS = [
  { id: "v1", scenario: "ev", label: "EV · 15,000 km/yr · 15 km/l", inputs: { annual_km: 15000, kmpl: 15 }, expected: 588.0 },
  { id: "v2", scenario: "ev", label: "EV · 20,000 km/yr · 12 km/l", inputs: { annual_km: 20000, kmpl: 12 }, expected: 1554.0 },
  { id: "v3", scenario: "ev", label: "EV · 8,000 km/yr · 18 km/l", inputs: { annual_km: 8000, kmpl: 18 }, expected: 108.3 },
  { id: "v4", scenario: "solar", label: "Solar · 300 kWh/mo · 3 kW roof", inputs: { monthly_kwh: 300, roof_kw: 3 }, expected: 2952.0 },
  { id: "v5", scenario: "solar", label: "Solar · 200 kWh/mo · 5 kW roof", inputs: { monthly_kwh: 200, roof_kw: 5 }, expected: 1968.0 },
  { id: "v6", scenario: "solar", label: "Solar · 500 kWh/mo · 3 kW roof", inputs: { monthly_kwh: 500, roof_kw: 3 }, expected: 3542.4 },
  { id: "v7", scenario: "green_home", label: "Retrofit · 300 kWh/mo · 6 SCM gas", inputs: { monthly_kwh: 300, monthly_gas_scm: 6 }, expected: 464.8 },
  { id: "v8", scenario: "green_home", label: "Retrofit · 450 kWh/mo · 10 SCM gas", inputs: { monthly_kwh: 450, monthly_gas_scm: 10 }, expected: 700.9 },
  { id: "v9", scenario: "paperless", label: "Paperless · 2 statements · 2 visits /mo", inputs: { statements_per_month: 2, branch_visits_per_month: 2 }, expected: 11.0 },
  { id: "v10", scenario: "paperless", label: "Paperless · 5 statements · 0 visits /mo", inputs: { statements_per_month: 5, branch_visits_per_month: 0 }, expected: 1.2 },
  { id: "v11", scenario: "paperless", label: "Paperless · 1 statement · 4 visits /mo", inputs: { statements_per_month: 1, branch_visits_per_month: 4 }, expected: 21.4 },
];

const TOLERANCE = 0.15;

export default function JudgeVerify() {
  const [scenario, setScenario] = useState("ev");
  const [inputs, setInputs] = useState(Object.fromEntries(Object.entries(SCENARIOS).map(([k, s]) => [k, Object.fromEntries(s.inputs.map((i) => [i.key, i.def]))])));
  const [custom, setCustom] = useState(null);
  const [customBusy, setCustomBusy] = useState(false);
  const [results, setResults] = useState({});
  const [runAllBusy, setRunAllBusy] = useState(false);
  const [repro, setRepro] = useState(null);
  const [reproBusy, setReproBusy] = useState(false);
  const [pairs, setPairs] = useState([]);
  const [pairIdx, setPairIdx] = useState(0);
  const [custResult, setCustResult] = useState(null);
  const [custBusy, setCustBusy] = useState(false);

  useEffect(() => {
    api.get("/verify/pairs").then((r) => setPairs(r.data.items)).catch(logError("JudgeVerify"));
  }, []);

  const runCustomerVerify = async () => {
    const p = pairs[pairIdx];
    if (!p) return;
    setCustBusy(true);
    try {
      const r = await api.post("/verify/customer", { customer_id: p.customer_id, product_id: p.product_id });
      setCustResult(r.data);
    } catch (e) { console.error("[JudgeVerify] keep previous", e); }
    setCustBusy(false);
  };

  const runCustom = async () => {
    setCustomBusy(true);
    try {
      const r = await api.post("/carbon/calculate", { scenario, inputs: inputs[scenario] });
      setCustom(r.data);
    } catch (e) { console.error("[JudgeVerify] keep previous", e); }
    setCustomBusy(false);
  };

  const runVector = async (v) => {
    try {
      const r = await api.post("/carbon/calculate", { scenario: v.scenario, inputs: v.inputs });
      const actual = r.data.kg_co2e_per_year;
      setResults((prev) => ({ ...prev, [v.id]: { actual, pass: Math.abs(actual - v.expected) < TOLERANCE } }));
    } catch (e) {
      setResults((prev) => ({ ...prev, [v.id]: { actual: null, pass: false } }));
    }
  };

  const runAll = async () => {
    setRunAllBusy(true);
    for (const v of VECTORS) {
      await runVector(v);
    }
    setRunAllBusy(false);
  };

  const runRepro = async () => {
    setReproBusy(true);
    try {
      const [r1, r2] = [await api.get("/evaluation"), await api.get("/evaluation")];
      const pick = (d) => JSON.stringify({
        macro: d.macro_metrics, per_product: d.per_product.map((p) => [p.product, p.model.auc]),
        repro: { c: d.reproducibility.customers_match, t: d.reproducibility.transactions_match, a: d.reproducibility.amount_checksum_match },
        splits: d.splits,
      });
      const identical = pick(r1.data) === pick(r2.data);
      setRepro({
        identical,
        auc: r1.data.macro_metrics.model.auc,
        checks: r1.data.reproducibility,
        runtime: r2.data.performance.evaluation_runtime_ms,
      });
    } catch (e) {
      setRepro({ identical: false });
    }
    setReproBusy(false);
  };

  const passCount = VECTORS.filter((v) => results[v.id]?.pass).length;
  const active = SCENARIOS[scenario];

  return (
    <div className="mx-auto max-w-7xl space-y-8" data-testid="verify-page">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Judge Verification</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Don't trust us. Test the methodology yourself.
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Every number the Green Finance Assistant produces is deterministic: the same inputs always recreate the same outputs.
          This page lets you run the live engine against documented test vectors, try your own inputs, and prove
          the evaluation harness is reproducible — all against the real backend, right now.
        </p>
      </Reveal>

      {/* live tester */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="grain-navy h-full rounded-3xl p-6 sm:p-8" data-testid="live-tester">
            <h2 className="font-display text-lg font-bold text-white">Try your own inputs</h2>
            <p className="text-xs text-slate-400">Your input → engine output, with every calculation step shown.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {Object.entries(SCENARIOS).map(([id, s]) => (
                <button
                  key={id}
                  onClick={() => { setScenario(id); setCustom(null); }}
                  data-testid={`verify-scenario-${id}-btn`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    scenario === id ? "bg-mint text-navy" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" /> {s.name}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-4">
              {active.inputs.map((inp) => (
                <div key={inp.key}>
                  <label className="text-xs text-slate-300">{inp.label}</label>
                  <input
                    type="number"
                    value={inputs[scenario][inp.key]}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [scenario]: { ...prev[scenario], [inp.key]: parseFloat(e.target.value) || 0 } }))}
                    data-testid={`verify-input-${inp.key}`}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-mint"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={runCustom}
              disabled={customBusy}
              data-testid="verify-run-btn"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-mint py-3 text-sm font-bold text-navy transition-all duration-300 hover:bg-white active:scale-[0.98] disabled:opacity-60"
            >
              <Play className="h-4 w-4" /> {customBusy ? "Running…" : "Run the engine"}
            </button>
            {custom && custom.scenario === scenario && (
              <div className="mt-5 rounded-2xl border border-mint/30 bg-white/5 p-5" data-testid="verify-custom-result">
                <p className="font-mono text-2xl font-bold text-mint">{kg(custom.kg_co2e_per_year)} <span className="text-sm font-normal text-slate-400">CO₂e / yr</span></p>
                <div className="mt-3 space-y-1.5">
                  {custom.steps.map((s, i) => (
                    <p key={i} className="font-mono text-[11px] leading-relaxed text-slate-300">→ {s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>

        {/* dummy vectors */}
        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="test-vectors-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
              <div>
                <h2 className="font-display text-lg font-bold text-navy">Dummy inputs → required outputs</h2>
                <p className="text-xs text-slate-500">Hand-computed from the documented formulas. Run them live — every row must match.</p>
              </div>
              <button
                onClick={runAll}
                disabled={runAllBusy}
                data-testid="run-all-vectors-btn"
                className="flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-lloyds active:scale-[0.97] disabled:opacity-60"
              >
                {runAllBusy ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                {runAllBusy ? "Running…" : "Run all 11"}
              </button>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    <th className="px-6 py-3 sm:px-8">Test vector</th>
                    <th className="px-4 py-3">Expected</th>
                    <th className="px-4 py-3">Live output</th>
                    <th className="px-4 py-3">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {VECTORS.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-mint-light/40" data-testid={`vector-row-${v.id}`}>
                      <td className="px-6 py-3 text-xs font-medium text-slate-700 sm:px-8">{v.label}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.expected.toLocaleString("en-IN")} kg</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-navy">
                        {results[v.id] ? (results[v.id].actual != null ? `${results[v.id].actual.toLocaleString("en-IN")} kg` : "error") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {results[v.id] ? (
                          results[v.id].pass ? (
                            <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-lloyds" data-testid={`vector-status-${v.id}`}><CheckCircle2 className="h-4 w-4" /> PASS</span>
                          ) : (
                            <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-rose-500" data-testid={`vector-status-${v.id}`}><XCircle className="h-4 w-4" /> FAIL</span>
                          )
                        ) : (
                          <span className="font-mono text-[11px] text-slate-300">pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Object.keys(results).length > 0 && (
              <div className="border-t border-slate-100 px-6 py-4 sm:px-8" data-testid="vectors-summary">
                <p className={`font-mono text-xs font-bold ${passCount === VECTORS.length ? "text-lloyds" : "text-rose-500"}`}>
                  {passCount}/{VECTORS.length} vectors reproduce the documented output
                </p>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* customer-level end-to-end verify */}
      <Reveal>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="customer-verify-card">
          <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                <UserCheck className="h-5 w-5 text-lloyds" /> Verify a real customer, end to end
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Pick a featured customer's recommendation. We pull their raw inputs from the record, recompute the
                impact through the live public engine, and compare it against the stored figure — the full chain,
                nothing hidden.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={pairIdx}
                onChange={(e) => { setPairIdx(parseInt(e.target.value)); setCustResult(null); }}
                data-testid="customer-verify-select"
                className="max-w-xs rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-mint"
              >
                {pairs.map((p, i) => (
                  <option key={`${p.customer_id}-${p.product_id}`} value={i}>
                    {`${p.name} · ${p.product} · ${p.kg_co2e_per_year.toLocaleString("en-IN")} kg`}
                  </option>
                ))}
              </select>
              <button
                onClick={runCustomerVerify}
                disabled={custBusy || pairs.length === 0}
                data-testid="customer-verify-run-btn"
                className="flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-lloyds active:scale-[0.97] disabled:opacity-60"
              >
                {custBusy ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Recompute end to end
              </button>
            </div>
          </div>
          {custResult && !custResult.error && (
            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12" data-testid="customer-verify-result">
              <div className="rounded-2xl bg-slate-50 p-5 lg:col-span-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Raw inputs from the record</p>
                <div className="mt-3 space-y-1.5">
                  {Object.entries(custResult.raw_inputs).map(([k, v]) => (
                    <p key={k} className="flex justify-between font-mono text-xs text-slate-700">
                      <span>{k}</span><span className="font-bold text-navy">{Number(v).toLocaleString("en-IN")}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Formula</p>
                <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-slate-600">{custResult.formula}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5 lg:col-span-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Calculation steps (live engine)</p>
                <div className="mt-3 space-y-1.5">
                  {custResult.steps.map((s, i) => (
                    <p key={i} className="font-mono text-[11px] leading-relaxed text-slate-600">→ {s}</p>
                  ))}
                </div>
              </div>
              <div className={`rounded-2xl p-5 lg:col-span-4 ${custResult.match ? "bg-mint-light" : "bg-rose-50"}`}>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Stored vs recomputed</p>
                <div className="mt-3 space-y-1.5 font-mono text-xs text-slate-700">
                  <p className="flex justify-between"><span>stored in platform</span><span className="font-bold text-navy">{custResult.stored_kg_co2e.toLocaleString("en-IN")} kg</span></p>
                  <p className="flex justify-between"><span>recomputed now</span><span className="font-bold text-navy">{custResult.recomputed_kg_co2e.toLocaleString("en-IN")} kg</span></p>
                </div>
                <p className={`mt-4 flex items-center gap-1.5 font-mono text-sm font-bold ${custResult.match ? "text-lloyds" : "text-rose-500"}`} data-testid="customer-verify-verdict">
                  {custResult.match ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {custResult.match ? "MATCH — chain verified" : "MISMATCH"}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{custResult.note}</p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* reproducibility */}
      <Reveal>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="repro-card">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                <ShieldCheck className="h-5 w-5 text-lloyds" /> Recreate the full evaluation
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Runs the complete evaluation harness twice in a row — dataset regeneration, splits, labels, metrics,
                bootstrap CIs — and compares. Identical results prove the pipeline is fully reproducible (seed 42).
              </p>
            </div>
            <button
              onClick={runRepro}
              disabled={reproBusy}
              data-testid="run-reproducibility-btn"
              className="flex shrink-0 items-center gap-2 rounded-full bg-lloyds px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-mint hover:text-navy active:scale-[0.97] disabled:opacity-60"
            >
              {reproBusy ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {reproBusy ? "Evaluating twice…" : "Prove reproducibility"}
            </button>
          </div>
          {repro && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4" data-testid="repro-result">
              <div className={`rounded-2xl p-5 ${repro.identical ? "bg-mint-light" : "bg-rose-50"}`}>
                <p className={`font-mono text-xl font-bold ${repro.identical ? "text-lloyds" : "text-rose-500"}`} data-testid="repro-verdict">
                  {repro.identical ? "IDENTICAL" : "MISMATCH"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">two consecutive full evaluation runs</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-mono text-xl font-bold text-navy">{repro.auc}</p>
                <p className="mt-1 text-[11px] text-slate-500">macro AUC, both runs</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-mono text-xl font-bold text-navy">{String(repro.checks?.amount_checksum_match).toUpperCase()}</p>
                <p className="mt-1 text-[11px] text-slate-500">dataset regeneration checksum (seed 42)</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-mono text-xl font-bold text-navy">{repro.runtime} ms</p>
                <p className="mt-1 text-[11px] text-slate-500">full harness runtime</p>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
