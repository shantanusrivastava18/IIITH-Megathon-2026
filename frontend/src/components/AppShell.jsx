import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { EASE } from "./Motion";
import { LayoutDashboard, Users, Target, ReceiptText, Leaf, Calculator, BookOpen, ArrowLeft, FlaskConical, ShieldCheck, Upload } from "lucide-react";
import { LogoWordmark } from "./Logo";
import { useEffect, useState } from "react";
import { api, logError } from "../lib/api";

const NAV = [
  { to: "/console", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/console/customers", label: "Customers", icon: Users },
  { to: "/console/opportunities", label: "Opportunities", icon: Target },
  { to: "/console/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/companion", label: "Customer Companion", icon: Leaf },
  { to: "/carbon", label: "Carbon Engine", icon: Calculator },
  { to: "/evaluation", label: "Evaluation", icon: FlaskConical },
  { to: "/verify", label: "Judge Verification", icon: ShieldCheck },
  { to: "/upload", label: "CSV Upload", icon: Upload },
  { to: "/methodology", label: "Methodology", icon: BookOpen },
];

export const AppShell = () => {
  const [ts, setTs] = useState("");
  const { pathname } = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  useEffect(() => {
    api.get("/health").then((r) => setTs(r.data.data_timestamp)).catch(logError("AppShell"));
  }, []);

  return (
    <div className="console-theme min-h-screen" data-testid="app-shell">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col grain-navy md:flex" data-testid="app-sidebar">
        <div className="border-b border-white/10 px-6 py-6">
          <LogoWordmark dark compact />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Console">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={`sidebar-${n.label.toLowerCase().replace(/\s+/g, "-")}-link`}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive ? "text-mint" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-mint/15 ring-1 ring-mint/20" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <n.icon className="relative h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="relative transition-transform duration-300 group-hover:translate-x-0.5">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-white/10 p-5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
            <Link to="/legal/terms" className="hover:text-mint" data-testid="sidebar-terms-link">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-mint" data-testid="sidebar-privacy-link">Privacy</Link>
            <Link to="/legal/ai" className="hover:text-mint" data-testid="sidebar-ai-link">AI disclosure</Link>
            <Link to="/credits" className="hover:text-mint" data-testid="sidebar-credits-link">Credits</Link>
          </div>
          <Link to="/" data-testid="sidebar-back-home-link" className="flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-mint">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to platform site
          </Link>
        </div>
      </aside>

      <div className="md:pl-64">
        <motion.div className="fixed left-0 right-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-lloyds to-mint md:left-64" style={{ scaleX: progress }} data-testid="scroll-progress" />
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 glass-cream px-4 py-3.5 sm:px-8" data-testid="app-topbar">
          <nav className="flex gap-4 overflow-x-auto md:hidden" aria-label="Mobile">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `whitespace-nowrap text-xs font-medium ${isActive ? "text-lloyds" : "text-slate-500"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <span className="hidden font-serif text-xl text-navy md:block">Green Intelligence <em className="text-lloyds">Console</em></span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-mint-border bg-mint-light px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-lloyds" data-testid="live-status-indicator">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint" />
              Engine live
            </span>
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-700 lg:block" data-testid="console-fictional-chip">Fictional data</span>
            {ts && <span className="hidden font-mono text-[11px] text-slate-400 sm:block">data as of {ts}</span>}
          </div>
        </header>
        <main className="px-4 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
