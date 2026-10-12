import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { buildScene, drawScene, seg } from "../../lib/cityScene";

const STAGES = [
  { k: "01", t: "Today", d: "Petrol commutes, a coal-heavy grid and paper statements. The city runs on smoke." , m: "baseline" },
  { k: "02", t: "EV Finance", d: "Cars switch to electric. A 18,500 km/yr petrol driver avoids an estimated 725 kg CO₂e a year.", m: "−725 kg / yr" },
  { k: "03", t: "Rooftop Solar", d: "3 kW panels on owned homes offset grid power at 0.82 kg CO₂e per kWh — about 2,952 kg a year.", m: "−2,952 kg / yr" },
  { k: "04", t: "Paperless + Retrofit", d: "Statements go digital, homes get efficient, the skyline breathes. Every figure stays auditable.", m: "−78.7 t / yr portfolio" },
];
const START_KG = 6200;
const END_KG = 1450;

export const ScrollStory = () => {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const progressRef = useRef(0);
  const frameRef = useRef(0);
  const counterRef = useRef(null);
  const barRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  const render = () => {
    frameRef.current = 0;
    const c = canvasRef.current;
    const s = sceneRef.current;
    if (!c || !s) return;
    const ctx = c.getContext("2d");
    const dpr = c.width / s.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, s, progressRef.current);
  };
  const schedule = () => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    let alive = true;
    const c = canvasRef.current;
    const setup = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const box = c.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(box.width * dpr);
      c.height = Math.round(box.height * dpr);
      sceneRef.current = buildScene(box.width, box.height, dpr);
      if (!alive) return;
      render();
      setReady(true);
    };
    setup();
    let t;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(setup, 150);
    });
    ro.observe(c.parentElement);
    return () => {
      alive = false;
      ro.disconnect();
      clearTimeout(t);
      cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    progressRef.current = p;
    schedule();
    const kg = START_KG - (START_KG - END_KG) * seg(p, 0.05, 0.92);
    if (counterRef.current) counterRef.current.textContent = Math.round(kg).toLocaleString("en-IN");
    if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
    const next = Math.min(3, Math.floor(p * 4));
    setStage((s) => (s === next ? s : next));
  });

  return (
    <section id="story" ref={sectionRef} className="relative h-[400vh] bg-forest-deep" data-testid="scroll-story">
      <div className="sticky top-0 h-screen overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-testid="scroll-story-canvas" aria-label="Illustration: a smoggy city turning green as green-finance products are adopted" role="img" />

        <div className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-forest-deep transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`} data-testid="scroll-story-loader">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-cream/70">
            <span className="h-2 w-2 animate-ping rounded-full bg-lime" /> Preparing scene
          </div>
        </div>

        <div className="absolute inset-x-0 top-28 z-10 mx-auto flex max-w-7xl items-start justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="glass-dark max-w-md rounded-3xl p-6 sm:p-7" data-testid="scroll-story-caption">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-lime">Chapter {STAGES[stage].k} / 04</p>
            <h3 key={stage} className="animate-caption mt-2 font-serif text-3xl leading-tight text-cream sm:text-4xl">{STAGES[stage].t}</h3>
            <p key={`d${stage}`} className="animate-caption mt-3 text-sm leading-relaxed text-cream/75">{STAGES[stage].d}</p>
            <span className="mt-4 inline-block rounded-full bg-lime/15 px-3 py-1 font-mono text-[11px] font-semibold text-lime">{STAGES[stage].m}</span>
          </div>
          <div className="glass-dark hidden rounded-3xl p-6 text-right sm:block" data-testid="scroll-story-counter">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/60">Illustrative household CO₂e</p>
            <p className="mt-1 font-mono text-4xl font-bold text-cream"><span ref={counterRef}>{START_KG.toLocaleString("en-IN")}</span><span className="ml-1 text-base text-lime">kg/yr</span></p>
          </div>
        </div>

        <div className="glass-dark absolute bottom-[24vh] right-6 z-10 hidden items-end sm:flex gap-3 rounded-2xl p-4 sm:right-10">
          <div className="flex flex-col gap-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
            {STAGES.map((s, i) => (
              <span key={s.k} className={`transition-colors duration-500 ${i === stage ? "text-lime" : "text-cream/40"}`}>{s.t}</span>
            ))}
          </div>
          <div className="h-28 w-[3px] overflow-hidden rounded-full bg-cream/15">
            <div ref={barRef} className="h-full w-full origin-top bg-lime" style={{ transform: "scaleY(0)" }} />
          </div>
        </div>
        <p className="absolute bottom-[24vh] left-6 z-10 hidden rounded-full bg-forest-deep/60 px-4 py-2 font-mono sm:block text-[10px] uppercase tracking-[0.2em] text-cream/50 sm:left-10">Scroll to transform · illustrative, synthetic figures</p>
      </div>
    </section>
  );
};
