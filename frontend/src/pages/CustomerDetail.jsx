import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ArrowLeft, ShieldCheck, ShieldAlert, History } from "lucide-react";
import { api, kg, logError } from "../lib/api";
import { ExplainButton } from "../components/ExplainButton";
import { Reveal } from "../components/Motion";
import { PageLoader } from "../components/PageLoader";

export default function CustomerDetail() {
  const { id } = useParams();
  const [cust, setCust] = useState(null);
  const [opps, setOpps] = useState([]);
  const [memory, setMemory] = useState({ items: [], summary: [] });

  useEffect(() => {
    api.get(`/customers/${id}`).then((r) => setCust(r.data)).catch(logError("CustomerDetail"));
    api.get(`/customers/${id}/opportunities`).then((r) => setOpps(r.data.items)).catch(logError("CustomerDetail"));
    api.get(`/memory/${id}`).then((r) => setMemory(r.data)).catch(logError("CustomerDetail"));
  }, [id]);

  if (!cust) return <PageLoader testid="customer-loading" label="Loading customer 360…" />;
  if (cust.error) return <p className="py-20 text-center text-sm text-slate-500">Customer not found.</p>;

  const recommended = opps.filter((o) => o.recommended);
  const blocked = opps.filter((o) => !o.eligible);

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="customer-detail-page">
      <Link to="/console/customers" data-testid="back-to-customers-link" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-lloyds">
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <Reveal>
        <div className="grain-navy flex flex-col justify-between gap-6 rounded-3xl p-8 sm:flex-row sm:items-center" data-testid="customer-profile-card">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mint/15 font-display text-xl font-bold text-mint">
              {cust.name.split(" ").map((w) => w[0]).join("")}
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{cust.name}</h1>
              <p className="text-sm text-slate-400">{cust.customer_id} · {cust.age} · {cust.city} · {cust.segment}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cust.products_held.map((p) => (
                  <span key={p} className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] text-slate-300">{p}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center sm:text-right">
            <div>
              <p className="font-mono text-2xl font-bold text-mint">{cust.txn_count}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">transactions</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-mint">{Math.round(cust.digital_ratio * 100)}%</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">digital activity</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-mint">{cust.electricity_kwh_per_month}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">kWh / month</p>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="emissions-chart-card">
            <h2 className="font-display text-lg font-bold text-navy">Estimated monthly emissions</h2>
            <p className="mb-4 text-xs text-slate-500">kg CO₂e · CEA grid + IPCC fuel factors</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cust.monthly_emissions}>
                <defs>
                  <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A6D63F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#A6D63F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} width={40} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Area type="monotone" dataKey="kg_co2e" stroke="#4F7A3A" strokeWidth={2.5} fill="url(#mintGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="category-spend-card">
            <h2 className="font-display text-lg font-bold text-navy">Spend by sustainability category</h2>
            <p className="mb-4 text-xs text-slate-500">12-month totals · duplicates excluded · {cust.duplicates_flagged} flagged</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cust.category_spend} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "#64748B" }} width={105} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="total" fill="#12301F" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
      </div>

      <Reveal>
        <h2 className="font-display text-xl font-bold text-navy" data-testid="opportunities-heading">Detected opportunities</h2>
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {recommended.map((o) => (
            <div key={o.product_id} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-mint/60 sm:p-7" data-testid={`opp-card-${o.product_id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-navy">{o.product}</h3>
                  <p className="text-xs text-slate-500">{o.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-lloyds">{o.propensity.toFixed(2)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">propensity · conf {o.confidence.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {o.reason_codes.map((c) => (
                  <span key={c.code} title={c.evidence} className="cursor-help rounded-full bg-mint-light px-2.5 py-1 font-mono text-[10px] font-semibold text-lloyds">
                    {c.code}
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {o.reason_codes.map((c) => <li key={c.code}>· {c.evidence}</li>)}
              </ul>
              {o.impact && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="font-mono text-sm font-bold text-navy">−{kg(o.impact.kg_co2e_per_year)} CO₂e / yr <span className="font-normal text-slate-400">(estimated)</span></p>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-400">{o.impact.formula}</p>
                </div>
              )}
              <div className="mt-5">
                <ExplainButton customerId={id} productId={o.product_id} />
              </div>
              <p className="mt-3 font-mono text-[10px] text-slate-300">data as of {o.data_timestamp}</p>
            </div>
          ))}
          {recommended.length === 0 && (
            <p className="text-sm text-slate-500">No opportunities crossed the recommendation threshold for this customer.</p>
          )}
        </div>
        {blocked.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" data-testid="blocked-products-card">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <ShieldAlert className="h-4 w-4" /> Held back by eligibility rules (never recommended)
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-700">
              {blocked.map((b) => <li key={b.product_id}>· {b.product}: {b.eligibility_note}</li>)}
            </ul>
          </div>
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-lloyds" /> Propensity, confidence and impact are computed by the model and carbon engine — eligibility is a separate deterministic check.
        </p>
      </Reveal>

      {memory.items.length > 0 && (
        <Reveal>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="rm-memory-card">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-lloyds" />
              <h2 className="font-display text-lg font-bold text-navy">Customer memory</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              How this customer responded to past insights. Memory re-orders their recommendations only — scores, eligibility and impact are untouched.
            </p>
            <ul className="mt-4 space-y-2">
              {memory.items.map((e, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm" data-testid={`rm-memory-event-${i}`}>
                  <span className="text-slate-700">
                    <span className="font-medium text-navy">{e.product_id.replace(/_/g, " ")}</span>
                    {" — "}
                    <span className={e.event === "interested" ? "font-semibold text-lloyds" : e.event === "not_interested" || e.event === "dismissed" ? "font-semibold text-rose-500" : "text-slate-500"}>
                      {e.event}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{e.ts.slice(0, 10)} · {e.source}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}
    </div>
  );
}
