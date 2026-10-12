import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Leaf, Zap, TrendingDown, ThumbsUp, ThumbsDown, History } from "lucide-react";
import { api, kg, logError } from "../lib/api";
import { ExplainButton } from "../components/ExplainButton";
import { ChatPanel } from "../components/ChatPanel";
import { Reveal } from "../components/Motion";

export default function Companion() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [opps, setOpps] = useState([]);
  const [memory, setMemory] = useState({ items: [] });
  const [memoryNote, setMemoryNote] = useState("");

  useEffect(() => {
    api.get("/customers?page_size=6").then((r) => {
      setCustomers(r.data.items);
      if (r.data.items[0]) setSelected(r.data.items[0].customer_id);
    }).catch(logError("Companion"));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/customers/${selected}`).then((r) => setCustomers((cs) => cs.map((c) => c.customer_id === selected ? { ...c, ...r.data } : c))).catch(logError("Companion"));
    api.get(`/customers/${selected}/opportunities`).then((r) => setOpps(r.data.items.filter((o) => o.recommended))).catch(logError("Companion"));
    api.get(`/memory/${selected}`).then((r) => setMemory(r.data)).catch(logError("Companion"));
  }, [selected]);

  const record = async (productId, event) => {
    try {
      await api.post("/memory/event", { customer_id: selected, product_id: productId, event });
      const [o, m] = await Promise.all([
        api.get(`/customers/${selected}/opportunities`),
        api.get(`/memory/${selected}`),
      ]);
      setOpps(o.data.items.filter((x) => x.recommended));
      setMemory(m.data);
      setMemoryNote(event === "interested" ? "Noted — you'll see more like this." : "Noted — we'll show this less prominently.");
      setTimeout(() => setMemoryNote(""), 4000);
    } catch (e) { console.error("[Companion] keep UI state", e); }
  };

  const cust = customers.find((c) => c.customer_id === selected);

  return (
    <div className="mx-auto max-w-7xl space-y-8" data-testid="companion-page">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Customer Green Companion</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Your money, your footprint, your next green move.
        </h1>
        <p className="mt-1 text-sm text-slate-500">Pick a synthetic customer to see what they would see.</p>
      </Reveal>

      <div className="flex gap-3 overflow-x-auto pb-2" data-testid="customer-selector">
        {customers.map((c) => (
          <button
            key={c.customer_id}
            onClick={() => setSelected(c.customer_id)}
            data-testid={`select-customer-${c.customer_id}`}
            className={`flex shrink-0 items-center gap-3 rounded-2xl border p-4 pr-6 text-left transition-all duration-300 ${
              selected === c.customer_id
                ? "border-mint bg-mint-light shadow-[0_10px_30px_-12px_rgba(16,185,129,0.4)]"
                : "border-slate-200 bg-white hover:border-mint/50"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-display text-xs font-bold text-mint">
              {c.name.split(" ").map((w) => w[0]).join("")}
            </span>
            <span>
              <span className={`block font-display text-sm font-bold ${selected === c.customer_id ? "text-navy" : "text-slate-700"}`}>{c.name}</span>
              <span className="block text-[11px] text-slate-500">{c.segment}</span>
            </span>
          </button>
        ))}
      </div>

      {cust && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { icon: Leaf, label: "Sustainability affinity", value: `${Math.round(cust.sustainability_preference * 100)}/100`, sub: "stated preference score" },
              { icon: Zap, label: "Digital activity", value: `${Math.round(cust.digital_ratio * 100)}%`, sub: `${cust.paper_statements_per_month} paper statements/mo` },
              { icon: TrendingDown, label: "This month's footprint", value: cust.monthly_emissions ? kg(cust.monthly_emissions[cust.monthly_emissions.length - 1].kg_co2e) : "—", sub: "estimated kg CO₂e" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm" data-testid={`scorecard-${s.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{s.label}</p>
                  <s.icon className="h-4 w-4 text-lloyds" />
                </div>
                <p className="mt-3 font-mono text-3xl font-bold text-navy">{s.value}</p>
                <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>

          {cust.monthly_emissions && (
            <Reveal>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="companion-emissions-chart">
                <h2 className="font-display text-lg font-bold text-navy">Your estimated footprint, month by month</h2>
                <ResponsiveContainer width="100%" height={200} className="mt-4">
                  <AreaChart data={cust.monthly_emissions}>
                    <defs>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A6D63F" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#A6D63F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B" }} width={40} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Area type="monotone" dataKey="kg_co2e" stroke="#4F7A3A" strokeWidth={2.5} fill="url(#compGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Reveal>
          )}

          <div>
            <h2 className="font-display text-xl font-bold text-navy" data-testid="companion-opps-heading">Picked for {cust.name.split(" ")[0]}</h2>
            {memoryNote && (
              <p className="mt-2 rounded-full bg-mint-light px-4 py-2 text-xs font-semibold text-lloyds" data-testid="memory-feedback-note">{memoryNote}</p>
            )}
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {opps.map((o) => (
                <div key={o.product_id} className={`rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 sm:p-7 ${
                  o.memory?.state === "suppressed" ? "border-slate-200 opacity-70" : "border-slate-200/80"
                } ${o.memory?.state === "boosted" ? "border-mint/60 ring-1 ring-mint/30" : ""}`} data-testid={`companion-opp-${o.product_id}`}>
                  {o.memory && o.memory.state !== "neutral" && (
                    <span
                      className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        o.memory.state === "boosted" ? "bg-mint-light text-lloyds" : "bg-slate-100 text-slate-500"
                      }`}
                      data-testid={`memory-badge-${o.product_id}`}
                    >
                      {o.memory.state === "boosted" ? "↑ moved up by your feedback" : "shown less — your feedback"}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-navy">{o.product}</h3>
                      <p className="text-xs text-slate-500">{o.tagline}</p>
                    </div>
                    {o.impact && o.impact.kg_co2e_per_year > 0 && (
                      <span className="rounded-full bg-mint-light px-3 py-1.5 font-mono text-xs font-bold text-lloyds">
                        −{kg(o.impact.kg_co2e_per_year)}/yr
                      </span>
                    )}
                  </div>
                  <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                    {o.reason_codes.map((c) => (
                      <li key={c.code} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                        {c.evidence}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <ExplainButton customerId={selected} productId={o.product_id} />
                    <span className="font-mono text-[10px] text-slate-400">propensity {o.propensity.toFixed(2)} · confidence {o.confidence.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <span className="mr-1 text-[11px] text-slate-400">Is this useful?</span>
                    <button
                      onClick={() => record(o.product_id, "interested")}
                      data-testid={`memory-interested-${o.product_id}`}
                      className="flex items-center gap-1.5 rounded-full bg-mint-light px-3.5 py-1.5 text-xs font-semibold text-lloyds transition-all duration-200 hover:bg-mint hover:text-navy active:scale-95"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Interested
                    </button>
                    <button
                      onClick={() => record(o.product_id, "not_interested")}
                      data-testid={`memory-not-interested-${o.product_id}`}
                      className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Not for me
                    </button>
                  </div>
                </div>
              ))}
              {opps.length === 0 && (
                <p className="text-sm text-slate-500" data-testid="companion-no-opps">No green opportunities crossed the threshold for this customer right now.</p>
              )}
            </div>
          </div>

          <Reveal>
            <ChatPanel customerId={selected} firstName={cust.name.split(" ")[0]} />
          </Reveal>

          <Reveal>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="memory-timeline">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-lloyds" />
                <h2 className="font-display text-lg font-bold text-navy">Your green memory</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Your feedback re-orders what you see first. It never changes propensity scores, eligibility or impact estimates.
              </p>
              {memory.items.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400" data-testid="memory-empty">No feedback yet — react to an opportunity above and it will appear here.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {memory.items.map((e, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3" data-testid={`memory-event-${i}`}>
                      <span className="text-sm text-slate-700">
                        You {e.event === "not_interested" ? "said " : ""}
                        <span className={`font-semibold ${e.event === "interested" ? "text-lloyds" : e.event === "not_interested" || e.event === "dismissed" ? "text-rose-500" : "text-slate-600"}`}>
                          {e.event === "interested" ? "interested" : e.event === "not_interested" ? "not for me" : e.event}
                        </span>
                        {" "}to <span className="font-medium text-navy">{e.product_id.replace(/_/g, " ")}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{e.ts.slice(0, 10)}{e.source === "seed" ? " · earlier" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}
