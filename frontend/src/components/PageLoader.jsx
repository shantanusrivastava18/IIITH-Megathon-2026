export const PageLoader = ({ label, testid }) => (
  <div className="mx-auto max-w-7xl space-y-6 py-4" data-testid={testid} aria-busy="true">
    <div className="space-y-3">
      <div className="skeleton h-3 w-40 rounded-full" />
      <div className="skeleton h-8 w-80 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-32 rounded-2xl" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
    <div className="skeleton h-72 rounded-2xl" />
    <p className="text-center font-mono text-xs text-slate-400">{label}</p>
  </div>
);
