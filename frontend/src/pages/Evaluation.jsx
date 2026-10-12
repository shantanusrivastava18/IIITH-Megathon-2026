import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, ErrorBar } from "recharts";
import { CheckCircle2, XCircle, FlaskConical, Database, GitBranch, Repeat2, Layers, AlertTriangle } from "lucide-react";
import { api, logError } from "../lib/api";
import { Reveal, Stagger, StaggerItem } from "../components/Motion";
import { CvTable } from "../components/CvTable";
import { PageLoader } from "../components/PageLoader";

const CRITERIA = [
  ["Recommendation quality", "Transparent scoring model (hand-set weights) compared with a trained logistic regression and baselines — hold-out split plus 5-fold cross-validation"],
  ["Data quality", "Duplicate detection, 100% categorisation coverage, customer-level disjoint splits with no leakage"],
  ["Sustainability impact", "Deterministic engine validated by known-answer tests below — expected vs actual, every run"],
  ["GenAI / LLM implementation", "Grounded narration layer with deterministic fallback; grounding checks below"],
  ["Technical architecture", "Strict separation: scorer ranks, carbon engine calculates, LLM explains, rules decide eligibility"],
  ["Explainability", "Reason codes, evidence, confidence and data timestamp on every recommendation"],
  ["Business relevance", "Console drill-down from portfolio KPIs to a single customer's transactions"],
  ["Innovation", "Customer memory adapts recommendation ordering under hard guardrails"],
];

const Pass = ({ ok }) =>
  ok ? (
    <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-lloyds"><CheckCircle2 className="h-4 w-4" /> PASS</span>
  ) : (
    <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-500"><XCircle className="h-4 w-4" /> FAIL</span>
  );

export default function Evaluation() {
  const [ev, setEv] = useState(null);

  useEffect(() => {
    api.get("/evaluation").then((r) => setEv(r.data)).catch(logError("Evaluation"));
  }, []);

  if (!ev) return <PageLoader testid="evaluation-loading" label="Running evaluation harness…" />;

  const aucChart = ev.per_product.map((p) => ({
    product: p.product.replace(" Rooftop Finance", "").replace(" Banking", ""),
    "Transparent scorer": p.model.auc, "Logistic regression": p.learned.auc, "Single-signal baseline": p.single_signal.auc, "Random": p.random.auc,
    model_err: p.model.auc_ci ? [Math.max(0, +(p.model.auc - p.model.auc_ci[0]).toFixed(3)), Math.max(0, +(p.model.auc_ci[1] - p.model.auc).toFixed(3))] : [0, 0],
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-10" data-testid="evaluation-page">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Evaluation Report</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Ranking consistency on synthetic labels.
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Live evaluation harness, recomputed on every load against the seeded dataset.
          Generated {ev.generated_at.slice(0, 19).replace("T", " ")} UTC · runtime {ev.performance.evaluation_runtime_ms} ms.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-7" data-testid="circularity-notice">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm leading-relaxed text-slate-700">
            <p className="font-display font-bold text-navy">Read this first: what these numbers do and don't show</p>
            <p className="mt-1.5">
              The production scorer is a <b>transparent scoring model</b> with hand-set, documented weights — it is not trained.
              The synthetic labels are generated from <b>the same features the scorer uses</b> (different weights plus noise),
              so the AUCs below measure <b>ranking consistency on synthetic labels</b>, not real-world accuracy. A logistic
              regression trained on the train split is shown as an honest learned benchmark. Scorer weights were fixed before
              evaluation and have not been tuned on test results.
            </p>
          </div>
        </div>
      </Reveal>

      {/* scoring criteria mapping */}
      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="criteria-table">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="font-display text-lg font-bold text-navy">Hackathon scoring criteria → what this build shows</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {CRITERIA.map(([c, w]) => (
              <div key={c} className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-3 sm:px-8">
                <p className="font-medium text-navy">{c}</p>
                <p className="text-sm text-slate-600 sm:col-span-2">{w}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* dataset + splits */}
      <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: Database, label: "Dataset", value: `${ev.dataset.customers} × ${ev.dataset.transactions.toLocaleString("en-IN")}`, sub: `customers × transactions · ${ev.dataset.duplicates_flagged} duplicates flagged` },
          { icon: GitBranch, label: "Splits", value: `${ev.splits.train} / ${ev.splits.validation} / ${ev.splits.test}`, sub: "train / validation / test rows · customer-level disjoint" },
          { icon: FlaskConical, label: "Macro AUC (hold-out)", value: ev.macro_metrics.model.auc, sub: `scorer · 95% CI [${(ev.macro_metrics.model.auc_ci || ["—", "—"]).join(", ")}] · LR ${ev.macro_metrics.learned.auc} · 1-signal ${ev.macro_metrics.single_signal.auc}` },
          { icon: Layers, label: "Macro AUC (5-fold CV)", value: ev.cross_validation.macro_auc.model.mean, sub: `scorer ± ${ev.cross_validation.macro_auc.model.std} · LR ${ev.cross_validation.macro_auc.learned.mean} ± ${ev.cross_validation.macro_auc.learned.std} · all ${ev.cross_validation.customers} customers` },
          { icon: Repeat2, label: "Reproducibility", value: ev.reproducibility.amount_checksum_match ? "PASS" : "FAIL", sub: `seed ${ev.reproducibility.seed} · dataset regenerates identically` },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <div className="card-lift h-full rounded-2xl border border-slate-200/80 bg-white p-6" data-testid={`eval-kpi-${s.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{s.label}</p>
                <s.icon className="h-4 w-4 text-lloyds" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-navy">{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* model quality */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="auc-chart-card">
            <h2 className="font-display text-lg font-bold text-navy">AUC by product — scorer vs trained model vs baselines</h2>
            <p className="mb-4 text-xs text-slate-500">Held-out test split · synthetic labels (documented rule) · whiskers show 95% bootstrap CI on the scorer (1,000 seeded resamples)</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={aucChart}>
                <XAxis dataKey="product" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Transparent scorer" fill="#4F7A3A" radius={[4, 4, 0, 0]}>
                  <ErrorBar dataKey="model_err" width={5} strokeWidth={1.5} stroke="#12301F" />
                </Bar>
                <Bar dataKey="Logistic regression" fill="#A6D63F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Single-signal baseline" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Random" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-5">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="calibration-card">
            <h2 className="font-display text-lg font-bold text-navy">Calibration</h2>
            <p className="mb-4 text-xs text-slate-500">Predicted propensity vs observed take-up rate (test split)</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ev.calibration}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="predicted" stroke="#12301F" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="observed" stroke="#A6D63F" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
      </div>

      {/* per-product metrics table */}
      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="metrics-table">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="font-display text-lg font-bold text-navy">Per-product metrics (test split)</h2>
            <p className="text-xs text-slate-500">AUC for scorer, logistic regression and single-signal baseline · P@k, Brier and log-loss for the scorer</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="px-6 py-3 sm:px-8">Product</th>
                  <th className="px-4 py-3">n (pos)</th>
                  <th className="px-4 py-3">Scorer AUC</th>
                  <th className="px-4 py-3">LR AUC</th>
                  <th className="px-4 py-3">1-signal AUC</th>
                  <th className="px-4 py-3">P@k</th>
                  <th className="px-4 py-3">Brier</th>
                  <th className="px-4 py-3">Log-loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ev.per_product.map((p) => (
                  <tr key={p.product} className="transition-colors hover:bg-mint-light/40" data-testid={`metrics-row-${p.product.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    <td className="px-6 py-3.5 font-medium text-navy sm:px-8">{p.product}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.model.n} ({p.model.positives})</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-mint-light px-2.5 py-1 font-mono text-xs font-bold text-lloyds">{p.model.auc}</span>
                      {p.model.auc_ci && (
                        <span className="mt-1 block font-mono text-[10px] text-slate-400" data-testid={`ci-${p.product.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                          95% CI [{p.model.auc_ci[0]}, {p.model.auc_ci[1]}]
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600" data-testid={`lr-auc-${p.product.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{p.learned.auc}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.single_signal.auc}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.model.precision_at_k}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.model.brier}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.model.log_loss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <CvTable cv={ev.cross_validation} />
      </Reveal>

      {/* tests */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Reveal>
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6" data-testid="carbon-tests-card">
            <h3 className="font-display font-bold text-navy">Carbon engine — known-answer tests</h3>
            <ul className="mt-4 space-y-3">
              {ev.carbon_tests.map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-xs" data-testid={`carbon-test-${i}`}>
                  <div>
                    <p className="font-medium text-slate-700">{t.name.split(" {")[0]}</p>
                    <p className="font-mono text-[10px] text-slate-400">expected {t.expected} · actual {t.actual}</p>
                  </div>
                  <Pass ok={t.passed} />
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6" data-testid="guardrail-tests-card">
            <h3 className="font-display font-bold text-navy">Guardrail tests (live DB)</h3>
            <ul className="mt-4 space-y-3">
              {ev.guardrail_tests.map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-xs" data-testid={`guardrail-test-${i}`}>
                  <div>
                    <p className="font-medium text-slate-700">{t.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{t.detail}</p>
                  </div>
                  <Pass ok={t.passed} />
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-display font-bold text-navy">Reproducibility</h3>
            <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-600">
              <li>seed = {ev.reproducibility.seed}</li>
              <li>customers_match = {String(ev.reproducibility.customers_match)}</li>
              <li>transactions_match = {String(ev.reproducibility.transactions_match)}</li>
              <li>amount_checksum_match = {String(ev.reproducibility.amount_checksum_match)}</li>
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6" data-testid="llm-checks-card">
            <h3 className="font-display font-bold text-navy">LLM layer checks</h3>
            <ul className="mt-4 space-y-3">
              {ev.llm_checks.map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-xs" data-testid={`llm-check-${i}`}>
                  <div>
                    <p className="font-medium text-slate-700">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.detail}</p>
                  </div>
                  <Pass ok={t.passed} />
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* limitations */}
      <Reveal>
        <div className="grain-navy rounded-3xl p-8 sm:p-10" data-testid="limitations-card">
          <h2 className="font-display text-xl font-bold text-white">Limitations, stated plainly</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 text-sm leading-relaxed text-slate-300 md:grid-cols-2">
            {ev.limitations.map((l, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[11px] text-slate-400">
            Label rule: {ev.reproducibility.label_rule} · Split rule: {ev.reproducibility.split_rule}
          </p>
          <p className="mt-2 font-mono text-[11px] text-slate-400">Uncertainty: {ev.ci_method}</p>
        </div>
      </Reveal>
    </div>
  );
}
