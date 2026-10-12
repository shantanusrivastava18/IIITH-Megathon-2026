import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inrShort, kg, logError } from "../lib/api";
import { Reveal } from "../components/Motion";

export default function OpportunitiesPage() {
  const [data, setData] = useState({ items: [], products: [] });
  const [product, setProduct] = useState("");
  const [minProp, setMinProp] = useState(0);

  useEffect(() => {
    api.get(`/opportunities?product_id=${product}&min_propensity=${minProp}`)
      .then((r) => setData(r.data)).catch(logError("OpportunitiesPage"));
  }, [product, minProp]);

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="opportunities-page">
      <Reveal>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">Opportunity detection</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.total} recommended opportunities · every one carries propensity, confidence, reason codes and an estimated impact
        </p>
      </Reveal>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setProduct("")}
            data-testid="filter-product-all-btn"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${!product ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            All products
          </button>
          {data.products.map((p) => (
            <button
              key={p.id}
              onClick={() => setProduct(p.id)}
              data-testid={`filter-product-${p.id}-btn`}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${product === p.id ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-xs font-medium text-slate-600 sm:ml-auto">
          Min propensity <span className="font-mono font-bold text-lloyds">{minProp.toFixed(2)}</span>
          <input
            type="range" min="0" max="0.9" step="0.05" value={minProp}
            onChange={(e) => setMinProp(parseFloat(e.target.value))}
            data-testid="min-propensity-slider"
            className="accent-emerald-600"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.items.map((o, i) => (
          <Reveal key={`${o.customer_id}-${o.product_id}`} delay={Math.min(i * 0.03, 0.3)}>
            <Link
              to={`/console/customers/${o.customer_id}`}
              data-testid={`opportunity-card-${i}`}
              className="group block h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-mint/60 hover:shadow-[0_16px_40px_-14px_rgba(16,185,129,0.25)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{o.customer_id} · {o.category}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy">{o.product}</h3>
                </div>
                <span className="rounded-full bg-mint-light px-3 py-1.5 font-mono text-sm font-bold text-lloyds">{o.propensity.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {o.reason_codes.map((c) => (
                  <span key={c.code} className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-600">{c.code}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                <span className="font-mono text-slate-600">{o.impact ? `−${kg(o.impact.kg_co2e_per_year)} CO₂e/yr` : "impact n/a"}</span>
                <span className="font-mono text-slate-600">{o.indicative_value_inr ? inrShort(o.indicative_value_inr) : "—"}</span>
                <span className="font-semibold text-lloyds opacity-0 transition-opacity group-hover:opacity-100">Drill down →</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      {data.items.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-500" data-testid="no-opportunities-msg">No opportunities match these filters.</p>
      )}
    </div>
  );
}
