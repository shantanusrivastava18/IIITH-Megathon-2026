export const LogoMark = ({ className = "h-9 w-9" }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#12301F" />
    <path d="M7 27c4.5-8.5 8.5-13 13-13s8.5 4.5 13 13" stroke="#A6D63F" strokeWidth="3" strokeLinecap="round" />
    <path d="M13.5 31c2.4-5.2 4.4-7.8 6.5-7.8s4.1 2.6 6.5 7.8" stroke="#4F7A3A" strokeWidth="3" strokeLinecap="round" />
    <circle cx="20" cy="10.5" r="2.4" fill="#A6D63F" />
  </svg>
);

export const LogoWordmark = ({ dark = false, compact = false }) => (
  <span className="group/logo flex items-center gap-2.5">
    <LogoMark className="h-9 w-9 shrink-0 transition-transform duration-500 group-hover/logo:rotate-[-8deg] group-hover/logo:scale-105" />
    <span className="leading-none">
      <span className={`block whitespace-nowrap font-display font-extrabold tracking-tight ${compact ? "text-[15px]" : "text-lg"} ${dark ? "text-white" : "text-navy"}`}>
        Green Finance<span className="text-mint"> Assistant</span>
      </span>
      <span className={`block text-[10px] font-mono uppercase tracking-[0.2em] mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
        Lloyds Banking Group
      </span>
    </span>
  </span>
);
