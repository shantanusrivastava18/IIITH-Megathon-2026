const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");

export const CvTable = ({ cv }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" data-testid="cv-table">
    <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
      <h2 className="font-display text-lg font-bold text-navy">{cv.folds}-fold cross-validation · all {cv.customers} customers</h2>
      <p className="text-xs text-slate-500">
        Out-of-fold AUC · logistic regression refit on {cv.folds - 1} folds each time · scorer weights fixed · {cv.fold_rule}
      </p>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {cv.per_product.map((p) => (
            <tr key={p.product} className="transition-colors hover:bg-mint-light/40" data-testid={`cv-row-${slug(p.product)}`}>
              <td className="px-6 py-3.5 font-medium text-navy sm:px-8">{p.product}</td>
              <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.n} ({p.positives})</td>
              <td className="px-4 py-3.5"><span className="rounded-full bg-mint-light px-2.5 py-1 font-mono text-xs font-bold text-lloyds">{p.model_auc}</span></td>
              <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.learned_auc}</td>
              <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.single_auc}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-100 bg-slate-50/60 font-mono text-xs" data-testid="cv-macro-row">
            <td className="px-6 py-3.5 font-semibold text-navy sm:px-8">Macro (mean ± sd over folds)</td>
            <td className="px-4 py-3.5" />
            <td className="px-4 py-3.5 font-bold text-lloyds">{cv.macro_auc.model.mean} ± {cv.macro_auc.model.std}</td>
            <td className="px-4 py-3.5 text-slate-600">{cv.macro_auc.learned.mean} ± {cv.macro_auc.learned.std}</td>
            <td className="px-4 py-3.5 text-slate-600">{cv.macro_auc.single_signal.mean} ± {cv.macro_auc.single_signal.std}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);
