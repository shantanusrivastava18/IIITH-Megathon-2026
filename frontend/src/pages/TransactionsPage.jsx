import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ReceiptText, CopyCheck, CalendarRange, BadgeCheck } from "lucide-react";
import { api, logError } from "../lib/api";
import { Reveal } from "../components/Motion";
import { PageLoader } from "../components/PageLoader";

export default function TransactionsPage() {
  const [sum, setSum] = useState(null);

  useEffect(() => {
    api.get("/transactions/summary").then((r) => setSum(r.data)).catch(logError("TransactionsPage"));
  }, []);

  if (!sum) return <PageLoader testid="transactions-loading" label="Analysing transaction intelligence…" />;

  const cards = [
    { icon: ReceiptText, label: "Transactions processed", value: sum.total.toLocaleString("en-IN"), sub: "synthetic, 120 customers" },
    { icon: CopyCheck, label: "Duplicates flagged", value: sum.duplicates_flagged, sub: "excluded from features" },
    { icon: CalendarRange, label: "Months covered", value: sum.months_covered, sub: "trailing 12-month window" },
    { icon: BadgeCheck, label: "Categorisation coverage", value: "100%", sub: "8 mutually exclusive classes" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="transactions-page">
      <Reveal>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">Transaction intelligence</h1>
        <p className="mt-1 text-sm text-slate-500">Every transaction assigned to exactly one of eight sustainability categories, with data-quality checks.</p>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm" data-testid={`txn-kpi-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{c.label}</p>
              <c.icon className="h-4 w-4 text-lloyds" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold text-navy">{c.value}</p>
            <p className="mt-1 text-xs text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="category-totals-card">
            <h2 className="font-display text-lg font-bold text-navy">Spend by category</h2>
            <p className="mb-4 text-xs text-slate-500">Portfolio-wide, duplicates excluded</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sum.categories} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "#64748B" }} width={110} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="total" fill="#4F7A3A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="monthly-volume-card">
            <h2 className="font-display text-lg font-bold text-navy">Monthly transaction volume</h2>
            <p className="mb-4 text-xs text-slate-500">Trailing 12 months</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={sum.monthly_volume}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} width={70} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`} />
                <Line type="monotone" dataKey="total" stroke="#12301F" strokeWidth={2.5} dot={{ r: 3, fill: "#A6D63F" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
