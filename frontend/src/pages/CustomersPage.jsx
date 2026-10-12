import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api, logError } from "../lib/api";
import { Reveal } from "../components/Motion";

const SEGMENTS = ["", "Urban Salaried", "Suburban Homeowner", "SME Owner", "Young Digital Native", "Retiree", "Rural Emerging"];

export default function CustomersPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/customers?search=${encodeURIComponent(search)}&segment=${encodeURIComponent(segment)}&page=${page}&page_size=12`)
        .then((r) => setData(r.data))
        .catch(logError("CustomersPage"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, segment, page]);

  const pages = Math.max(1, Math.ceil(data.total / 12));

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="customers-page">
      <Reveal>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">{data.total} synthetic customers · search, filter, drill down</p>
      </Reveal>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name…"
            data-testid="customer-search-input"
            className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-mint"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => { setSegment(e.target.value); setPage(1); }}
          data-testid="segment-filter-select"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-mint"
        >
          {SEGMENTS.map((s) => <option key={s} value={s}>{s || "All segments"}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="py-16 text-center font-mono text-sm text-slate-400" data-testid="customers-loading">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((c) => (
            <Link
              key={c.customer_id}
              to={`/console/customers/${c.customer_id}`}
              data-testid={`customer-card-${c.customer_id}`}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:border-mint/60 hover:shadow-[0_16px_40px_-14px_rgba(16,185,129,0.25)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-mint">
                    {c.name.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <div>
                    <p className="font-display font-bold text-navy">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.city} · {c.segment}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{c.customer_id}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(c.top_opportunities || []).map((o) => (
                  <span key={o.product} className="rounded-full bg-mint-light px-2.5 py-1 font-mono text-[10px] font-semibold text-lloyds">
                    {o.product} · {o.propensity.toFixed(2)}
                  </span>
                ))}
                {(!c.top_opportunities || c.top_opportunities.length === 0) && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-400">no strong signals</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span>{c.txn_count} transactions · {c.home_owner ? "Homeowner" : "Renter"}</span>
                <span className="font-semibold text-lloyds opacity-0 transition-opacity group-hover:opacity-100">Drill down →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          data-testid="customers-prev-page-btn"
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-navy transition-colors hover:border-mint disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <span className="font-mono text-xs text-slate-500" data-testid="customers-page-indicator">{page} / {pages}</span>
        <button
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page === pages}
          data-testid="customers-next-page-btn"
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-navy transition-colors hover:border-mint disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
