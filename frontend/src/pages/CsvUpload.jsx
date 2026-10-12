import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Upload, Download, RotateCw, Trash2, FileCheck2 } from "lucide-react";
import { api, API, kg, logError } from "../lib/api";
import { Reveal } from "../components/Motion";

export default function CsvUpload() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get("/upload/summary").then((r) => setSummary(r.data)).catch(logError("CsvUpload"));
  }, []);

  const upload = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const text = await file.text();
      const r = await fetch(`${API}/upload/csv`, { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
      const data = await r.json();
      if (data.error) setError(data.error);
      else setSummary(data);
    } catch (e) {
      setError("Upload failed — the backend may be restarting. Try again in a few seconds.");
    }
    setBusy(false);
  };

  const reset = async () => {
    await api.post("/upload/reset");
    setSummary({ active: false });
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8" data-testid="upload-page">
      <Reveal>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lloyds">Judge Lab</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Bring your own data. Run the whole engine on it.
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Upload a transactions CSV and the full pipeline — categorisation, feature derivation, propensity,
          eligibility, carbon impact — runs on your rows in a sandbox. The curated demo dataset is never touched.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="grain-navy h-full rounded-3xl p-6 sm:p-8" data-testid="upload-card">
            <h2 className="font-display text-lg font-bold text-white">Upload transactions CSV</h2>
            <p className="mt-1 text-xs text-slate-400">Max 2 MB / 5,000 rows · UTF-8</p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-mint">Required columns</p>
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-slate-300">
                customer_id, date, amount<br />
                <span className="text-slate-500">optional: customer_name, merchant_description, debit_credit</span><br />
                <span className="text-slate-500">dates: YYYY-MM-DD or DD-MM-YYYY</span>
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files[0] || null)}
              data-testid="csv-file-input"
              className="mt-5 w-full text-xs text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-mint file:px-4 file:py-2 file:text-xs file:font-bold file:text-navy hover:file:bg-white"
            />
            {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300" data-testid="upload-error">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={upload}
                disabled={!file || busy}
                data-testid="csv-upload-btn"
                className="flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-sm font-bold text-navy transition-all duration-300 hover:bg-white active:scale-[0.97] disabled:opacity-40"
              >
                {busy ? <RotateCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {busy ? "Processing…" : "Run pipeline on this CSV"}
              </button>
              <a
                href={`${API}/upload/template`}
                download
                data-testid="sample-csv-btn"
                className="flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:border-mint hover:text-mint"
              >
                <Download className="h-4 w-4" /> Sample CSV
              </a>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              No file? Download the sample (3 customers, 12 months) and re-upload it to see the full flow.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8" data-testid="upload-summary">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">Sandbox results</h2>
              {summary?.active && (
                <button
                  onClick={reset}
                  data-testid="reset-sandbox-btn"
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear sandbox
                </button>
              )}
            </div>
            {!summary?.active ? (
              <p className="py-14 text-center text-sm text-slate-400" data-testid="sandbox-empty">
                No uploaded dataset yet — results will appear here after you run the pipeline.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    [summary.customers, "customers derived"],
                    [summary.transactions, "rows ingested"],
                    [summary.rows_rejected, "rows rejected"],
                    [`${kg(summary.co2e_kg_per_year)}`, "CO₂e potential / yr"],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-2xl bg-slate-50 p-4" data-testid={`sandbox-kpi-${l.replace(/[^a-z]+/g, "-")}`}>
                      <p className="font-mono text-xl font-bold text-navy">{v}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{l}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <FileCheck2 className="h-3.5 w-3.5 text-lloyds" /> {summary.note}
                </p>
                <div className="mt-5">
                  <h3 className="font-display text-sm font-bold text-navy">Categorised spend (keyword rules)</h3>
                  <ResponsiveContainer width="100%" height={250} className="mt-2">
                    <BarChart data={summary.categories} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "#64748B" }} width={105} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`} />
                      <Bar dataKey="total" fill="#4F7A3A" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>

      {summary?.active && summary.opportunities?.length > 0 && (
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="sandbox-opportunities">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <h2 className="font-display text-lg font-bold text-navy">Opportunities detected in your data</h2>
              <p className="text-xs text-slate-500">
                {summary.opportunities_detected} recommendations · same model, same engine, same guardrails as the demo dataset
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    <th className="px-6 py-3 sm:px-8">Customer</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Propensity</th>
                    <th className="px-4 py-3">Est. impact</th>
                    <th className="hidden px-6 py-3 lg:table-cell">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {summary.opportunities.map((o, i) => (
                    <tr key={i} className="transition-colors hover:bg-mint-light/40" data-testid={`sandbox-opp-row-${i}`}>
                      <td className="px-6 py-3.5 sm:px-8">
                        <p className="font-medium text-navy">{o.customer_id}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{o.product}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-mint-light px-2.5 py-1 font-mono text-xs font-bold text-lloyds">{o.propensity.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {o.impact ? `−${kg(o.impact.kg_co2e_per_year)}/yr` : "—"}
                      </td>
                      <td className="hidden max-w-xs truncate px-6 py-3.5 text-xs text-slate-500 lg:table-cell">
                        {(o.reason_codes || []).map((c) => c.code).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
