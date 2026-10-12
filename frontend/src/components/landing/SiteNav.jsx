import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowUpRight, Menu, X, Info } from "lucide-react";
import { LogoMark } from "../Logo";

export const ANCHORS = [
  { id: "story", label: "Story" },
  { id: "opportunities", label: "Opportunities" },
  { id: "pipeline", label: "How it works" },
  { id: "compare", label: "Compare" },
];

export const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -90, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
};

export const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    if (pathname === "/") scrollToId(id);
    else navigate(`/#${id}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50" data-testid="main-navbar">
      <div className="flex items-center justify-center gap-2 bg-forest-deep px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-cream/80" data-testid="fictional-data-banner">
        <Info className="h-3 w-3 shrink-0 text-lime" />
        <span className="sm:hidden">Fictional data · not financial advice</span>
        <span className="hidden sm:inline">All customers and transactions on this site are fictional · prototype, not financial advice</span>
      </div>
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`relative mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full px-3 py-2 pl-4 transition-[background-color,box-shadow,border-color] duration-500 sm:mx-4 lg:mx-auto ${
          scrolled ? "glass-cream border border-forest/10 shadow-[0_12px_40px_-18px_rgba(11,31,20,0.45)]" : "border border-transparent"
        }`}
        aria-label="Primary"
      >
        <Link to="/" className="group/logo flex items-center gap-2.5" data-testid="nav-logo-link" aria-label="Green Finance Assistant home">
          <LogoMark className="h-8 w-8 transition-transform duration-500 group-hover/logo:-rotate-12" />
          <span className="whitespace-nowrap font-serif text-lg text-forest sm:text-xl">Green Finance <em className="hidden text-moss sm:inline">Assistant</em></span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {ANCHORS.map((a) => (
            <button key={a.id} onClick={() => go(a.id)} data-testid={`nav-anchor-${a.id}`} className="group relative rounded-full px-4 py-2 text-sm font-medium text-forest/75 transition-colors duration-200 hover:text-forest">
              {a.label}
              <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-forest transition-transform duration-300 group-hover:scale-x-100" />
            </button>
          ))}
          <Link to="/verify" data-testid="nav-verify-link" className="rounded-full px-4 py-2 text-sm font-medium text-forest/75 transition-colors hover:text-forest">Verify</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/console" data-testid="nav-launch-console-btn" className="group flex items-center gap-1.5 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-[background-color,transform,box-shadow] duration-300 hover:bg-forest-soft hover:shadow-[0_10px_28px_-8px_rgba(18,48,31,0.6)] active:scale-[0.97]">
            Console
            <ArrowUpRight className="h-4 w-4 text-lime transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="rounded-full p-2.5 text-forest md:hidden" aria-label="Toggle menu" data-testid="nav-mobile-toggle">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="glass-cream absolute left-0 right-0 top-full mt-2 flex flex-col rounded-3xl border border-forest/10 p-3 md:hidden" data-testid="nav-mobile-menu">
            {ANCHORS.map((a) => (
              <button key={a.id} onClick={() => go(a.id)} className="rounded-2xl px-4 py-3 text-left text-sm font-medium text-forest hover:bg-forest/5">{a.label}</button>
            ))}
            <Link to="/verify" className="rounded-2xl px-4 py-3 text-sm font-medium text-forest hover:bg-forest/5">Verify</Link>
          </div>
        )}
        <motion.span className="absolute inset-x-6 -bottom-px h-[2px] origin-left rounded-full bg-lime" style={{ scaleX: progress }} data-testid="landing-scroll-progress" />
      </motion.nav>
    </header>
  );
};
