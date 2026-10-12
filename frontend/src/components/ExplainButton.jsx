import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { streamExplanation } from "../lib/api";

export const ExplainButton = ({ customerId, productId }) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setStarted(true);
    setText("");
    try {
      await streamExplanation(customerId, productId, (d) => setText((t) => t + d));
    } catch (e) {
      setText("Explanation service unavailable. The structured reason codes above remain fully valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        data-testid={`explain-btn-${productId}`}
        className="flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-lloyds hover:shadow-[0_8px_20px_-6px_rgba(0,138,75,0.5)] active:scale-[0.97] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-mint" />}
        {loading ? "Generating..." : started ? "Regenerate explanation" : "Explain with AI"}
      </button>
      {started && (
        <div
          className="mt-3 rounded-xl border border-mint-border bg-mint-light/60 p-4 text-sm leading-relaxed text-slate-700"
          data-testid={`explanation-output-${productId}`}
        >
          <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-lloyds">
            LLM explanation layer — narrates, never decides
          </span>
          {text}
          {loading && <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-mint align-middle" />}
        </div>
      )}
    </div>
  );
};
