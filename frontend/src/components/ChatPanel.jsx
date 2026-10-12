import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { api, streamChat, logError } from "../lib/api";

const CHIPS = [
  "What's my monthly footprint?",
  "Why was EV finance suggested?",
  "How much CO₂ would solar save me?",
  "Where do I spend the most?",
];

export const ChatPanel = ({ customerId, firstName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    api.delete(`/companion/chat/${customerId}`).catch(logError("ChatPanel"));
  }, [customerId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    setMessages((ms) => [...ms, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    try {
      await streamChat(customerId, msg, (d) => {
        setMessages((ms) => {
          const copy = [...ms];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + d };
          return copy;
        });
      });
    } catch (e) {
      setMessages((ms) => {
        const copy = [...ms];
        copy[copy.length - 1] = { role: "assistant", content: "Chat is unavailable right now — the opportunity cards above still carry the full evidence." };
        return copy;
      });
    }
    setBusy(false);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm" data-testid="companion-chat">
      <div className="grain-navy flex items-center gap-3 px-6 py-5 sm:px-8">
        <MessageCircle className="h-5 w-5 text-mint" />
        <div>
          <h2 className="font-display text-lg font-bold text-white">Ask the Assistant</h2>
          <p className="text-xs text-slate-400">Answers grounded only in {firstName}'s structured data — never invented numbers.</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-96 space-y-4 overflow-y-auto px-6 py-6 sm:px-8" data-testid="chat-messages">
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400" data-testid="chat-empty">
            No questions yet — try one of the suggestions below.
          </p>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            data-testid={`chat-message-${i}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-navy text-white"
                : "border border-mint-border bg-mint-light/60 text-slate-700"
            }`}>
              {m.content.replaceAll("**", "")}
              {busy && i === messages.length - 1 && m.role === "assistant" && (
                <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-mint align-middle" />
              )}
              {busy && i === messages.length - 1 && m.role === "assistant" && !m.content && (
                <span className="inline-flex gap-1" data-testid="chat-typing">
                  {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-lloyds" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-slate-100 px-6 py-4 sm:px-8">
        <div className="mb-3 flex flex-wrap gap-2">
          {CHIPS.map((c, i) => (
            <button
              key={c}
              onClick={() => send(c)}
              disabled={busy}
              data-testid={`chat-chip-${i}`}
              className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-mint-light hover:text-lloyds active:scale-95 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Ask about ${firstName}'s footprint, spending or opportunities…`}
            maxLength={500}
            data-testid="chat-input"
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-mint"
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            data-testid="chat-send-btn"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-lloyds text-white transition-all duration-200 hover:bg-mint hover:text-navy active:scale-95 disabled:opacity-40"
            aria-label="Send message"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
