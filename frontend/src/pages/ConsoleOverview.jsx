import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Target, Leaf, IndianRupee, ArrowUpRight } from "lucide-react";
import { api, inrShort, logError } from "../lib/api";
import { Reveal, Stagger, StaggerItem } from "../components/Motion";
import { CountUp } from "../components/CountUp";
import { PageLoader } from "../components/PageLoader";

const COLORS = ["#4F7A3A", "#A6D63F", "#12301F", "#F59E0B", "#64748B", "#DCEFA8"];

const Kpi = ({ icon: Icon, label, value, sub, testid }) => (
  <div className="card-lift group h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]" data-testid={testid}>
    <div className="flex items-center justify-between">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-light transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"><Icon className="h-4 w-4 text-lloyds" /></span>
    </div>
    <p className="mt-3 font-mono text-3xl font-bold text-navy">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{sub}</p>
  </div>
);

export default function ConsoleOverview() {
  const [ov, setOv] = useState(null);
  const [top, setTop] = useState([]);

  useEffect(() => {
    api.get("/overview").then((r) => setOv(r.data)).catch(logError("ConsoleOverview"));
    api.get("/opportunities?min_propensity=0.6").then((r) => setTop(r.data.items.slice(0, 8))).catch(logError("ConsoleOverview"));
  }, []);

  if (!ov) return <PageLoader testid="console-loading" label="Loading portfolio…" />;

  return (
    <div className="mx-auto max-w-7xl space-y-8" data-testid="console-overview">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Lloyds Green Intelligence Console</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">Portfolio overview</h1>
        <p className="mt-1 text-sm text-slate-500">Synthetic Indian retail portfolio · data as of {ov.data_timestamp}</p>
      </Reveal>

      <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><Kpi icon={Users} label="Customers analysed" value={<CountUp value={ov.customers_analyzed} />} sub={`${ov.transactions_processed.toLocaleString("en-IN")} transactions processed`} testid="kpi-customers" /></StaggerItem>
        <StaggerItem><Kpi icon={Target} label="Opportunities" value={<CountUp value={ov.opportunities_detected} />} sub={`avg propensity ${ov.avg_propensity}`} testid="kpi-opportunities" /></StaggerItem>
        <StaggerItem><Kpi icon={Leaf} label="CO₂e potential" value={<><CountUp value={ov.co2e_tonnes_per_year} decimals={1} /> t</>} sub="estimated per year, deterministic engine" testid="kpi-co2e" /></StaggerItem>
        <StaggerItem><Kpi icon={IndianRupee} label="Product value" value={<CountUp value={ov.opportunity_value_inr} format={inrShort} />} sub="indicative, eligibility pending" testid="kpi-value" /></StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="propensity-chart-card">
            <h2 className="font-display text-lg font-bold text-navy">Propensity distribution</h2>
            <p className="mb-6 text-xs text-slate-500">Recommended opportunities by propensity band</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ov.propensity_distribution}>
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748B" }} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#F1F6DF" }} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#4F7A3A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="segments-chart-card">
            <h2 className="font-display text-lg font-bold text-navy">Customer segments</h2>
            <p className="mb-2 text-xs text-slate-500">Portfolio mix</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={ov.segments} dataKey="count" nameKey="segment" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {ov.segments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {ov.segments.map((s, i) => (
                <span key={s.segment} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {s.segment} ({s.count})
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="top-opportunities-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-display text-lg font-bold text-navy">Highest-propensity opportunities</h2>
              <p className="text-xs text-slate-500">propensity ≥ 0.60 · sorted by score</p>
            </div>
            <Link to="/console/opportunities" data-testid="view-all-opportunities-link" className="flex items-center gap-1 text-xs font-semibold text-lloyds hover:text-mint">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <th className="px-6 py-3 sm:px-8">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Propensity</th>
                <th className="hidden px-4 py-3 sm:table-cell">Est. impact</th>
                <th className="hidden px-6 py-3 lg:table-cell">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {top.map((o, i) => (
                <tr key={i} className="transition-colors hover:bg-mint-light/40" data-testid={`top-opp-row-${i}`}>
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-600 sm:px-8">
                    <Link to={`/console/customers/${o.customer_id}`} className="hover:text-lloyds">{o.customer_id}</Link>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-navy">{o.product}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-mint-light px-2.5 py-1 font-mono text-xs font-bold text-lloyds">{o.propensity.toFixed(2)}</span>
                  </td>
                  <td className="hidden px-4 py-3.5 font-mono text-xs text-slate-600 sm:table-cell">
                    {(o.impact || {}).kg_co2e_per_year ? `${o.impact.kg_co2e_per_year.toLocaleString("en-IN")} kg/yr` : "—"}
                  </td>
                  <td className="hidden max-w-xs truncate px-6 py-3.5 text-xs text-slate-500 lg:table-cell">
                    {(o.reason_codes || []).map((c) => c.code).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
